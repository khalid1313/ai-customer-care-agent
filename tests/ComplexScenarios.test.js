const EnhancedAIAgent = require('../src/agents/EnhancedAIAgent');
const CustomerCareTools = require('../src/tools/CustomerCareTools');
const AdvancedCustomerCareTools = require('../src/tools/AdvancedCustomerCareTools');
const CombinedWorkflowTools = require('../src/tools/CombinedWorkflowTools');
const RAGEnhancedTool = require('../src/tools/RAGEnhancedTool');
const ToolEnforcementWrapper = require('../src/services/ToolEnforcementWrapper');
const EnhancedContextManager = require('../src/services/EnhancedContextManager');

describe('Complex Customer Care Scenarios', () => {
    let agent;
    let contextManager;
    let allTools;

    beforeAll(async () => {
        // Initialize all tools
        const basicTools = new CustomerCareTools();
        const advancedTools = new AdvancedCustomerCareTools();
        const combinedTools = new CombinedWorkflowTools();
        const ragTool = new RAGEnhancedTool();
        
        // Initialize RAG system
        await ragTool.initialize();
        
        // Combine all tools
        allTools = [
            ...basicTools.getAllTools(),
            ...advancedTools.getAllAdvancedTools(contextManager),
            ...combinedTools.getAllCombinedWorkflowTools(),
            ...ragTool.getAllRAGEnhancedTools()
        ];

        // Initialize context manager
        contextManager = new EnhancedContextManager();

        // Wrap tools with enforcement
        const toolWrapper = new ToolEnforcementWrapper(allTools, {
            strictMode: true,
            enforceToolUsage: true
        });

        // Initialize agent
        agent = new EnhancedAIAgent(toolWrapper.getWrappedTools(), {
            model: 'gpt-3.5-turbo',
            temperature: 0.1,
            maxTokens: 1000,
            maxIterations: 3,
            verbose: true
        });

        await agent.initialize();
    });

    describe('Scenario 1: Shopping Journey with Interruptions', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-001', 'Test Customer');
        });

        test('Complete shopping journey with order tracking interruptions', async () => {
            // Step 1: Start shopping
            const response1 = await agent.processMessage(
                "I'm looking for wireless headphones under $300",
                sessionId,
                'CUST-001'
            );
            expect(response1.response.toLowerCase()).toContain('headphones');
            expect(response1.toolsUsed.length).toBeGreaterThan(0);

            // Step 2: Interrupt with order tracking
            const response2 = await agent.processMessage(
                "Wait, can you track my order ORD-2024-001 first?",
                sessionId,
                'CUST-001'
            );
            expect(response2.response).toContain('ORD-2024-001');
            expect(response2.response).toContain('DELIVERED');

            // Step 3: Resume shopping - should remember headphones context
            const response3 = await agent.processMessage(
                "OK back to headphones - which one has the best rating?",
                sessionId,
                'CUST-001'
            );
            expect(response3.response.toLowerCase()).toMatch(/rating|4\./);

            // Step 4: Compare specific products
            const response4 = await agent.processMessage(
                "Compare the Sony and Apple options",
                sessionId,
                'CUST-001'
            );
            expect(response4.response).toContain('Sony');
            expect(response4.response).toContain('Apple');

            // Step 5: Another order interruption
            const response5 = await agent.processMessage(
                "Actually, what about order ORD-2024-002 status?",
                sessionId,
                'CUST-001'
            );
            expect(response5.response).toContain('ORD-2024-002');

            // Step 6: Back to shopping with specific choice
            const response6 = await agent.processMessage(
                "I'll take the Sony headphones, add them to cart",
                sessionId,
                'CUST-001'
            );
            expect(response6.response.toLowerCase()).toContain('cart');

            // Step 7: Check cart
            const response7 = await agent.processMessage(
                "Show me my cart",
                sessionId,
                'CUST-001'
            );
            expect(response7.response.toLowerCase()).toContain('cart');
        }, 30000);
    });

    describe('Scenario 2: Complex Customer Service Workflow', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-002', 'Support Customer');
        });

        test('Complex customer service workflow with context switching', async () => {
            // Step 1: General return inquiry
            const response1 = await agent.processMessage(
                "I want to return something I bought",
                sessionId,
                'CUST-002'
            );
            expect(response1.response).toContain('30 days');

            // Step 2: Ask about specific product availability first
            const response2 = await agent.processMessage(
                "But first, do you have Wireless Bluetooth Headphones in stock?",
                sessionId,
                'CUST-002'
            );
            expect(response2.response).toContain('Wireless Bluetooth Headphones');

            // Step 3: Back to return - specific order
            const response3 = await agent.processMessage(
                "OK, I want to return order ORD-2024-005",
                sessionId,
                'CUST-002'
            );
            expect(response3.response).toContain('ORD-2024-005');

            // Step 4: Ask about return shipping
            const response4 = await agent.processMessage(
                "How do I ship it back? What are the shipping costs?",
                sessionId,
                'CUST-002'
            );
            expect(response4.response.toLowerCase()).toContain('shipping');

            // Step 5: Payment method question (different context)
            const response5 = await agent.processMessage(
                "Also, what payment methods do you accept?",
                sessionId,
                'CUST-002'
            );
            expect(response5.response.toLowerCase()).toContain('credit cards');

            // Step 6: Return to original order context
            const response6 = await agent.processMessage(
                "When will I get my refund for that order?",
                sessionId,
                'CUST-002'
            );
            expect(response6.response.toLowerCase()).toMatch(/refund|ord-2024-005/i);
        }, 30000);
    });

    describe('Scenario 3: Multi-Product Comparison Workflow', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-003', 'Comparison Shopper');
        });

        test('Complex multi-product comparison across categories', async () => {
            // Step 1: Search wireless earbuds
            const response1 = await agent.processMessage(
                "Show me wireless earbuds",
                sessionId,
                'CUST-003'
            );
            expect(response1.response.toLowerCase()).toContain('earbuds');

            // Step 2: Also look at watches
            const response2 = await agent.processMessage(
                "Also show me smartwatches",
                sessionId,
                'CUST-003'
            );
            expect(response2.response.toLowerCase()).toContain('watch');

            // Step 3: Compare prices across categories
            const response3 = await agent.processMessage(
                "Which products did you show me?",
                sessionId,
                'CUST-003'
            );
            expect(response3.response).toMatch(/earbuds|watch/i);

            // Step 4: Specific price question
            const response4 = await agent.processMessage(
                "What's the price of the smartwatch?",
                sessionId,
                'CUST-003'
            );
            expect(response4.response).toMatch(/\$\d+/);

            // Step 5: Compare with earbuds
            const response5 = await agent.processMessage(
                "How does that compare to the earbuds price?",
                sessionId,
                'CUST-003'
            );
            expect(response5.response).toMatch(/\$/);

            // Step 6: Ask about features
            const response6 = await agent.processMessage(
                "Which one has better battery life?",
                sessionId,
                'CUST-003'
            );
            expect(response6.response.toLowerCase()).toContain('battery');
        }, 30000);
    });

    describe('Scenario 4: Out of Context Recovery', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-004', 'Context Test');
        });

        test('Handle out of context queries gracefully', async () => {
            // Step 1: Search for mice
            const response1 = await agent.processMessage(
                "Find me wireless mice",
                sessionId,
                'CUST-004'
            );
            expect(response1.response.toLowerCase()).toMatch(/mouse|mice/);

            // Step 2: Complete topic change - weather (out of scope)
            const response2 = await agent.processMessage(
                "What's the weather like today?",
                sessionId,
                'CUST-004'
            );
            expect(response2.response).toBeDefined();
            expect(typeof response2.response).toBe('string');

            // Step 3: Try to reference previous context after topic change
            const response3 = await agent.processMessage(
                "What was the price of that mouse?",
                sessionId,
                'CUST-004'
            );
            expect(response3.response).toBeDefined();
            expect(typeof response3.response).toBe('string');

            // Step 4: Clear context establishment
            const response4 = await agent.processMessage(
                "Show me the Gaming Mouse RGB details",
                sessionId,
                'CUST-004'
            );
            expect(response4.response).toContain('Gaming Mouse RGB');
        }, 30000);
    });

    describe('Scenario 5: Rapid Context Switching', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-005', 'Rapid Switcher');
        });

        test('Handle rapid context switches between different topics', async () => {
            // Rapid fire questions across different contexts
            const response1 = await agent.processMessage(
                "Wireless Bluetooth Headphones price?",
                sessionId,
                'CUST-005'
            );
            expect(response1.response).toMatch(/\$|price/i);

            const response2 = await agent.processMessage(
                "Order ORD-2024-003 status?",
                sessionId,
                'CUST-005'
            );
            expect(response2.response).toContain('ORD-2024-003');

            const response3 = await agent.processMessage(
                "Add Gaming Mouse RGB to cart",
                sessionId,
                'CUST-005'
            );
            expect(response3.response.toLowerCase()).toContain('cart');

            const response4 = await agent.processMessage(
                "Return policy?",
                sessionId,
                'CUST-005'
            );
            expect(response4.response).toContain('30 days');

            const response5 = await agent.processMessage(
                "Smartwatch Pro stock?",
                sessionId,
                'CUST-005'
            );
            expect(response5.response).toMatch(/stock|available/i);

            const response6 = await agent.processMessage(
                "ORD-2024-001 delivery date?",
                sessionId,
                'CUST-005'
            );
            expect(response6.response).toMatch(/deliver|ship/i);
        }, 40000);
    });

    describe('Scenario 6: Complex Cart Management', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-006', 'Cart Manager');
        });

        test('Complex cart management with interruptions', async () => {
            // Step 1: Add first item
            const response1 = await agent.processMessage(
                "Add Wireless Bluetooth Headphones to my cart",
                sessionId,
                'CUST-006'
            );
            expect(response1.response).toContain('cart');

            // Step 2: Check order status (interruption)
            const response2 = await agent.processMessage(
                "Before I continue, track order ORD-2024-002",
                sessionId,
                'CUST-006'
            );
            expect(response2.response).toContain('ORD-2024-002');

            // Step 3: Add another item
            const response3 = await agent.processMessage(
                "Also add Gaming Mouse RGB to cart",
                sessionId,
                'CUST-006'
            );
            expect(response3.response).toContain('cart');

            // Step 4: Ask about shipping for cart items
            const response4 = await agent.processMessage(
                "How much will shipping cost for my cart?",
                sessionId,
                'CUST-006'
            );
            expect(response4.response.toLowerCase()).toContain('shipping');

            // Step 5: Compare items in cart
            const response5 = await agent.processMessage(
                "Which item in my cart is better rated?",
                sessionId,
                'CUST-006'
            );
            expect(response5.response.toLowerCase()).toMatch(/rating|better/);

            // Step 6: Remove item and check availability of similar
            const response6 = await agent.processMessage(
                "Remove the mouse, is Mechanical Keyboard available instead?",
                sessionId,
                'CUST-006'
            );
            expect(response6.response).toContain('Mechanical Keyboard');
        }, 30000);
    });

    describe('Scenario 7: Technical Specification Deep Dive', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-007', 'Tech Specialist');
        });

        test('Detailed technical specification comparison', async () => {
            // Step 1: Initial comparison
            const response1 = await agent.processMessage(
                "Compare Wireless Bluetooth Headphones and Wireless Earbuds Pro technical specs",
                sessionId,
                'CUST-007'
            );
            expect(response1.response).toContain('Wireless Bluetooth Headphones');

            // Step 2: Specific feature focus
            const response2 = await agent.processMessage(
                "Which has better noise cancellation?",
                sessionId,
                'CUST-007'
            );
            expect(response2.response.toLowerCase()).toContain('noise');

            // Step 3: Different feature
            const response3 = await agent.processMessage(
                "What about battery life between them?",
                sessionId,
                'CUST-007'
            );
            expect(response3.response.toLowerCase()).toContain('battery');

            // Step 4: Add third product for comparison
            const response4 = await agent.processMessage(
                "How does the Portable Speaker compare to these two?",
                sessionId,
                'CUST-007'
            );
            expect(response4.response).toContain('Portable Speaker');

            // Step 5: Price performance analysis
            const response5 = await agent.processMessage(
                "Which offers the best value for money?",
                sessionId,
                'CUST-007'
            );
            expect(response5.response.toLowerCase()).toMatch(/value|price|best/);

            // Step 6: Availability and stock context
            const response6 = await agent.processMessage(
                "Which of these three are currently in stock?",
                sessionId,
                'CUST-007'
            );
            expect(response6.response.toLowerCase()).toMatch(/stock|available/);
        }, 30000);
    });

    describe('Scenario 8: Customer Journey with Issues', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-008', 'Problem Customer');
        });

        test('Handle customer journey with multiple issues', async () => {
            // Step 1: Search for non-existent product
            const response1 = await agent.processMessage(
                "Find me iPhone 15 accessories",
                sessionId,
                'CUST-008'
            );
            expect(response1.response).toBeDefined();

            // Step 2: Ask for alternatives
            const response2 = await agent.processMessage(
                "What phone accessories do you have?",
                sessionId,
                'CUST-008'
            );
            expect(response2.response).toBeDefined();

            // Step 3: Check problematic order
            const response3 = await agent.processMessage(
                "Why was my order ORD-2024-003 cancelled?",
                sessionId,
                'CUST-008'
            );
            expect(response3.response).toContain('ORD-2024-003');

            // Step 4: Refund inquiry
            const response4 = await agent.processMessage(
                "When will I get my refund?",
                sessionId,
                'CUST-008'
            );
            expect(response4.response.toLowerCase()).toContain('refund');

            // Step 5: New product search after issue
            const response5 = await agent.processMessage(
                "I'll try ordering something else - show me best sellers",
                sessionId,
                'CUST-008'
            );
            expect(response5.response).toBeDefined();

            // Step 6: Stock availability concern
            const response6 = await agent.processMessage(
                "Is the top item definitely in stock? I don't want another cancellation",
                sessionId,
                'CUST-008'
            );
            expect(response6.response.toLowerCase()).toMatch(/stock|available/);
        }, 30000);
    });

    describe('Scenario 9: Multi-User Simulation', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-009', 'Multi User');
        });

        test('Simulate multiple users with different contexts', async () => {
            // User 1 context
            const response1 = await agent.processMessage(
                "I'm John, track my order ORD-2024-001",
                sessionId,
                'CUST-009'
            );
            expect(response1.response).toContain('ORD-2024-001');

            // Context switch - different user
            const response2 = await agent.processMessage(
                "Actually I'm Jane, I need to check order ORD-2024-002",
                sessionId,
                'CUST-009'
            );
            expect(response2.response).toContain('ORD-2024-002');

            // Ambiguous reference - should use latest context
            const response3 = await agent.processMessage(
                "When will my order arrive?",
                sessionId,
                'CUST-009'
            );
            expect(response3.response).toBeDefined();

            // Explicit context switch back
            const response4 = await agent.processMessage(
                "Go back to ORD-2024-001 - what's the delivery address?",
                sessionId,
                'CUST-009'
            );
            expect(response4.response).toContain('ORD-2024-001');

            // Product search in mixed context
            const response5 = await agent.processMessage(
                "I want to buy the same item as in ORD-2024-001",
                sessionId,
                'CUST-009'
            );
            expect(response5.response).toBeDefined();
        }, 30000);
    });

    describe('Scenario 10: Comprehensive Shopping Session', () => {
        let sessionId;

        beforeEach(async () => {
            sessionId = await contextManager.createSession('CUST-010', 'Comprehensive Shopper');
        });

        test('Complete end-to-end shopping experience', async () => {
            // Step 1: Browse categories
            const response1 = await agent.processMessage(
                "What product categories do you have?",
                sessionId,
                'CUST-010'
            );
            expect(response1.response).toBeDefined();

            // Step 2: Search in multiple categories
            const response2 = await agent.processMessage(
                "Show me headphones and smartwatches",
                sessionId,
                'CUST-010'
            );
            expect(response2.response.toLowerCase()).toMatch(/headphones|watch/);

            // Step 3: Detailed comparison
            const response3 = await agent.processMessage(
                "Compare the highest rated items from each category",
                sessionId,
                'CUST-010'
            );
            expect(response3.response.toLowerCase()).toMatch(/rating|compare/);

            // Step 4: Check policies before purchase
            const response4 = await agent.processMessage(
                "What's your return policy and shipping times?",
                sessionId,
                'CUST-010'
            );
            expect(response4.response).toContain('30 days');

            // Step 5: Add multiple items to cart
            const response5 = await agent.processMessage(
                "Add the Wireless Bluetooth Headphones and Smartwatch Pro to my cart",
                sessionId,
                'CUST-010'
            );
            expect(response5.response.toLowerCase()).toContain('cart');

            // Step 6: Check existing order status during shopping
            const response6 = await agent.processMessage(
                "While I'm shopping, can you check if my previous order ORD-2024-004 was delivered?",
                sessionId,
                'CUST-010'
            );
            expect(response6.response).toContain('ORD-2024-004');

            // Step 7: Payment method inquiry
            const response7 = await agent.processMessage(
                "What payment methods do you accept for my cart?",
                sessionId,
                'CUST-010'
            );
            expect(response7.response.toLowerCase()).toMatch(/payment|credit/);

            // Step 8: Final cart review
            const response8 = await agent.processMessage(
                "Show me my current cart total and estimated delivery",
                sessionId,
                'CUST-010'
            );
            expect(response8.response.toLowerCase()).toMatch(/cart|total/);

            // Step 9: Last minute change
            const response9 = await agent.processMessage(
                "Actually, is there a cheaper alternative to the Smartwatch Pro?",
                sessionId,
                'CUST-010'
            );
            expect(response9.response.toLowerCase()).toMatch(/alternative|cheap/);

            // Step 10: Final decision
            const response10 = await agent.processMessage(
                "Keep the headphones, remove the watch, and show me my final cart",
                sessionId,
                'CUST-010'
            );
            expect(response10.response.toLowerCase()).toContain('cart');
        }, 45000);
    });

    afterEach(async () => {
        // Clean up session if needed
    });

    afterAll(async () => {
        // Clean up resources
    });
});

module.exports = {
    ComplexScenarios: describe
};