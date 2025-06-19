const express = require('express');
const { body, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const InboxManager = require('../services/InboxManager');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const inboxManager = new InboxManager();
const prisma = new PrismaClient();

// GET /api/inbox - Get inbox conversations with filtering
router.get('/', [
    query('status').optional().isIn(['ACTIVE', 'RESOLVED', 'ESCALATED', 'CLOSED', 'ARCHIVED']),
    query('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
    query('channel').optional().isIn(['WEB_CHAT', 'WHATSAPP', 'INSTAGRAM', 'EMAIL', 'SMS', 'LIVE_STREAM']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('unreadOnly').optional().isBoolean(),
    query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'lastMessageAt', 'priority']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
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

        const options = {
            status: req.query.status,
            priority: req.query.priority,
            channel: req.query.channel,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
            searchTerm: req.query.search,
            unreadOnly: req.query.unreadOnly === 'true',
            assignedTo: req.query.assignedTo,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            sortBy: req.query.sortBy || 'lastMessageAt',
            sortOrder: req.query.sortOrder || 'desc'
        };

        const result = await inboxManager.getConversations(options);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Error fetching inbox conversations', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversations'
        });
    }
});

// GET /api/inbox/conversations/:businessId - Get conversations for a specific business
router.get('/conversations/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        
        // Fetch conversations from database
        const conversations = await prisma.conversation.findMany({
            where: {
                businessId: businessId
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1 // Only get the last message for preview
                }
            },
            orderBy: {
                lastMessageAt: 'desc'
            },
            take: 50
        });

        // Format conversations with last message and unread count
        const formattedConversations = await Promise.all(conversations.map(async (conv) => {
            const lastMessage = conv.messages[0];
            
            // Count unread customer messages
            const unreadCount = await prisma.message.count({
                where: {
                    conversationId: conv.id,
                    sender: 'CUSTOMER',
                    isRead: false
                }
            });

            // Get the most recent human agent who handled this conversation
            let handledBy = null;
            if (!conv.isAiHandling) {
                const lastAgentMessage = await prisma.message.findFirst({
                    where: {
                        conversationId: conv.id,
                        sender: 'HUMAN_AGENT'
                    },
                    orderBy: { createdAt: 'desc' }
                });
                handledBy = lastAgentMessage?.senderName || null;
            }

            return {
                id: conv.id,
                customerName: conv.customerName,
                customerId: conv.customerId,
                channel: conv.channel,
                status: conv.status,
                lastMessage: lastMessage ? lastMessage.content : null,
                lastMessageAt: conv.lastMessageAt,
                unreadCount: Math.min(unreadCount, 5), // Cap at 5 for UI
                isAiHandling: conv.isAiHandling !== false, // Include AI handling status
                handledBy: handledBy, // Agent name who last handled this conversation
                metadata: conv.metadata,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt
            };
        }));

        res.json({
            success: true,
            conversations: formattedConversations
        });

    } catch (error) {
        logger.error('Error fetching conversations for business', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversations'
        });
    }
});

// GET /api/inbox/conversation/:conversationId/messages - Get messages for a specific conversation
router.get('/conversation/:conversationId/messages', async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        // Fetch messages from database
        const messages = await prisma.message.findMany({
            where: {
                conversationId: conversationId
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Format messages for frontend
        const formattedMessages = messages.map(msg => ({
            id: msg.id,
            role: msg.sender === 'CUSTOMER' ? 'user' : 'agent',
            message: msg.content,
            timestamp: new Date(msg.createdAt).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            sender: msg.sender,
            senderName: msg.senderName,
            messageType: msg.messageType,
            channelData: msg.channelData, // Include channelData for product parsing
            toolsUsed: msg.toolsUsed,
            createdAt: msg.createdAt
        }));

        res.json({
            success: true,
            messages: formattedMessages
        });

    } catch (error) {
        logger.error('Error fetching conversation messages', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch messages'
        });
    }
});

// GET /api/inbox/stats - Get inbox statistics
router.get('/stats', [
    query('assignedTo').optional().isString(),
    query('channel').optional().isIn(['WEB_CHAT', 'WHATSAPP', 'INSTAGRAM', 'EMAIL', 'SMS', 'LIVE_STREAM']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
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

        const filters = {
            assignedTo: req.query.assignedTo,
            channel: req.query.channel,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        const stats = await inboxManager.getInboxStats(filters);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching inbox stats', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inbox statistics'
        });
    }
});

// GET /api/inbox/conversation/:conversationId - Get conversation details
router.get('/conversation/:conversationId', [
    query('limit').optional().isInt({ min: 1, max: 500 }),
    query('offset').optional().isInt({ min: 0 }),
    query('markAsRead').optional().isBoolean()
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

        const { conversationId } = req.params;
        const options = {
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0,
            markAsRead: req.query.markAsRead !== 'false'
        };

        const result = await inboxManager.getConversationDetails(conversationId, options);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Error fetching conversation details', error);
        
        if (error.message === 'Conversation not found') {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversation details'
        });
    }
});

// PUT /api/inbox/conversation/:conversationId/assign - Assign conversation
router.put('/conversation/:conversationId/assign', [
    body('assignedTo').isString().trim().notEmpty().withMessage('Assigned to is required'),
    body('assignedBy').optional().isString().trim()
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

        const { conversationId } = req.params;
        const { assignedTo, assignedBy } = req.body;

        const conversation = await inboxManager.assignConversation(conversationId, assignedTo, assignedBy);

        res.json({
            success: true,
            data: conversation,
            message: `Conversation assigned to ${assignedTo}`
        });

    } catch (error) {
        logger.error('Error assigning conversation', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign conversation'
        });
    }
});

// PUT /api/inbox/conversation/:conversationId/status - Update conversation status
router.put('/conversation/:conversationId/status', [
    body('status').isIn(['ACTIVE', 'RESOLVED', 'ESCALATED', 'CLOSED', 'ARCHIVED']).withMessage('Invalid status'),
    body('updatedBy').optional().isString().trim()
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

        const { conversationId } = req.params;
        const { status, updatedBy } = req.body;

        const conversation = await inboxManager.updateConversationStatus(conversationId, status, updatedBy);

        res.json({
            success: true,
            data: conversation,
            message: `Conversation status updated to ${status}`
        });

    } catch (error) {
        logger.error('Error updating conversation status', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update conversation status'
        });
    }
});

// PUT /api/inbox/conversation/:conversationId/priority - Update conversation priority
router.put('/conversation/:conversationId/priority', [
    body('priority').isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']).withMessage('Invalid priority'),
    body('updatedBy').optional().isString().trim()
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

        const { conversationId } = req.params;
        const { priority, updatedBy } = req.body;

        const conversation = await inboxManager.updateConversationPriority(conversationId, priority, updatedBy);

        res.json({
            success: true,
            data: conversation,
            message: `Conversation priority updated to ${priority}`
        });

    } catch (error) {
        logger.error('Error updating conversation priority', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update conversation priority'
        });
    }
});

// POST /api/inbox/conversation/:conversationId/tags - Add tags to conversation
router.post('/conversation/:conversationId/tags', [
    body('tags').isArray({ min: 1 }).withMessage('Tags must be a non-empty array'),
    body('tags.*').isString().trim().notEmpty().withMessage('Each tag must be a non-empty string')
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

        const { conversationId } = req.params;
        const { tags } = req.body;

        const conversation = await inboxManager.addConversationTags(conversationId, tags);

        res.json({
            success: true,
            data: conversation,
            message: `Tags added to conversation`
        });

    } catch (error) {
        logger.error('Error adding conversation tags', error);
        
        if (error.message === 'Conversation not found') {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to add conversation tags'
        });
    }
});

// PUT /api/inbox/conversation/:conversationId/read - Mark messages as read
router.put('/conversation/:conversationId/read', [
    body('senderType').optional().isIn(['CUSTOMER', 'AI_AGENT', 'HUMAN_AGENT', 'SYSTEM'])
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

        const { conversationId } = req.params;
        const { senderType } = req.body;

        const updatedCount = await inboxManager.markMessagesAsRead(conversationId, senderType);

        res.json({
            success: true,
            data: { updatedCount },
            message: `${updatedCount} messages marked as read`
        });

    } catch (error) {
        logger.error('Error marking messages as read', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark messages as read'
        });
    }
});

// GET /api/inbox/search - Search conversations
router.get('/search', [
    query('q').isString().trim().isLength({ min: 1 }).withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
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

        const searchTerm = req.query.q;
        const options = {
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };

        const conversations = await inboxManager.searchConversations(searchTerm, options);

        res.json({
            success: true,
            data: {
                conversations,
                searchTerm,
                count: conversations.length
            }
        });

    } catch (error) {
        logger.error('Error searching conversations', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search conversations'
        });
    }
});

// POST /api/inbox/conversation/:conversationId/note - Add a system note
router.post('/conversation/:conversationId/note', [
    body('content').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Note content is required and must be less than 1000 characters'),
    body('addedBy').optional().isString().trim()
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

        const { conversationId } = req.params;
        const { content, addedBy } = req.body;

        const noteContent = `Note${addedBy ? ` by ${addedBy}` : ''}: ${content}`;
        const message = await inboxManager.addSystemMessage(conversationId, noteContent);

        res.json({
            success: true,
            data: message,
            message: 'Note added successfully'
        });

    } catch (error) {
        logger.error('Error adding conversation note', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add conversation note'
        });
    }
});

// PUT /api/inbox/conversation/:conversationId/ai-handling - Update AI handling status
router.put('/conversation/:conversationId/ai-handling', [
    body('isAiHandling').isBoolean().withMessage('isAiHandling must be a boolean'),
    body('updatedBy').optional().isString().trim()
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

        const { conversationId } = req.params;
        const { isAiHandling, updatedBy } = req.body;

        // Update conversation AI handling status
        const conversation = await prisma.conversation.update({
            where: { id: conversationId },
            data: { 
                isAiHandling,
                updatedAt: new Date()
            }
        });

        logger.info('Conversation AI handling status updated', {
            conversationId,
            isAiHandling,
            updatedBy: updatedBy || 'unknown'
        });

        res.json({
            success: true,
            data: conversation,
            message: `Conversation ${isAiHandling ? 'handed to AI' : 'taken over by human'}`
        });

    } catch (error) {
        logger.error('Error updating conversation AI handling status', error);
        
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update conversation AI handling status'
        });
    }
});

// POST /api/inbox/conversation/:conversationId/send-message - Send message from human agent
router.post('/conversation/:conversationId/send-message', [
    body('content').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message content is required and must be less than 2000 characters'),
    body('sender').isIn(['HUMAN_AGENT', 'SYSTEM']).withMessage('Invalid sender type'),
    body('senderName').optional().isString().trim(),
    body('messageType').optional().isString().trim(),
    body('productData').optional().isObject()
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

        const { conversationId } = req.params;
        const { content, sender, senderName, messageType, productData } = req.body;

        logger.info('Sending human agent message', {
            conversationId,
            sender,
            senderName,
            contentLength: content.length,
            originalSenderName: req.body.senderName // Log what was actually sent
        });

        // Verify conversation exists
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Create message in database
        const message = await prisma.message.create({
            data: {
                conversationId: conversationId,
                content: content,
                sender: sender,
                senderName: senderName || 'Agent',
                channel: conversation.channel,
                messageType: messageType || 'TEXT',
                channelData: JSON.stringify({
                    human_agent: true,
                    sent_from_inbox: true,
                    product_data: productData || null
                })
            }
        });

        // Update conversation's last message time
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { 
                lastMessageAt: new Date()
            }
        });

        // Send message to customer via appropriate channel
        if (messageType === 'PRODUCT' && productData) {
            await sendProductToCustomer(conversation, content, productData);
        } else {
            await sendMessageToCustomer(conversation, content);
        }

        logger.info('Human agent message sent successfully', {
            conversationId,
            messageId: message.id,
            channel: conversation.channel
        });

        res.json({
            success: true,
            data: message,
            message: 'Message sent successfully'
        });

    } catch (error) {
        logger.error('Error sending human agent message', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
});

// Function to send message to customer via their channel
async function sendMessageToCustomer(conversation, messageContent) {
    try {
        const channelData = JSON.parse(conversation.channelData || '{}');
        
        if (conversation.channel === 'INSTAGRAM') {
            // Send via Instagram
            await sendInstagramMessage(conversation.customerId, messageContent);
        } else if (conversation.channel === 'WHATSAPP') {
            // Send via WhatsApp (implement when ready)
            logger.info('WhatsApp message sending not implemented yet');
        } else {
            logger.info('Channel not supported for outbound messages', { 
                channel: conversation.channel 
            });
        }
    } catch (error) {
        logger.error('Error sending message to customer', error);
        throw error;
    }
}

// Function to send product card to customer via their channel
async function sendProductToCustomer(conversation, messageContent, productData) {
    try {
        if (conversation.channel === 'INSTAGRAM') {
            // Send product card via Instagram
            await sendInstagramProductCard(conversation.customerId, messageContent, productData);
        } else if (conversation.channel === 'WHATSAPP') {
            // Send via WhatsApp (implement when ready)
            logger.info('WhatsApp product sending not implemented yet');
        } else {
            logger.info('Channel not supported for product messages', { 
                channel: conversation.channel 
            });
        }
    } catch (error) {
        logger.error('Error sending product to customer', error);
        throw error;
    }
}

// Instagram message sending function (reuse from webhook)
async function sendInstagramMessage(recipientId, messageText) {
    try {
        logger.info('📤 Sending Instagram message from human agent', { 
            recipientId, 
            text: messageText.substring(0, 50) + '...' 
        });
        
        // Auto-discover Instagram Business Account ID
        const igAccountId = await getInstagramBusinessAccountId();
        if (!igAccountId) {
            logger.error('❌ Failed to get Instagram Business Account ID');
            return;
        }

        // Use v19.0 API
        const url = `https://graph.instagram.com/v19.0/${igAccountId}/messages?access_token=${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN}`;
        
        const payload = {
            recipient: { id: recipientId },
            message: { text: messageText }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            logger.info('✅ Instagram message sent successfully from human agent', { 
                messageId: result.message_id,
                recipientId 
            });
        } else {
            const errorText = await response.text();
            logger.error('❌ Failed to send Instagram message from human agent', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText,
                recipientId
            });
        }
    } catch (error) {
        logger.error('❌ Error sending Instagram message from human agent', error);
    }
}

// Auto-discover Instagram Business Account ID function (reuse from webhook)
async function getInstagramBusinessAccountId() {
    try {
        const accessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
        const response = await fetch(`https://graph.instagram.com/me?access_token=${accessToken}&fields=id,username,account_type`);
        
        if (response.ok) {
            const data = await response.json();
            return data.id;
        } else {
            const errorText = await response.text();
            logger.error('Failed to get Instagram Business Account ID', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText
            });
            return null;
        }
    } catch (error) {
        logger.error('Error getting Instagram Business Account ID', error);
        return null;
    }
}

// Instagram product card sending function
async function sendInstagramProductCard(recipientId, messageText, productData) {
    try {
        logger.info('📦 Sending Instagram product card', { 
            recipientId, 
            productTitle: productData.title,
            productImage: productData.image
        });
        
        // Auto-discover Instagram Business Account ID
        const igAccountId = await getInstagramBusinessAccountId();
        if (!igAccountId) {
            logger.error('❌ Failed to get Instagram Business Account ID');
            return;
        }

        // Use v19.0 API for sending image with caption
        const url = `https://graph.instagram.com/v19.0/${igAccountId}/messages?access_token=${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN}`;
        
        // Send image with caption - this is the most reliable approach for Instagram
        const imagePayload = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: "image",
                    payload: {
                        url: productData.image,
                        is_reusable: true
                    }
                }
            }
        };

        // Send the product image first
        let response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(imagePayload)
        });

        if (response.ok) {
            const result = await response.json();
            logger.info('✅ Product image sent successfully', { 
                messageId: result.message_id,
                recipientId 
            });

            // Wait a moment, then send the product details as text
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const textPayload = {
                recipient: { id: recipientId },
                message: { text: messageText }
            };

            const textResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(textPayload)
            });

            if (textResponse.ok) {
                const textResult = await textResponse.json();
                logger.info('✅ Instagram product card sent successfully (image + text)', { 
                    imageMessageId: result.message_id,
                    textMessageId: textResult.message_id,
                    recipientId,
                    productTitle: productData.title 
                });
            } else {
                const errorText = await textResponse.text();
                logger.error('❌ Failed to send product text message', { 
                    status: textResponse.status,
                    error: errorText
                });
            }
        } else {
            const errorText = await response.text();
            logger.error('❌ Failed to send Instagram product image', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText,
                recipientId
            });
        }

    } catch (error) {
        logger.error('❌ Error sending Instagram product card', error);
    }
}

// GET /api/inbox/conversation/:conversationId/tickets - Get tickets linked to conversation/customer
router.get('/conversation/:conversationId/tickets', async (req, res) => {
    try {
        const { conversationId } = req.params;

        logger.info('Fetching tickets for conversation', { conversationId });

        // Get conversation details to find customer
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Find tickets linked to this conversation or customer
        const tickets = await prisma.ticket.findMany({
            where: {
                OR: [
                    { parentConversationId: conversationId },
                    { 
                        AND: [
                            { customerId: conversation.customerId },
                            { businessId: conversation.businessId }
                        ]
                    }
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: {
                assignedUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        // Format tickets for frontend
        const formattedTickets = tickets.map(ticket => {
            const slaDeadline = ticket.slaDeadline ? new Date(ticket.slaDeadline) : null;
            const now = new Date();
            let slaStatus = 'on_time';
            let timeRemaining = null;

            if (slaDeadline) {
                const timeDiff = slaDeadline.getTime() - now.getTime();
                const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
                
                if (timeDiff < 0) {
                    slaStatus = 'overdue';
                    timeRemaining = `${Math.abs(hoursRemaining)}h overdue`;
                } else if (hoursRemaining < 2) {
                    slaStatus = 'urgent';
                    timeRemaining = `${hoursRemaining}h remaining`;
                } else if (hoursRemaining < 24) {
                    slaStatus = 'soon';
                    timeRemaining = `${hoursRemaining}h remaining`;
                } else {
                    const daysRemaining = Math.floor(hoursRemaining / 24);
                    timeRemaining = `${daysRemaining}d remaining`;
                }
            }

            return {
                id: ticket.id,
                ticketNumber: ticket.ticketNumber,
                title: ticket.title,
                description: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                assignedTo: ticket.assignedUser ? 
                    `${ticket.assignedUser.firstName} ${ticket.assignedUser.lastName}` : 
                    null,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                slaDeadline: ticket.slaDeadline,
                slaStatus,
                timeRemaining,
                followUpCount: ticket.followUpCount,
                escalationLevel: ticket.escalationLevel,
                source: ticket.source,
                linkedToConversation: ticket.parentConversationId === conversationId
            };
        });

        logger.info('Tickets fetched successfully', {
            conversationId,
            customerId: conversation.customerId,
            ticketCount: formattedTickets.length
        });

        res.json({
            success: true,
            data: {
                tickets: formattedTickets,
                conversationId,
                customerId: conversation.customerId,
                customerName: conversation.customerName
            }
        });

    } catch (error) {
        logger.error('Error fetching conversation tickets', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tickets'
        });
    }
});

// DELETE /api/inbox/conversation/:conversationId/messages - Clear conversation messages
router.delete('/conversation/:conversationId/messages', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { keepLastN = 0 } = req.query; // Option to keep last N messages

        logger.info('Clearing conversation messages', { 
            conversationId, 
            keepLastN: parseInt(keepLastN) 
        });

        // Verify conversation exists
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        let deletedCount = 0;

        if (parseInt(keepLastN) > 0) {
            // Keep the last N messages, delete the rest
            const messagesToKeep = await prisma.message.findMany({
                where: { conversationId: conversationId },
                orderBy: { createdAt: 'desc' },
                take: parseInt(keepLastN),
                select: { id: true }
            });

            const keepIds = messagesToKeep.map(msg => msg.id);

            const deleteResult = await prisma.message.deleteMany({
                where: {
                    conversationId: conversationId,
                    id: { notIn: keepIds }
                }
            });

            deletedCount = deleteResult.count;
        } else {
            // Delete all messages
            const deleteResult = await prisma.message.deleteMany({
                where: { conversationId: conversationId }
            });

            deletedCount = deleteResult.count;
        }

        // Update conversation's last message time
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { 
                lastMessageAt: new Date()
            }
        });

        logger.info('Conversation messages cleared successfully', {
            conversationId,
            deletedCount,
            keptMessages: parseInt(keepLastN)
        });

        res.json({
            success: true,
            data: {
                conversationId,
                deletedCount,
                keptMessages: parseInt(keepLastN)
            },
            message: `Cleared ${deletedCount} messages from conversation`
        });

    } catch (error) {
        logger.error('Error clearing conversation messages', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear conversation messages'
        });
    }
});

// DELETE /api/inbox/conversation/:conversationId - Delete entire conversation
router.delete('/conversation/:conversationId', async (req, res) => {
    try {
        const { conversationId } = req.params;

        logger.info('Deleting entire conversation', { conversationId });

        // Verify conversation exists
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Delete all messages first (due to foreign key constraints)
        const messageDeleteResult = await prisma.message.deleteMany({
            where: { conversationId: conversationId }
        });

        // Delete AI responses
        const aiResponseDeleteResult = await prisma.aIResponse.deleteMany({
            where: { conversationId: conversationId }
        });

        // Delete the conversation
        await prisma.conversation.delete({
            where: { id: conversationId }
        });

        logger.info('Conversation deleted successfully', {
            conversationId,
            deletedMessages: messageDeleteResult.count,
            deletedAIResponses: aiResponseDeleteResult.count
        });

        res.json({
            success: true,
            data: {
                conversationId,
                deletedMessages: messageDeleteResult.count,
                deletedAIResponses: aiResponseDeleteResult.count
            },
            message: 'Conversation deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting conversation', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete conversation'
        });
    }
});

// POST /api/inbox/conversation/:conversationId/reset - Reset conversation (clear messages and AI memory)
router.post('/conversation/:conversationId/reset', async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { keepCustomerInfo = true } = req.body;

        logger.info('Resetting conversation', { conversationId, keepCustomerInfo });

        // Verify conversation exists
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        // Delete all messages
        const messageDeleteResult = await prisma.message.deleteMany({
            where: { conversationId: conversationId }
        });

        // Delete AI responses
        const aiResponseDeleteResult = await prisma.aIResponse.deleteMany({
            where: { conversationId: conversationId }
        });

        // Reset conversation metadata but keep customer info if requested
        const updateData = {
            lastMessageAt: new Date(),
            status: 'ACTIVE',
            isAiHandling: true, // Reset to AI handling
            intent: null,
            topic: null,
            sentiment: null
        };

        if (!keepCustomerInfo) {
            updateData.metadata = null;
        }

        await prisma.conversation.update({
            where: { id: conversationId },
            data: updateData
        });

        logger.info('Conversation reset successfully', {
            conversationId,
            deletedMessages: messageDeleteResult.count,
            deletedAIResponses: aiResponseDeleteResult.count,
            keptCustomerInfo: keepCustomerInfo
        });

        res.json({
            success: true,
            data: {
                conversationId,
                deletedMessages: messageDeleteResult.count,
                deletedAIResponses: aiResponseDeleteResult.count,
                resetToAiHandling: true
            },
            message: 'Conversation reset successfully - fresh start!'
        });

    } catch (error) {
        logger.error('Error resetting conversation', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset conversation'
        });
    }
});

module.exports = router;