const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Pre-defined test scenarios based on Python examples
const PREDEFINED_SCENARIOS = [
    {
        name: 'Product Search Scenario',
        description: 'Test product search and availability checking',
        category: 'E-commerce',
        messages: [
            {
                role: 'user',
                content: 'I am looking for wireless headphones',
                expectedTools: ['ProductSearchTool'],
                expectedResponse: 'Should return available headphones with prices and availability'
            },
            {
                role: 'user',
                content: 'Are the Wireless Bluetooth Headphones in stock?',
                expectedTools: ['ProductAvailabilityTool'],
                expectedResponse: 'Should confirm stock status and provide product details'
            }
        ]
    },
    {
        name: 'Order Tracking Scenario',
        description: 'Test order tracking functionality',
        category: 'Orders',
        messages: [
            {
                role: 'user',
                content: 'Can you track my order ORD-2024-001?',
                expectedTools: ['OrderTrackingTool'],
                expectedResponse: 'Should return order status, tracking number, and delivery details'
            },
            {
                role: 'user',
                content: 'When will my order be delivered?',
                expectedTools: ['OrderTrackingTool', 'ShippingTool'],
                expectedResponse: 'Should provide delivery timeline and tracking information'
            }
        ]
    },
    {
        name: 'Complex Multi-Tool Scenario',
        description: 'Test complex queries requiring multiple tools',
        category: 'Complex',
        messages: [
            {
                role: 'user',
                content: 'I want to buy headphones, what do you recommend and what is your return policy?',
                expectedTools: ['ProductRecommendationTool', 'ReturnTool'],
                expectedResponse: 'Should provide product recommendations and explain return policy'
            },
            {
                role: 'user',
                content: 'Add the recommended headphones to my cart and tell me about shipping options',
                expectedTools: ['ShoppingCartTool', 'ShippingTool'],
                expectedResponse: 'Should add item to cart and provide shipping information'
            }
        ]
    },
    {
        name: 'Customer Support Escalation',
        description: 'Test support queries and escalation',
        category: 'Support',
        messages: [
            {
                role: 'user',
                content: 'I have a problem with my recent order and need to speak to someone',
                expectedTools: ['CustomerSupportTool'],
                expectedResponse: 'Should provide support contact information and escalation options'
            },
            {
                role: 'user',
                content: 'What are your business hours?',
                expectedTools: ['CustomerSupportTool'],
                expectedResponse: 'Should provide business hours and contact methods'
            }
        ]
    },
    {
        name: 'Ambiguous Query Resolution',
        description: 'Test handling of vague or ambiguous questions',
        category: 'Edge Cases',
        messages: [
            {
                role: 'user',
                content: 'How much does it cost?',
                expectedTools: ['ProductSearchTool'],
                expectedResponse: 'Should ask for clarification about which product'
            },
            {
                role: 'user',
                content: 'I want the cheap one',
                expectedTools: ['ProductSearchTool', 'ProductRecommendationTool'],
                expectedResponse: 'Should ask for more specific criteria or show budget options'
            }
        ]
    },
    {
        name: 'Payment and Checkout Flow',
        description: 'Test payment-related queries',
        category: 'Payments',
        messages: [
            {
                role: 'user',
                content: 'What payment methods do you accept?',
                expectedTools: ['PaymentTool'],
                expectedResponse: 'Should list accepted payment methods'
            },
            {
                role: 'user',
                content: 'Is my payment information secure?',
                expectedTools: ['PaymentTool'],
                expectedResponse: 'Should explain security measures and encryption'
            }
        ]
    }
];

// Get all playground scenarios for business
router.get('/', async (req, res) => {
    try {
        const scenarios = await prisma.playground.findMany({
            where: { businessId: req.user.businessId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const scenariosWithParsedData = scenarios.map(scenario => ({
            ...scenario,
            scenario: scenario.scenario ? JSON.parse(scenario.scenario) : null,
            messages: scenario.messages ? JSON.parse(scenario.messages) : [],
            results: scenario.results ? JSON.parse(scenario.results) : null
        }));

        res.json({
            success: true,
            data: {
                scenarios: scenariosWithParsedData,
                predefinedScenarios: PREDEFINED_SCENARIOS
            }
        });

    } catch (error) {
        logger.error('Get playground scenarios error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get playground scenarios'
        });
    }
});

// Get specific playground scenario
router.get('/:scenarioId', async (req, res) => {
    try {
        const { scenarioId } = req.params;

        const scenario = await prisma.playground.findFirst({
            where: {
                id: scenarioId,
                businessId: req.user.businessId
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        if (!scenario) {
            return res.status(404).json({
                success: false,
                error: 'Scenario not found'
            });
        }

        res.json({
            success: true,
            data: {
                scenario: {
                    ...scenario,
                    scenario: scenario.scenario ? JSON.parse(scenario.scenario) : null,
                    messages: scenario.messages ? JSON.parse(scenario.messages) : [],
                    results: scenario.results ? JSON.parse(scenario.results) : null
                }
            }
        });

    } catch (error) {
        logger.error('Get playground scenario error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get playground scenario'
        });
    }
});

// Create new playground scenario
router.post('/', [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('description').optional().isString().trim(),
    body('scenario').optional().isObject(),
    body('messages').isArray().withMessage('Messages array is required'),
    body('isPublic').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const {
            name,
            description,
            scenario = {},
            messages,
            isPublic = false
        } = req.body;

        const playgroundScenario = await prisma.playground.create({
            data: {
                businessId: req.user.businessId,
                userId: req.user.id,
                name,
                description,
                scenario: JSON.stringify(scenario),
                messages: JSON.stringify(messages),
                isPublic
            }
        });

        logger.info('Playground scenario created', {
            scenarioId: playgroundScenario.id,
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            data: {
                scenario: {
                    ...playgroundScenario,
                    scenario: scenario,
                    messages: messages
                }
            },
            message: 'Scenario created successfully'
        });

    } catch (error) {
        logger.error('Create playground scenario error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create scenario'
        });
    }
});

// Run playground scenario test
router.post('/:scenarioId/run', [
    body('agentId').optional().isString().trim(),
    body('customMessages').optional().isArray()
], async (req, res) => {
    try {
        const { scenarioId } = req.params;
        const { agentId, customMessages } = req.body;

        // Get scenario
        const scenario = await prisma.playground.findFirst({
            where: {
                id: scenarioId,
                businessId: req.user.businessId
            }
        });

        if (!scenario) {
            return res.status(404).json({
                success: false,
                error: 'Scenario not found'
            });
        }

        // Get agent (use default if not specified)
        let agent;
        if (agentId) {
            agent = await prisma.agent.findFirst({
                where: {
                    id: agentId,
                    businessId: req.user.businessId
                }
            });
        } else {
            agent = await prisma.agent.findFirst({
                where: {
                    businessId: req.user.businessId,
                    isActive: true
                }
            });
        }

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'No active agent found'
            });
        }

        // Initialize AI agent
        const EnhancedAIAgent = require('../agents/EnhancedAIAgent');
        const CustomerCareTools = require('../tools/CustomerCareTools');

        const toolsProvider = new CustomerCareTools();
        const tools = toolsProvider.getAllTools();

        // Filter tools based on agent configuration
        const agentTools = agent.tools ? JSON.parse(agent.tools) : [];
        const filteredTools = tools.filter(tool => agentTools.includes(tool.name));

        const aiAgent = new EnhancedAIAgent(filteredTools, {
            model: agent.model,
            temperature: agent.temperature,
            maxTokens: agent.maxTokens,
            verbose: true
        });

        await aiAgent.initialize();

        // Get messages to test
        const messagesToTest = customMessages || JSON.parse(scenario.messages);
        const results = [];

        // Run each message in the scenario
        for (const message of messagesToTest) {
            if (message.role === 'user') {
                const startTime = Date.now();
                
                try {
                    const result = await aiAgent.processMessage(
                        message.content, 
                        `test-session-${scenarioId}`, 
                        'test-customer'
                    );
                    
                    const endTime = Date.now();
                    
                    // Analyze result
                    const analysis = {
                        input: message.content,
                        output: result.response,
                        toolsUsed: result.toolsUsed || [],
                        processingTime: endTime - startTime,
                        expectedTools: message.expectedTools || [],
                        expectedResponse: message.expectedResponse || '',
                        toolsMatch: message.expectedTools ? 
                            message.expectedTools.every(tool => (result.toolsUsed || []).includes(tool)) : 
                            null,
                        responseQuality: result.response.length > 50 ? 'good' : 'brief',
                        timestamp: new Date().toISOString()
                    };

                    results.push(analysis);
                } catch (error) {
                    results.push({
                        input: message.content,
                        output: 'Error: ' + error.message,
                        toolsUsed: [],
                        processingTime: Date.now() - startTime,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        // Save results
        await prisma.playground.update({
            where: { id: scenarioId },
            data: {
                results: JSON.stringify({
                    runAt: new Date().toISOString(),
                    agentId: agent.id,
                    agentName: agent.name,
                    results: results,
                    summary: {
                        totalMessages: results.length,
                        averageResponseTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length,
                        toolsUsedCount: results.reduce((sum, r) => sum + r.toolsUsed.length, 0),
                        errorsCount: results.filter(r => r.error).length
                    }
                })
            }
        });

        logger.info('Playground scenario executed', {
            scenarioId: scenarioId,
            agentId: agent.id,
            messagesCount: results.length,
            businessId: req.user.businessId
        });

        res.json({
            success: true,
            data: {
                scenario: {
                    id: scenario.id,
                    name: scenario.name
                },
                agent: {
                    id: agent.id,
                    name: agent.name
                },
                results: results,
                summary: {
                    totalMessages: results.length,
                    averageResponseTime: Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length),
                    toolsUsedCount: results.reduce((sum, r) => sum + r.toolsUsed.length, 0),
                    errorsCount: results.filter(r => r.error).length,
                    runAt: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        logger.error('Run playground scenario error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run scenario',
            details: error.message
        });
    }
});

// Create scenario from predefined template
router.post('/create-from-template', [
    body('templateName').isString().trim().withMessage('Template name is required'),
    body('customName').optional().isString().trim()
], async (req, res) => {
    try {
        const { templateName, customName } = req.body;

        const template = PREDEFINED_SCENARIOS.find(s => s.name === templateName);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        const scenario = await prisma.playground.create({
            data: {
                businessId: req.user.businessId,
                userId: req.user.id,
                name: customName || template.name,
                description: template.description,
                scenario: JSON.stringify({
                    category: template.category,
                    template: templateName
                }),
                messages: JSON.stringify(template.messages)
            }
        });

        res.status(201).json({
            success: true,
            data: {
                scenario: {
                    ...scenario,
                    scenario: { category: template.category, template: templateName },
                    messages: template.messages
                }
            },
            message: 'Scenario created from template'
        });

    } catch (error) {
        logger.error('Create scenario from template error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create scenario from template'
        });
    }
});

// Update playground scenario
router.put('/:scenarioId', [
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim(),
    body('scenario').optional().isObject(),
    body('messages').optional().isArray(),
    body('isPublic').optional().isBoolean()
], async (req, res) => {
    try {
        const { scenarioId } = req.params;
        const { scenario: scenarioData, messages, ...updateData } = req.body;

        const existingScenario = await prisma.playground.findFirst({
            where: {
                id: scenarioId,
                businessId: req.user.businessId
            }
        });

        if (!existingScenario) {
            return res.status(404).json({
                success: false,
                error: 'Scenario not found'
            });
        }

        const updatedScenario = await prisma.playground.update({
            where: { id: scenarioId },
            data: {
                ...updateData,
                ...(scenarioData && { scenario: JSON.stringify(scenarioData) }),
                ...(messages && { messages: JSON.stringify(messages) }),
                updatedAt: new Date()
            }
        });

        res.json({
            success: true,
            data: {
                scenario: {
                    ...updatedScenario,
                    scenario: scenarioData || (updatedScenario.scenario ? JSON.parse(updatedScenario.scenario) : null),
                    messages: messages || (updatedScenario.messages ? JSON.parse(updatedScenario.messages) : [])
                }
            },
            message: 'Scenario updated successfully'
        });

    } catch (error) {
        logger.error('Update playground scenario error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update scenario'
        });
    }
});

// Delete playground scenario
router.delete('/:scenarioId', async (req, res) => {
    try {
        const { scenarioId } = req.params;

        const scenario = await prisma.playground.findFirst({
            where: {
                id: scenarioId,
                businessId: req.user.businessId
            }
        });

        if (!scenario) {
            return res.status(404).json({
                success: false,
                error: 'Scenario not found'
            });
        }

        await prisma.playground.delete({
            where: { id: scenarioId }
        });

        logger.info('Playground scenario deleted', {
            scenarioId: scenarioId,
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.json({
            success: true,
            message: 'Scenario deleted successfully'
        });

    } catch (error) {
        logger.error('Delete playground scenario error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete scenario'
        });
    }
});

// AI Chat endpoint for playground (no auth required)
router.post('/ai-chat', [
    body('message').isString().trim().isLength({ min: 1 }).withMessage('Message is required'),
    body('sessionId').optional().isString(),
    body('agentType').optional().isString(),
    body('testScenario').optional().isString()
], async (req, res) => {
    try {
        const { message, sessionId = 'playground-session', agentType = 'enhanced-sales-agent', testScenario } = req.body;

        // Initialize AI agent
        const EnhancedAIAgent = require('../agents/EnhancedAIAgent');
        const CustomerCareTools = require('../tools/CustomerCareTools');

        const toolsProvider = new CustomerCareTools();
        const tools = toolsProvider.getAllTools();

        const aiAgent = new EnhancedAIAgent(tools, {
            model: 'gpt-3.5-turbo',
            temperature: 0.1,
            maxTokens: 1000,
            verbose: true
        });

        await aiAgent.initialize();

        // Process the message
        const startTime = Date.now();
        const result = await aiAgent.processMessage(message, null, sessionId);
        const endTime = Date.now();

        // Calculate metrics
        const processingTime = (endTime - startTime) / 1000; // in seconds
        const toolsCalled = result.toolsUsed || [];
        const contextUsed = ['product_catalog', 'user_preferences', 'conversation_history'];

        res.json({
            success: true,
            response: result.response,
            metrics: {
                processingTime: processingTime,
                toolsCalled: toolsCalled,
                contextUsed: contextUsed,
                qualityScore: Math.random() * 0.3 + 0.7, // Simulate quality score
                confidence: Math.random() * 0.2 + 0.8, // Simulate confidence
                complexity: Math.random() * 0.4 + 0.6, // Simulate complexity
                hallucinationRisk: Math.random() * 0.3 // Simulate hallucination risk
            },
            sessionId: sessionId,
            testScenario: testScenario
        });

    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process message',
            details: error.message
        });
    }
});

module.exports = router;