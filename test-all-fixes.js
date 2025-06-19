const CustomerCareTools = require('./src/tools/CustomerCareTools');
const EnhancedAIAgent = require('./src/agents/EnhancedAIAgent');
const cartManager = require('./src/services/CartManager');

async function testAllFixes() {
    console.log('🎯 === TESTING ALL FIXES ===\n');
    
    // Test session ID
    const sessionId = 'test-session-' + Date.now();
    
    // Initialize tools with sessionId
    const toolsProvider = new CustomerCareTools(sessionId);
    const tools = toolsProvider.getAllTools();
    
    // Initialize agent
    const aiAgent = new EnhancedAIAgent(tools, {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        verbose: false
    });
    
    await aiAgent.initialize(sessionId);
    
    console.log('✅ Agent initialized with session:', sessionId);
    console.log('✅ Tools loaded:', tools.length);
    
    // Test conversations that were problematic
    const testConversations = [
        // Test 1: Greeting
        { 
            message: 'Hello',
            expected: 'Should show greeting with available services'
        },
        
        // Test 2: Product search that was failing
        {
            message: 'Show me Sony WH-1000XM4 headphones',
            expected: 'Should find Sony WH-1000XM4 at $349'
        },
        
        // Test 3: Price question without context
        {
            message: "What's the price of those headphones?",
            expected: 'Should reference Sony WH-1000XM4 from previous message'
        },
        
        // Test 4: Cart addition with pronoun
        {
            message: 'Add them to my cart',
            expected: 'Should add Sony WH-1000XM4 to cart'
        },
        
        // Test 5: Another product search
        {
            message: 'Actually, show me Apple AirPods Pro too',
            expected: 'Should find Apple AirPods Pro at $249'
        },
        
        // Test 6: Comparison without tools
        {
            message: 'Compare their battery life',
            expected: 'Should use tools to compare Sony and Apple products'
        },
        
        // Test 7: Cart state check
        {
            message: "What's my cart total now?",
            expected: 'Should show cart with Sony headphones'
        },
        
        // Test 8: Fuzzy product search
        {
            message: 'Show me Jabra Elite 4 earbuds too',
            expected: 'Should find Jabra Elite 4'
        },
        
        // Test 9: Reference to "cheaper one"
        {
            message: 'Which is cheaper - the AirPods or Jabra?',
            expected: 'Should compare prices using tools'
        },
        
        // Test 10: Remove with partial name
        {
            message: 'Remove the Sony headphones from cart',
            expected: 'Should remove Sony WH-1000XM4 from cart'
        },
        
        // Test 11: Final cart check
        {
            message: "What's in my cart currently?",
            expected: 'Should show empty cart after removal'
        }
    ];
    
    console.log('\n📋 Running test conversations...\n');
    
    for (let i = 0; i < testConversations.length; i++) {
        const test = testConversations[i];
        console.log(`\n🧪 Test ${i + 1}: "${test.message}"`);
        console.log(`📍 Expected: ${test.expected}`);
        
        try {
            const result = await aiAgent.processMessage(test.message, sessionId, 'test-customer');
            
            console.log(`✅ Response: ${result.response.substring(0, 150)}${result.response.length > 150 ? '...' : ''}`);
            console.log(`🔧 Tools used: ${result.toolsUsed.length > 0 ? result.toolsUsed.join(', ') : 'None'}`);
            console.log(`⏱️  Time: ${result.processingTime}ms`);
            
            // Additional checks for specific tests
            if (i === 1) { // Sony search
                if (result.response.includes('349')) {
                    console.log('✅ PASS: Found correct price');
                } else {
                    console.log('❌ FAIL: Price not found');
                }
            }
            
            if (i === 3) { // Cart addition
                const cartSummary = cartManager.getCartSummary(sessionId);
                console.log(`🛒 Cart items: ${cartSummary.itemCount || 0}`);
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
    
    // Final cart state
    console.log('\n📊 Final System State:');
    const finalCart = cartManager.getCartSummary(sessionId);
    console.log(`- Cart items: ${finalCart.itemCount || 0}`);
    console.log(`- Cart total: $${finalCart.total || 0}`);
    console.log(`- Mentioned products: ${aiAgent.mentionedProducts.map(p => p.name).join(', ')}`);
    
    console.log('\n✅ All tests completed!');
}

testAllFixes().catch(console.error);