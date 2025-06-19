const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Available tools for agents
const AVAILABLE_TOOLS = [
    {
        name: 'ProductSearchTool',
        description: 'Search for products by name, category, or features',
        category: 'E-commerce'
    },
    {
        name: 'ProductAvailabilityTool',
        description: 'Check if a specific product is available and in stock',
        category: 'E-commerce'
    },
    {
        name: 'OrderTrackingTool',
        description: 'Track order status by order ID',
        category: 'Orders'
    },
    {
        name: 'FAQTool',
        description: 'Answer frequently asked questions about policies and procedures',
        category: 'Support'
    },
    {
        name: 'ShoppingCartTool',
        description: 'Manage shopping cart operations',
        category: 'E-commerce'
    },
    {
        name: 'ProductRecommendationTool',
        description: 'Get product recommendations based on categories or preferences',
        category: 'E-commerce'
    },
    {
        name: 'PaymentTool',
        description: 'Provide information about payment methods and checkout',
        category: 'Payments'
    },
    {
        name: 'ShippingTool',
        description: 'Provide shipping information, delivery times, and tracking',
        category: 'Shipping'
    },
    {
        name: 'ReturnTool',
        description: 'Handle return policies, return requests, and refund information',
        category: 'Support'
    },
    {
        name: 'CustomerSupportTool',
        description: 'Provide customer support contact information and escalation',
        category: 'Support'
    }
];

// Get all agents for business
router.get('/', async (req, res) => {
    try {
        const agents = await prisma.agent.findMany({
            where: { businessId: req.user.businessId },
            orderBy: { createdAt: 'desc' }
        });

        // Parse tools for each agent
        const agentsWithParsedTools = agents.map(agent => ({
            ...agent,
            tools: agent.tools ? JSON.parse(agent.tools) : []
        }));

        res.json({
            success: true,
            data: {
                agents: agentsWithParsedTools,
                availableTools: AVAILABLE_TOOLS
            }
        });

    } catch (error) {
        logger.error('Get agents error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get agents'
        });
    }
});

// Get specific agent
router.get('/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;

        const agent = await prisma.agent.findFirst({
            where: {
                id: agentId,
                businessId: req.user.businessId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        res.json({
            success: true,
            data: {
                agent: {
                    ...agent,
                    tools: agent.tools ? JSON.parse(agent.tools) : [],
                    knowledge: agent.knowledge ? JSON.parse(agent.knowledge) : null
                },
                availableTools: AVAILABLE_TOOLS
            }
        });

    } catch (error) {
        logger.error('Get agent error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get agent'
        });
    }
});

// Create new agent
router.post('/', [
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('description').optional().isString().trim(),
    body('personality').optional().isString().trim(),
    body('instructions').optional().isString().trim(),
    body('model').optional().isIn(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    body('maxTokens').optional().isInt({ min: 1, max: 4000 }),
    body('tools').optional().isArray()
], authorize(['owner', 'admin']), async (req, res) => {
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
            personality,
            instructions,
            model = 'gpt-3.5-turbo',
            temperature = 0.1,
            maxTokens = 1000,
            tools = []
        } = req.body;

        // Validate tools
        const validTools = tools.filter(tool => 
            AVAILABLE_TOOLS.some(availableTool => availableTool.name === tool)
        );

        const agent = await prisma.agent.create({
            data: {
                businessId: req.user.businessId,
                name,
                description,
                personality,
                instructions,
                model,
                temperature,
                maxTokens,
                tools: JSON.stringify(validTools)
            }
        });

        logger.info('Agent created', {
            agentId: agent.id,
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            data: {
                agent: {
                    ...agent,
                    tools: validTools
                }
            },
            message: 'Agent created successfully'
        });

    } catch (error) {
        logger.error('Create agent error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create agent'
        });
    }
});

// Update agent
router.put('/:agentId', [
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim(),
    body('personality').optional().isString().trim(),
    body('instructions').optional().isString().trim(),
    body('model').optional().isIn(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo']),
    body('temperature').optional().isFloat({ min: 0, max: 2 }),
    body('maxTokens').optional().isInt({ min: 1, max: 4000 }),
    body('tools').optional().isArray(),
    body('isActive').optional().isBoolean()
], authorize(['owner', 'admin']), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { agentId } = req.params;
        const { tools, ...updateData } = req.body;

        // Check if agent exists and belongs to business
        const existingAgent = await prisma.agent.findFirst({
            where: {
                id: agentId,
                businessId: req.user.businessId
            }
        });

        if (!existingAgent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        // Validate tools if provided
        let validTools;
        if (tools) {
            validTools = tools.filter(tool => 
                AVAILABLE_TOOLS.some(availableTool => availableTool.name === tool)
            );
        }

        const agent = await prisma.agent.update({
            where: { id: agentId },
            data: {
                ...updateData,
                ...(validTools && { tools: JSON.stringify(validTools) }),
                updatedAt: new Date()
            }
        });

        logger.info('Agent updated', {
            agentId: agent.id,
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.json({
            success: true,
            data: {
                agent: {
                    ...agent,
                    tools: validTools || (agent.tools ? JSON.parse(agent.tools) : [])
                }
            },
            message: 'Agent updated successfully'
        });

    } catch (error) {
        logger.error('Update agent error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update agent'
        });
    }
});

// Delete agent
router.delete('/:agentId', authorize(['owner', 'admin']), async (req, res) => {
    try {
        const { agentId } = req.params;

        // Check if agent exists and belongs to business
        const agent = await prisma.agent.findFirst({
            where: {
                id: agentId,
                businessId: req.user.businessId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        // Check if agent is being used in active conversations
        const activeConversations = await prisma.conversation.count({
            where: {
                agentId: agentId,
                status: { in: ['ACTIVE', 'ESCALATED'] }
            }
        });

        if (activeConversations > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete agent. It has ${activeConversations} active conversations.`
            });
        }

        await prisma.agent.delete({
            where: { id: agentId }
        });

        logger.info('Agent deleted', {
            agentId: agentId,
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.json({
            success: true,
            message: 'Agent deleted successfully'
        });

    } catch (error) {
        logger.error('Delete agent error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete agent'
        });
    }
});

// Test agent with sample conversation
router.post('/:agentId/test', [
    body('message').isString().trim().isLength({ min: 1 }).withMessage('Message is required'),
    body('context').optional().isObject()
], async (req, res) => {
    try {
        const { agentId } = req.params;
        const { message, context = {} } = req.body;

        // Get agent
        const agent = await prisma.agent.findFirst({
            where: {
                id: agentId,
                businessId: req.user.businessId
            }
        });

        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }

        if (!agent.isActive) {
            return res.status(400).json({
                success: false,
                error: 'Agent is not active'
            });
        }

        // Initialize AI agent with this configuration
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

        // Override system prompt with agent's personality and instructions
        if (agent.personality || agent.instructions) {
            const customPrompt = `${agent.personality ? `Personality: ${agent.personality}\n` : ''}${agent.instructions ? `Instructions: ${agent.instructions}\n` : ''}`;
            aiAgent.systemPrompt = customPrompt + aiAgent.systemPrompt;
        }

        await aiAgent.initialize();

        // Process the test message
        const startTime = Date.now();
        const result = await aiAgent.processMessage(message, null, 'test-customer');
        const endTime = Date.now();

        res.json({
            success: true,
            data: {
                agent: {
                    id: agent.id,
                    name: agent.name,
                    model: agent.model
                },
                test: {
                    input: message,
                    output: result.response,
                    toolsUsed: result.toolsUsed || [],
                    processingTime: endTime - startTime,
                    context: context
                }
            }
        });

    } catch (error) {
        logger.error('Test agent error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test agent',
            details: error.message
        });
    }
});

// Get agent performance analytics
router.get('/:agentId/analytics', async (req, res) => {
    try {
        const { agentId } = req.params;
        const { timeRange = '7d' } = req.query;

        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        switch (timeRange) {
            case '24h':
                startDate.setHours(now.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        const [
            totalConversations,
            totalResponses,
            avgResponseTime,
            approvalRate,
            toolUsage
        ] = await Promise.all([
            // Total conversations handled by this agent
            prisma.conversation.count({
                where: {
                    agentId: agentId,
                    businessId: req.user.businessId,
                    createdAt: { gte: startDate }
                }
            }),

            // Total AI responses
            prisma.aIResponse.count({
                where: {
                    conversation: {
                        agentId: agentId,
                        businessId: req.user.businessId
                    },
                    createdAt: { gte: startDate }
                }
            }),

            // Average response time
            prisma.aIResponse.aggregate({
                where: {
                    conversation: {
                        agentId: agentId,
                        businessId: req.user.businessId
                    },
                    createdAt: { gte: startDate }
                },
                _avg: { processingTime: true }
            }),

            // Approval rate
            prisma.aIResponse.aggregate({
                where: {
                    conversation: {
                        agentId: agentId,
                        businessId: req.user.businessId
                    },
                    approved: { not: null },
                    createdAt: { gte: startDate }
                },
                _avg: { approved: true }
            }),

            // Tool usage statistics
            prisma.aIResponse.findMany({
                where: {
                    conversation: {
                        agentId: agentId,
                        businessId: req.user.businessId
                    },
                    createdAt: { gte: startDate }
                },
                select: { toolsUsed: true }
            })
        ]);

        // Process tool usage
        const toolStats = {};
        toolUsage.forEach(response => {
            if (response.toolsUsed) {
                const tools = response.toolsUsed.split(',');
                tools.forEach(tool => {
                    toolStats[tool] = (toolStats[tool] || 0) + 1;
                });
            }
        });

        res.json({
            success: true,
            data: {
                timeRange,
                metrics: {
                    totalConversations,
                    totalResponses,
                    avgResponseTime: Math.round(avgResponseTime._avg?.processingTime || 0),
                    approvalRate: Math.round((approvalRate._avg?.approved || 0) * 100),
                    toolUsage: toolStats
                }
            }
        });

    } catch (error) {
        logger.error('Agent analytics error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get agent analytics'
        });
    }
});

// Chat endpoint for playground testing
router.post('/chat', [
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
        logger.error('AI chat error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process message',
            details: error.message
        });
    }
});

module.exports = router;