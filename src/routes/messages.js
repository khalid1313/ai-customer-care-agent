const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Send message from ticket to customer
router.post('/send', async (req, res) => {
    try {
        const { ticketId, message, agentName = 'Support Agent' } = req.body;

        // Validate input
        if (!ticketId || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: ticketId and message'
            });
        }

        // Get ticket details
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found'
            });
        }

        // Get conversation details if linked
        let conversation = null;
        if (ticket.parentConversationId) {
            conversation = await prisma.conversation.findUnique({
                where: { id: ticket.parentConversationId }
            });
        }

        // If no conversation exists, try to find one by customer ID
        if (!conversation && ticket.customerId) {
            conversation = await prisma.conversation.findFirst({
                where: {
                    customerId: ticket.customerId,
                    channel: 'INSTAGRAM', // Assuming Instagram for now
                    businessId: ticket.businessId,
                    status: { not: 'CLOSED' }
                },
                orderBy: { lastMessageAt: 'desc' }
            });
        }

        // Store message in database
        const agentMessage = await prisma.message.create({
            data: {
                conversationId: conversation?.id || null,
                content: message,
                sender: 'HUMAN_AGENT',
                senderName: agentName,
                channel: conversation?.channel || 'INSTAGRAM',
                messageType: 'TEXT',
                channelData: JSON.stringify({
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    agentSent: true,
                    sentFromTicket: true,
                    timestamp: new Date().toISOString()
                })
            }
        });

        // Send message via appropriate channel
        let sendResult = { success: false, error: 'No channel available' };

        if (conversation?.channel === 'INSTAGRAM' && ticket.customerId) {
            // Send via Instagram
            sendResult = await sendInstagramMessage(ticket.customerId, message);
        } else if (conversation?.channel === 'WHATSAPP' && ticket.customerId) {
            // Send via WhatsApp (implement when ready)
            sendResult = { success: false, error: 'WhatsApp sending not implemented yet' };
        } else {
            // Try to send via Instagram as fallback if we have customerId
            if (ticket.customerId) {
                sendResult = await sendInstagramMessage(ticket.customerId, message);
            }
        }

        // Update conversation if exists
        if (conversation) {
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    lastMessageAt: new Date(),
                    isAiHandling: false // Human agent is now handling
                }
            });
        }

        // Update ticket with agent activity (only update existing fields)
        // Note: assignedTo expects User ID, not name, so we'll skip this for now
        await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                updatedAt: new Date()
            }
        });

        logger.info('Agent message sent from ticket', {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            customerId: ticket.customerId,
            messageLength: message.length,
            channel: conversation?.channel || 'unknown',
            sendSuccess: sendResult.success
        });

        // Check messaging window status for Instagram (24-hour window)
        let messagingWindowStatus = 'unknown';
        let windowExpiresAt = null;
        
        if (conversation?.lastMessageAt) {
            const lastMessageTime = new Date(conversation.lastMessageAt);
            const now = new Date();
            const hoursSinceLastMessage = (now - lastMessageTime) / (1000 * 60 * 60);
            
            if (hoursSinceLastMessage < 24) {
                messagingWindowStatus = 'open';
                windowExpiresAt = new Date(lastMessageTime.getTime() + (24 * 60 * 60 * 1000));
            } else {
                messagingWindowStatus = 'expired';
            }
        }

        res.json({
            success: true,
            data: {
                messageId: agentMessage.id,
                ticketNumber: ticket.ticketNumber,
                sentToCustomer: sendResult.success,
                channel: conversation?.channel || 'instagram',
                sendError: sendResult.error || null,
                messagingWindow: {
                    status: messagingWindowStatus,
                    expiresAt: windowExpiresAt,
                    hoursRemaining: windowExpiresAt ? Math.max(0, Math.round((windowExpiresAt - new Date()) / (1000 * 60 * 60))) : 0
                },
                customerInfo: {
                    customerId: ticket.customerId,
                    customerName: ticket.customerName,
                    lastActiveAt: conversation?.lastMessageAt
                }
            }
        });

    } catch (error) {
        logger.error('Error sending message from ticket', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
});

// Add internal note to ticket
router.post('/internal-note', async (req, res) => {
    try {
        const { ticketId, note, agentName = 'Support Agent' } = req.body;

        // Validate input
        if (!ticketId || !note) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: ticketId and note'
            });
        }

        // Get ticket details
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found'
            });
        }

        // Store internal note
        const internalNote = await prisma.message.create({
            data: {
                conversationId: ticket.parentConversationId,
                content: note,
                sender: 'INTERNAL_NOTE',
                senderName: agentName,
                channel: 'INTERNAL',
                messageType: 'INTERNAL_NOTE',
                channelData: JSON.stringify({
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    internalNote: true,
                    noteType: 'internal',
                    visibility: 'agents_only',
                    timestamp: new Date().toISOString()
                })
            }
        });

        logger.info('Internal note added to ticket', {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            noteId: internalNote.id,
            agentName
        });

        res.json({
            success: true,
            data: {
                noteId: internalNote.id,
                ticketNumber: ticket.ticketNumber,
                createdAt: internalNote.createdAt
            }
        });

    } catch (error) {
        logger.error('Error adding internal note', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add internal note'
        });
    }
});

// Get conversation history for ticket
router.get('/history/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;

        // Get ticket details
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found'
            });
        }

        // Get conversation messages
        let messages = [];
        if (ticket.parentConversationId) {
            messages = await prisma.message.findMany({
                where: {
                    conversationId: ticket.parentConversationId
                },
                orderBy: { createdAt: 'asc' }
            });
        }

        // Also get messages related to this ticket
        const ticketMessages = await prisma.message.findMany({
            where: {
                channelData: {
                    contains: ticket.id
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Combine and deduplicate messages
        const allMessages = [...messages, ...ticketMessages];
        const uniqueMessages = allMessages.filter((message, index, self) => 
            index === self.findIndex(m => m.id === message.id)
        );

        res.json({
            success: true,
            data: {
                ticketNumber: ticket.ticketNumber,
                messages: uniqueMessages.map(msg => ({
                    id: msg.id,
                    content: msg.content,
                    sender: msg.sender,
                    senderName: msg.senderName,
                    channel: msg.channel,
                    messageType: msg.messageType,
                    createdAt: msg.createdAt,
                    isInternal: msg.messageType === 'INTERNAL_NOTE'
                }))
            }
        });

    } catch (error) {
        logger.error('Error getting conversation history', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get conversation history'
        });
    }
});

// Send Instagram message (reuse from webhook.js)
async function sendInstagramMessage(recipientId, messageText) {
    try {
        const textToSend = typeof messageText === 'string' ? messageText : String(messageText);
        logger.info('📤 Sending Instagram message from ticket', { recipientId, text: textToSend.substring(0, 50) + '...' });
        
        // Auto-discover Instagram Business Account ID
        const igAccountId = await getInstagramBusinessAccountId();
        if (!igAccountId) {
            logger.error('❌ Failed to get Instagram Business Account ID');
            return { success: false, error: 'Failed to get Instagram Business Account ID' };
        }

        logger.info('📱 Using Instagram Business Account ID', { igAccountId });

        // Use v19.0 API
        const url = `https://graph.instagram.com/v19.0/${igAccountId}/messages?access_token=${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN}`;
        
        const payload = {
            recipient: { id: recipientId },
            message: { text: textToSend }
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
            logger.info('✅ Instagram message sent successfully from ticket', { 
                messageId: result.message_id,
                recipientId 
            });
            return { success: true, messageId: result.message_id };
        } else {
            const errorText = await response.text();
            logger.error('❌ Failed to send Instagram message from ticket', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText,
                recipientId
            });
            return { success: false, error: errorText };
        }
    } catch (error) {
        logger.error('❌ Error sending Instagram message from ticket', error);
        return { success: false, error: error.message };
    }
}

// Auto-discover Instagram Business Account ID
async function getInstagramBusinessAccountId() {
    try {
        const accessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
        
        const response = await fetch(`https://graph.instagram.com/me?access_token=${accessToken}&fields=id,username,account_type`);
        
        if (response.ok) {
            const data = await response.json();
            logger.info('Instagram Business Account ID discovered', { accountId: data.id, username: data.username });
            return data.id;
        } else {
            const errorText = await response.text();
            logger.error('Failed to get Instagram Business Account ID', { 
                status: response.status, 
                error: errorText
            });
            return null;
        }
    } catch (error) {
        logger.error('Error getting Instagram Business Account ID', error);
        return null;
    }
}

module.exports = router;