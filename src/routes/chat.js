const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const CoreAIAgent = require('../agents/CoreAIAgent');

const router = express.Router();
const prisma = new PrismaClient();

// Store logs in memory for testing
const sessionLogs = new Map(); // sessionId -> logs array

// Helper to capture logs for a session
function captureLogForSession(sessionId, logEntry) {
    if (!sessionLogs.has(sessionId)) {
        sessionLogs.set(sessionId, []);
    }
    const logs = sessionLogs.get(sessionId);
    logs.push(`${new Date().toISOString()} ${logEntry}`);
    
    // Keep only last 100 logs per session
    if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
    }
}

// Initialize AI Agents map - one per session
const agentsMap = new Map();

async function getOrCreateAgent(sessionId) {
    // Check if agent exists for this session
    if (agentsMap.has(sessionId)) {
        return agentsMap.get(sessionId);
    }
    
    try {
        // Create tools with sessionId
        const toolsProvider = new CustomerCareTools(sessionId);
        const tools = toolsProvider.getAllTools();
        
        // Create agent
        const aiAgent = new EnhancedAIAgent(tools, {
            model: 'gpt-3.5-turbo',
            temperature: 0.1,
            verbose: process.env.NODE_ENV === 'development'
        });
        
        await aiAgent.initialize(sessionId);
        
        // Store agent for this session
        agentsMap.set(sessionId, aiAgent);
        
        logger.info('AI Agent initialized successfully for session', { sessionId });
        return aiAgent;
    } catch (error) {
        logger.error('Failed to initialize AI Agent', error);
        throw error;
    }
}

// Validation middleware
const validateChatMessage = [
    body('message').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
    body('customerId').isString().trim().isLength({ min: 1 }).withMessage('Customer ID is required'),
    body('customerName').optional().isString().trim(),
    body('sessionId').optional().isString().trim(),
    body('channel').optional().isIn(['WEB_CHAT', 'WHATSAPP', 'INSTAGRAM', 'EMAIL', 'SMS']).withMessage('Invalid channel')
];

// Simple validation for test playground
const validateTestMessage = [
    body('message').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
    body('sessionId').optional().isString().trim()
];

// POST /api/chat - Process a chat message
router.post('/', validateChatMessage, async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { message, customerId, customerName, sessionId, channel = 'WEB_CHAT' } = req.body;
        
        // Create or get session
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            currentSessionId = await contextManager.createSession(customerId, customerName);
        }
        
        // Get or create agent for this session
        const aiAgent = await getOrCreateAgent(currentSessionId);

        // Detect topic switches and ambiguous queries
        const isTopicSwitch = await contextManager.detectTopicSwitch(currentSessionId, message);
        const isAmbiguous = await contextManager.detectAmbiguousQuery(currentSessionId, message);
        const isMultiPart = await contextManager.detectMultiPartQuery(message);

        // Process message with AI agent
        const startTime = Date.now();
        const result = await aiAgent.processMessage(message, currentSessionId, customerId);
        const endTime = Date.now();

        // Save message to database - Find or create conversation
        let conversation = await prisma.conversation.findFirst({
            where: { 
                customerId: customerId, 
                channel: channel,
                status: { in: ['ACTIVE', 'ESCALATED'] }
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    customerId: customerId,
                    customerName: customerName,
                    channel: channel,
                    status: 'ACTIVE',
                    priority: 'NORMAL',
                    lastMessageAt: new Date()
                }
            });
        } else {
            conversation = await prisma.conversation.update({
                where: { id: conversation.id },
                data: { 
                    lastMessageAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        // Save customer message
        const customerMessage = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: message,
                sender: 'CUSTOMER',
                senderName: customerName,
                channel: channel,
                messageType: 'TEXT'
            }
        });

        // Extract entities and intent (basic implementation)
        const entities = extractEntities(message);
        const intent = extractIntent(message);
        const sentiment = extractSentiment(message);

        // Save AI response
        const aiMessage = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: result.response,
                sender: 'AI_AGENT',
                senderName: 'AI Assistant',
                channel: channel,
                messageType: 'TEXT',
                sentiment: sentiment,
                intent: intent,
                entities: JSON.stringify(entities),
                confidence: 0.8, // Default confidence
                toolsUsed: result.toolsUsed ? result.toolsUsed.join(',') : '',
                processingTime: endTime - startTime
            }
        });

        // Save AI response details
        await prisma.aIResponse.create({
            data: {
                conversationId: conversation.id,
                messageId: aiMessage.id,
                prompt: message,
                response: result.response,
                model: 'gpt-3.5-turbo',
                toolsUsed: result.toolsUsed ? result.toolsUsed.join(',') : '',
                processingTime: endTime - startTime,
                confidence: 0.8
            }
        });

        // Add to conversation history
        await contextManager.addToConversationHistory(
            currentSessionId, 
            message, 
            result.response, 
            result.toolsUsed
        );

        // Check if escalation is needed
        const needsEscalation = await contextManager.shouldEscalate(currentSessionId);
        if (needsEscalation) {
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { 
                    status: 'ESCALATED',
                    priority: 'HIGH'
                }
            });
        }

        // Response
        res.json({
            success: true,
            data: {
                response: result.response,
                sessionId: currentSessionId,
                conversationId: conversation.id,
                messageId: aiMessage.id,
                processingTime: endTime - startTime,
                toolsUsed: result.toolsUsed ? result.toolsUsed.join(',') : '',
                metadata: {
                    isTopicSwitch,
                    isAmbiguous,
                    isMultiPart,
                    needsEscalation,
                    sentiment,
                    intent,
                    entities
                }
            }
        });

    } catch (error) {
        logger.error('Error processing chat message', {
            error: error.message,
            stack: error.stack,
            customerId: req.body.customerId,
            message: req.body.message
        });

        res.status(500).json({
            success: false,
            error: 'Failed to process message',
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : error.message
        });
    }
});

// GET /api/chat/conversation/:conversationId - Get conversation history
router.get('/conversation/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: parseInt(limit),
                    skip: parseInt(offset)
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({
                error: 'Conversation not found'
            });
        }

        res.json({
            success: true,
            data: {
                conversation,
                totalMessages: conversation.messages.length
            }
        });

    } catch (error) {
        logger.error('Error fetching conversation', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversation'
        });
    }
});

// POST /api/chat/feedback - Submit feedback on AI response
router.post('/feedback', [
    body('messageId').isString().trim().notEmpty(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('feedback').optional().isString().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { messageId, rating, feedback } = req.body;

        // Find the AI response record
        const aiResponse = await prisma.aIResponse.findFirst({
            where: { messageId: messageId }
        });

        if (!aiResponse) {
            return res.status(404).json({
                error: 'AI response not found'
            });
        }

        // Update with feedback
        await prisma.aIResponse.update({
            where: { id: aiResponse.id },
            data: {
                approved: rating >= 3,
                feedback: feedback
            }
        });

        res.json({
            success: true,
            message: 'Feedback submitted successfully'
        });

    } catch (error) {
        logger.error('Error submitting feedback', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit feedback'
        });
    }
});

// Helper functions
function extractEntities(message) {
    const entities = {};
    
    // Basic entity extraction (can be enhanced with NLP libraries)
    const priceMatch = message.match(/\$?(\d+(?:\.\d{2})?)/);
    if (priceMatch) {
        entities.price = parseFloat(priceMatch[1]);
    }
    
    const orderMatch = message.match(/order\s+(?:id\s+)?([a-zA-Z0-9-]+)/i);
    if (orderMatch) {
        entities.orderId = orderMatch[1];
    }
    
    return entities;
}

function extractIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('track') || lowerMessage.includes('order')) {
        return 'order_tracking';
    }
    if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
        return 'returns';
    }
    if (lowerMessage.includes('product') || lowerMessage.includes('buy')) {
        return 'product_inquiry';
    }
    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
        return 'support';
    }
    
    return 'general';
}

function extractSentiment(message) {
    const lowerMessage = message.toLowerCase();
    
    const negativeWords = ['angry', 'frustrated', 'terrible', 'awful', 'hate', 'worst'];
    const positiveWords = ['great', 'excellent', 'love', 'amazing', 'perfect', 'happy'];
    
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    
    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > negativeCount) return 'positive';
    return 'neutral';
}

// GET /api/chat/logs/:sessionId - Get logs for session
router.get('/logs/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const logs = sessionLogs.get(sessionId) || [];
        res.json({ logs });
    } catch (error) {
        logger.error('Failed to fetch logs', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// POST /api/chat/test - Simple test chat without full validation
router.post('/test', validateTestMessage, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { message, sessionId = `test_${Date.now()}` } = req.body;
        
        // Capture initial request log
        captureLogForSession(sessionId, `info: Test chat request { "method": "POST", "url": "/api/chat/test", "sessionId": "${sessionId}" }`);
        
        // Get or create agent for this session
        const aiAgent = await getOrCreateAgent(sessionId);
        captureLogForSession(sessionId, `info: AI Agent initialized { "sessionId": "${sessionId}", "model": "gpt-3.5-turbo" }`);

        // Process message with AI agent
        const startTime = Date.now();
        const result = await aiAgent.processMessage(message, sessionId, 'test-user');
        const endTime = Date.now();
        
        const processingTime = (endTime - startTime) / 1000;
        const toolsUsed = result.toolsUsed || [];
        
        // Capture processing logs
        if (toolsUsed.length > 0) {
            toolsUsed.forEach(tool => {
                captureLogForSession(sessionId, `info: Tool ${tool} called with input: ${message}`);
            });
        }
        
        captureLogForSession(sessionId, `info: Message processed { "toolsUsed": ${JSON.stringify(toolsUsed)}, "processingTime": ${Math.round(processingTime * 1000)}ms, "sessionId": "${sessionId}" }`);

        res.json({
            success: true,
            response: result.response,
            sessionId: sessionId,
            processingTime: processingTime,
            toolsUsed: toolsUsed
        });

    } catch (error) {
        logger.error('Error in test chat', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process test message',
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : error.message
        });
    }
});

module.exports = router;