const express = require('express');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const CoreAIAgent = require('../agents/CoreAIAgent');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Store agents per session
const agentsMap = new Map();

async function getOrCreateAgent(sessionId, businessId) {
    const key = `${sessionId}-${businessId}`;
    
    if (agentsMap.has(key)) {
        return agentsMap.get(key);
    }
    
    try {
        // Create core agent for the business
        const aiAgent = new CoreAIAgent(businessId);
        await aiAgent.initialize();
        
        // Store agent
        agentsMap.set(key, aiAgent);
        
        logger.info('Core AI Agent created', { sessionId, businessId });
        return aiAgent;
    } catch (error) {
        logger.error('Failed to create AI Agent', error);
        throw error;
    }
}

// Validation
const validateMessage = [
    body('message').isString().trim().custom((value, { req }) => {
        // Allow empty message if image is provided
        if (req.body.image && value.length === 0) {
            return true;
        }
        // Otherwise require message between 1-1000 characters
        if (value.length < 1 || value.length > 1000) {
            throw new Error('Message must be between 1 and 1000 characters when no image is provided');
        }
        return true;
    }),
    body('sessionId').isString().trim(),
    body('businessId').optional().isString(),
    body('source').optional().isString(),
    body('image').custom((value) => {
        // Allow null, undefined, or string values
        if (value === null || value === undefined || typeof value === 'string') {
            return true;
        }
        throw new Error('Image must be null, undefined, or a string');
    })
];

// POST /api/ai-chat - Process AI chat message
router.post('/', validateMessage, async (req, res) => {
    try {
        // Debug logging for validation issues
        console.log('🔍 AI Chat Request Body:', JSON.stringify(req.body, null, 2));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Validation errors:', errors.array());
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { message, sessionId, businessId, source, image } = req.body;
        
        // Get business ID from auth or request
        const actualBusinessId = businessId || req.user?.businessId || 'default';
        
        // Create or get conversation for this session
        let conversation = await prisma.conversation.findFirst({
            where: {
                businessId: actualBusinessId,
                customerId: sessionId, // Using sessionId as customerId for playground
                channel: source === 'playground' ? 'WEB_CHAT' : 'WEB_CHAT'
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    businessId: actualBusinessId,
                    customerId: sessionId,
                    customerName: source === 'playground' ? 'Playground User' : 'Web User',
                    channel: 'WEB_CHAT',
                    status: 'ACTIVE',
                    metadata: JSON.stringify({ source: source || 'web' })
                }
            });
        }

        // Save user message to database
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: message,
                sender: 'CUSTOMER',
                senderName: 'User',
                channel: 'WEB_CHAT',
                messageType: image ? 'IMAGE' : 'TEXT',
                attachments: image ? JSON.stringify([{ type: 'image', data: 'base64' }]) : null
            }
        });
        
        // Get or create agent for this session and business
        const aiAgent = await getOrCreateAgent(sessionId, actualBusinessId);
        
        // Process message
        const startTime = Date.now();
        const result = await aiAgent.chat(message, { image });
        const endTime = Date.now();
        
        // Save agent response to database
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: result.response,
                sender: 'AI_AGENT',
                senderName: 'AI Assistant',
                channel: 'WEB_CHAT',
                messageType: 'TEXT',
                toolsUsed: (result.toolsUsed || []).join(','),
                processingTime: endTime - startTime
            }
        });

        // Update conversation last activity
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { 
                lastMessageAt: new Date(),
                updatedAt: new Date()
            }
        });
        
        // Extract metrics for frontend
        const toolsUsed = result.toolsUsed || [];
        const processingTime = endTime - startTime;
        
        // Detect topic from message
        const topic = detectTopic(message);
        const previousTopic = aiAgent.lastTopic || 'start';
        aiAgent.lastTopic = topic;
        
        // Extract product mentions
        const productMentions = extractProductMentions(result.response);
        
        // Build response
        res.json({
            response: result.response,
            metrics: {
                processingTime: processingTime,
                toolsCalled: toolsUsed.length,
                contextUsed: 3, // Fixed for now
                toolsDetails: toolsUsed,
                topicSwitch: `${previousTopic}→${topic}`,
                productMentions: productMentions,
                timestamp: new Date().toISOString()
            },
            sessionId: sessionId,
            success: true
        });
        
    } catch (error) {
        logger.error('AI chat error', error);
        res.status(500).json({
            error: 'Failed to process message',
            details: error.message
        });
    }
});

// GET /api/ai-chat/history/:sessionId - Get conversation history
router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { businessId } = req.query;
        
        const actualBusinessId = businessId || 'default';
        
        // Find conversation
        const conversation = await prisma.conversation.findFirst({
            where: {
                businessId: actualBusinessId,
                customerId: sessionId
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        
        if (!conversation) {
            return res.json({ messages: [] });
        }
        
        // Format messages for frontend
        const messages = conversation.messages.map(msg => ({
            role: msg.sender === 'CUSTOMER' ? 'user' : 'agent',
            message: msg.content,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            image: msg.messageType === 'IMAGE' ? '🖼️ Image' : null
        }));
        
        res.json({ messages });
        
    } catch (error) {
        logger.error('Failed to get conversation history', error);
        res.status(500).json({
            error: 'Failed to get conversation history',
            details: error.message
        });
    }
});

// Helper functions
function detectTopic(message) {
    const lower = message.toLowerCase();
    
    if (lower.includes('order') || lower.includes('track') || lower.includes('ord')) return 'order';
    if (lower.includes('product') || lower.includes('search') || lower.includes('find') || 
        lower.includes('show') || lower.includes('headphone') || lower.includes('airpod') || 
        lower.includes('sony') || lower.includes('apple') || lower.includes('jabra') || 
        lower.includes('samsung') || lower.includes('price') || lower.includes('compare')) return 'product';
    if (lower.includes('return') || lower.includes('refund')) return 'return';
    if (lower.includes('payment') || lower.includes('pay') || lower.includes('checkout')) return 'payment';
    if (lower.includes('shipping') || lower.includes('delivery')) return 'shipping';
    if (lower.includes('cart') || lower.includes('add') || lower.includes('remove')) return 'cart';
    if (lower.includes('policy') || lower.includes('help') || lower.includes('support')) return 'support';
    if (lower.match(/^(hi|hello|hey|good morning|good afternoon|good evening)$/i)) return 'greeting';
    
    return 'general';
}

function extractProductMentions(response) {
    const products = [];
    
    // Look for product patterns
    const productPatterns = [
        /\b(Sony WH-1000XM4|Apple AirPods Pro|Jabra Elite 4|Samsung Galaxy Buds|Bose QuietComfort 45)\b/gi,
        /\b(headphones?|earbuds?|mouse|charger|watch)\b/gi
    ];
    
    productPatterns.forEach(pattern => {
        const matches = response.match(pattern);
        if (matches) {
            matches.forEach(match => {
                if (!products.includes(match)) {
                    products.push(match);
                }
            });
        }
    });
    
    return products.slice(0, 3); // Return max 3 products
}

// Clean up old agents periodically
setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, agent] of agentsMap.entries()) {
        if (!agent.lastUsed || now - agent.lastUsed > maxAge) {
            agentsMap.delete(key);
            logger.info('Cleaned up old agent', { key });
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

// Export function to clear agents for a specific business
function clearAgentsForBusiness(businessId) {
    const keysToDelete = [];
    for (const [key, agent] of agentsMap.entries()) {
        if (key.includes(businessId)) {
            keysToDelete.push(key);
        }
    }
    
    keysToDelete.forEach(key => {
        agentsMap.delete(key);
        logger.info('Cleared cached agent for settings update:', { key });
    });
    
    return keysToDelete.length;
}

router.clearAgentsForBusiness = clearAgentsForBusiness;

module.exports = router;