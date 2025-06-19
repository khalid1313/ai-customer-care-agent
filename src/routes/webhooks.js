const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Skip authentication for webhooks (they use their own verification)
// No router.use(authenticate) here

// WhatsApp webhook verification and message handling
router.get('/whatsapp/:businessId', (req, res) => {
    try {
        const { businessId } = req.params;
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        logger.info('WhatsApp webhook verification', { businessId, mode, token });

        // In production, verify the token against stored webhook verify token
        // For now, accept any verification
        if (mode === 'subscribe') {
            res.status(200).send(challenge);
            logger.info('WhatsApp webhook verified successfully', { businessId });
        } else {
            res.sendStatus(403);
        }
    } catch (error) {
        logger.error('WhatsApp webhook verification error', error);
        res.sendStatus(500);
    }
});

router.post('/whatsapp/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const body = req.body;

        logger.info('WhatsApp webhook received', { businessId, body: JSON.stringify(body) });

        // Process WhatsApp message
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'messages') {
                        const message = change.value.messages?.[0];
                        const contact = change.value.contacts?.[0];
                        
                        if (message && contact) {
                            await handleWhatsAppMessage(businessId, message, contact);
                        }
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('WhatsApp webhook processing error', error);
        res.sendStatus(500);
    }
});

// Instagram webhook verification and message handling  
router.get('/instagram/:businessId', (req, res) => {
    try {
        const { businessId } = req.params;
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        logger.info('Instagram webhook verification', { businessId, mode, token });

        // Verify the token
        const expectedToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || 'myverifytoken123';
        if (mode === 'subscribe' && token === expectedToken) {
            res.status(200).send(challenge);
            logger.info('Instagram webhook verified successfully', { businessId, token });
        } else {
            logger.error('Instagram webhook verification failed', { mode, token, expectedToken });
            res.sendStatus(403);
        }
    } catch (error) {
        logger.error('Instagram webhook verification error', error);
        res.sendStatus(500);
    }
});

router.post('/instagram/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const body = req.body;

        logger.info('Instagram/Facebook webhook received', { businessId, body: JSON.stringify(body) });

        // Process Instagram message (Instagram API structure)
        if (body.object === 'instagram') {
            for (const entry of body.entry || []) {
                // Instagram API uses 'changes' array for webhook events
                for (const change of entry.changes || []) {
                    logger.info('Instagram change event', { 
                        field: change.field, 
                        value: JSON.stringify(change.value) 
                    });
                    
                    if (change.field === 'messages' && change.value) {
                        // Handle both test format and real Instagram messages
                        const messageData = change.value;
                        
                        if (messageData.messages && messageData.messages.length > 0) {
                            // New Instagram API format
                            for (const msg of messageData.messages) {
                                const messaging = {
                                    sender: { id: msg.from.id },
                                    recipient: { id: msg.to.id },
                                    timestamp: msg.timestamp,
                                    message: {
                                        mid: msg.id,
                                        text: msg.text
                                    }
                                };
                                await handleInstagramMessage(businessId, messaging);
                            }
                        } else if (messageData.sender && messageData.message) {
                            // Facebook test webhook format
                            const messaging = {
                                sender: messageData.sender,
                                recipient: messageData.recipient,
                                timestamp: messageData.timestamp,
                                message: messageData.message
                            };
                            await handleInstagramMessage(businessId, messaging);
                        }
                    } else if (change.field === 'messaging' && change.value) {
                        // Handle other messaging events (reactions, etc)
                        const messagingEvents = change.value.messaging || [];
                        for (const messaging of messagingEvents) {
                            if (messaging.message) {
                                await handleInstagramMessage(businessId, messaging);
                            }
                        }
                    }
                }
            }
        }
        
        // Process Facebook Page message
        if (body.object === 'page') {
            for (const entry of body.entry || []) {
                for (const messaging of entry.messaging || []) {
                    if (messaging.message) {
                        await handleFacebookMessage(businessId, messaging);
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('Instagram webhook processing error', error);
        res.sendStatus(500);
    }
});

// Unified webhook endpoint (handles both WhatsApp and Instagram)
router.get('/unified/:businessId', (req, res) => {
    try {
        const { businessId } = req.params;
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        logger.info('Unified webhook verification', { businessId, mode, token });

        if (mode === 'subscribe') {
            res.status(200).send(challenge);
            logger.info('Unified webhook verified successfully', { businessId });
        } else {
            res.sendStatus(403);
        }
    } catch (error) {
        logger.error('Unified webhook verification error', error);
        res.sendStatus(500);
    }
});

router.post('/unified/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const body = req.body;

        logger.info('Unified webhook received', { businessId, body: JSON.stringify(body) });

        // Handle WhatsApp messages
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'messages') {
                        const message = change.value.messages?.[0];
                        const contact = change.value.contacts?.[0];
                        
                        if (message && contact) {
                            await handleWhatsAppMessage(businessId, message, contact);
                        }
                    }
                }
            }
        }

        // Handle Instagram messages
        if (body.object === 'instagram') {
            for (const entry of body.entry || []) {
                // Instagram uses 'changes' array
                for (const change of entry.changes || []) {
                    if (change.field === 'messages' && change.value) {
                        const messageData = change.value;
                        if (messageData.messages && messageData.messages.length > 0) {
                            for (const msg of messageData.messages) {
                                const messaging = {
                                    sender: { id: msg.from.id },
                                    recipient: { id: msg.to.id },
                                    timestamp: msg.timestamp,
                                    message: {
                                        mid: msg.id,
                                        text: msg.text
                                    }
                                };
                                await handleInstagramMessage(businessId, messaging);
                            }
                        }
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('Unified webhook processing error', error);
        res.sendStatus(500);
    }
});

// Test webhook endpoint for development
router.post('/test/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const { platform, message, sender } = req.body;

        // Use real business ID for khalid@clicky.pk
        const realBusinessId = 'cmbsfx1qt0001tvvj7hoemk12';

        logger.info('Test webhook received', { businessId: realBusinessId, platform, message, sender });

        // Simulate message based on platform
        if (platform === 'whatsapp') {
            await handleWhatsAppMessage(realBusinessId, {
                id: 'test_' + Date.now(),
                type: 'text',
                text: { body: message },
                timestamp: Date.now().toString()
            }, {
                profile: { name: sender || 'Test User' },
                wa_id: '1234567890'
            });
        } else if (platform === 'instagram') {
            await handleInstagramMessage(realBusinessId, {
                sender: { id: '1234567890' },
                recipient: { id: '0987654321' },
                timestamp: Date.now(),
                message: {
                    mid: 'test_' + Date.now(),
                    text: message
                }
            });
        }

        res.json({
            success: true,
            message: 'Test message processed',
            businessId,
            platform
        });
    } catch (error) {
        logger.error('Test webhook error', error);
        res.status(500).json({
            success: false,
            error: 'Test webhook failed'
        });
    }
});

// Handle WhatsApp message
async function handleWhatsAppMessage(businessId, message, contact) {
    try {
        logger.info('Processing WhatsApp message', { businessId, messageId: message.id });

        // Create or find customer
        const customerId = contact.wa_id;
        const customerName = contact.profile?.name || 'WhatsApp User';
        const actualBusinessId = businessId === 'default' ? 'cmbsfx1qt0001tvvj7hoemk12' : businessId;

        // Create or find conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                businessId: actualBusinessId,
                customerId: customerId,
                channel: 'WHATSAPP'
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    businessId: actualBusinessId,
                    customerId: customerId,
                    customerName: customerName,
                    channel: 'WHATSAPP',
                    status: 'ACTIVE',
                    priority: 'MEDIUM',
                    metadata: JSON.stringify({
                        whatsappId: customerId,
                        contact: contact
                    })
                }
            });
        }

        // Store message in database
        const newMessage = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: message.text?.body || 'Media message',
                sender: 'CUSTOMER',
                senderName: customerName,
                channel: 'WHATSAPP',
                channelData: JSON.stringify({
                    messageId: message.id,
                    messageType: message.type,
                    timestamp: message.timestamp,
                    contact: contact
                }),
                messageType: message.type?.toUpperCase() || 'TEXT'
            }
        });

        // Get AI agent for this business and process message
        const CoreAIAgent = require('../agents/CoreAIAgent');
        const aiAgent = new CoreAIAgent(actualBusinessId);
        await aiAgent.initialize();

        const response = await aiAgent.chat(message.text?.body || '', {
            customerId: customerId,
            customerName: customerName,
            platform: 'whatsapp', 
            messageId: message.id, 
            conversationId: conversation.id
        });

        // Store AI response
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: response.response,
                sender: 'AI_AGENT',
                senderName: 'AI Assistant',
                channel: 'WHATSAPP',
                channelData: JSON.stringify({
                    replyToMessageId: message.id,
                    aiGenerated: true
                }),
                messageType: 'TEXT',
                replyToId: newMessage.id
            }
        });

        // In production, send response back to WhatsApp
        logger.info('WhatsApp message processed', { 
            businessId, 
            customerId, 
            conversationId: conversation.id,
            response: response.response.substring(0, 100) + '...'
        });

    } catch (error) {
        logger.error('Error handling WhatsApp message', error);
    }
}

// Handle Instagram message
async function handleInstagramMessage(businessId, messaging) {
    try {
        logger.info('Processing Instagram message', { businessId, messageId: messaging.message?.mid });

        const customerId = messaging.sender.id;
        const customerName = 'Instagram User';
        const messageText = messaging.message?.text || 'Media message';
        const actualBusinessId = businessId === 'default' ? 'cmbsfx1qt0001tvvj7hoemk12' : businessId;

        // Create or find conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                businessId: actualBusinessId,
                customerId: customerId,
                channel: 'INSTAGRAM'
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    businessId: actualBusinessId,
                    customerId: customerId,
                    customerName: customerName,
                    channel: 'INSTAGRAM',
                    status: 'ACTIVE',
                    priority: 'MEDIUM',
                    metadata: JSON.stringify({
                        instagramId: customerId,
                        messaging: messaging
                    })
                }
            });
        }

        // Store message in database
        const newMessage = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: messageText,
                sender: 'CUSTOMER',
                senderName: customerName,
                channel: 'INSTAGRAM',
                channelData: JSON.stringify({
                    messageId: messaging.message?.mid,
                    timestamp: messaging.timestamp,
                    messaging: messaging
                }),
                messageType: 'TEXT'
            }
        });

        // Get AI agent for this business and process message
        const CoreAIAgent = require('../agents/CoreAIAgent');
        const aiAgent = new CoreAIAgent(actualBusinessId);
        await aiAgent.initialize();

        const response = await aiAgent.chat(messageText, {
            customerId: customerId,
            customerName: customerName,
            platform: 'instagram', 
            messageId: messaging.message?.mid, 
            conversationId: conversation.id
        });

        // Store AI response
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: response.response,
                sender: 'AI_AGENT',
                senderName: 'AI Assistant',
                channel: 'INSTAGRAM',
                channelData: JSON.stringify({
                    replyToMessageId: messaging.message?.mid,
                    aiGenerated: true
                }),
                messageType: 'TEXT',
                replyToId: newMessage.id
            }
        });

        // Send response back to Instagram via Facebook API
        await sendInstagramMessage(customerId, response.response, businessId);
        
        logger.info('Instagram message processed and response sent', { 
            businessId, 
            customerId, 
            conversationId: conversation.id,
            response: response.response.substring(0, 100) + '...'
        });

    } catch (error) {
        logger.error('Error handling Instagram message', error);
    }
}

// Handle Facebook message
async function handleFacebookMessage(businessId, messaging) {
    try {
        logger.info('Processing Facebook message', { businessId, messageId: messaging.message?.mid });

        const customerId = messaging.sender.id;
        const customerName = 'Facebook User';
        const messageText = messaging.message?.text || 'Media message';
        const actualBusinessId = businessId === 'default' ? 'cmbsfx1qt0001tvvj7hoemk12' : businessId;

        // Create or find conversation
        let conversation = await prisma.conversation.findFirst({
            where: {
                businessId: actualBusinessId,
                customerId: customerId,
                channel: 'FACEBOOK'
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    businessId: actualBusinessId,
                    customerId: customerId,
                    customerName: customerName,
                    channel: 'FACEBOOK',
                    status: 'ACTIVE',
                    priority: 'MEDIUM',
                    metadata: JSON.stringify({
                        facebookId: customerId,
                        messaging: messaging
                    })
                }
            });
        }

        // Store message in database
        const newMessage = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: messageText,
                sender: 'CUSTOMER',
                senderName: customerName,
                channel: 'FACEBOOK',
                channelData: JSON.stringify({
                    messageId: messaging.message?.mid,
                    timestamp: messaging.timestamp,
                    messaging: messaging
                }),
                messageType: 'TEXT'
            }
        });

        // Get AI agent for this business and process message
        const CoreAIAgent = require('../agents/CoreAIAgent');
        const aiAgent = new CoreAIAgent(actualBusinessId);
        await aiAgent.initialize();

        const response = await aiAgent.chat(messageText, {
            customerId: customerId,
            customerName: customerName,
            platform: 'facebook', 
            messageId: messaging.message?.mid, 
            conversationId: conversation.id
        });

        // Store AI response
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: response.response,
                sender: 'AI_AGENT',
                senderName: 'AI Assistant',
                channel: 'FACEBOOK',
                channelData: JSON.stringify({
                    replyToMessageId: messaging.message?.mid,
                    aiGenerated: true
                }),
                messageType: 'TEXT',
                replyToId: newMessage.id
            }
        });

        // Send response back to Facebook via Facebook API
        await sendFacebookMessage(customerId, response.response, businessId);
        
        logger.info('Facebook message processed and response sent', { 
            businessId, 
            customerId, 
            conversationId: conversation.id,
            response: response.response.substring(0, 100) + '...'
        });

    } catch (error) {
        logger.error('Error handling Facebook message', error);
    }
}

// Send message back to Instagram using Instagram API
async function sendInstagramMessage(recipientId, messageText, businessId) {
    try {
        // Use Instagram Access Token instead of Facebook Page Token
        const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN || 'EAAULNfs2ZAEIBOZCi4ZAMcMtQVYEdnSZATOf8INpo6RGgekpsEooG19zwNZCUYNkNxZCAXRwCMRZBYEfCOUW0dqcfPzndu0tNkQEJZCJZC8sMWTnSBxlDgGnkhaIBTliw3OtVpQQtxjy1cT6NiWtPxcipZAJGX5Vhc0ARixqlQw46GNr6G0DWGPn7AZCaf5FMbWyNWjvrMZAtIIJnQKj6KWmqxwKnLU10fkDePYg5yt06CbOXUQ1MXOuiH3I';
        const instagramScopedId = recipientId; // This should be the Instagram Scoped ID (IGSID)
        
        // Get Instagram Business Account ID from environment or page connection
        let instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
        
        if (!instagramAccountId || instagramAccountId === 'YOUR_INSTAGRAM_BUSINESS_ID') {
            // Try to get from Instagram API connection
            const instagramResponse = await fetch(`https://graph.instagram.com/me?access_token=${instagramAccessToken}`);
            const instagramData = await instagramResponse.json();
            
            if (instagramData.id) {
                instagramAccountId = instagramData.id;
                logger.info('Found Instagram Business Account ID from API', { instagramAccountId });
            } else {
                logger.error('No Instagram business account found and no INSTAGRAM_BUSINESS_ACCOUNT_ID in env');
                return null;
            }
        }
        
        // Send message using Instagram Direct Message API
        const messageData = {
            recipient: {
                id: instagramScopedId
            },
            message: {
                text: messageText
            }
        };

        // Use Instagram Graph API to send messages
        const response = await fetch(`https://graph.instagram.com/v18.0/${instagramAccountId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${instagramAccessToken}`
            },
            body: JSON.stringify(messageData)
        });

        const result = await response.json();
        
        logger.info('Instagram API Response', { 
            statusCode: response.status,
            result: JSON.stringify(result),
            recipientId: instagramScopedId,
            instagramAccountId,
            messageText: messageText.substring(0, 50) + '...'
        });
        
        if (response.ok) {
            logger.info('✅ Instagram message sent successfully', { 
                recipientId: instagramScopedId, 
                messageId: result.message_id,
                businessId,
                instagramAccountId 
            });
        } else {
            logger.error('❌ Failed to send Instagram message', { 
                error: result,
                recipientId: instagramScopedId,
                businessId,
                instagramAccountId,
                statusCode: response.status,
                token: instagramAccessToken.substring(0, 20) + '...'
            });
        }
        
        return result;
    } catch (error) {
        logger.error('Error sending Instagram message', { error, recipientId, businessId });
        throw error;
    }
}

// Send message back to Facebook
async function sendFacebookMessage(recipientId, messageText, businessId) {
    try {
        // Use the Facebook page access token from environment
        const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
        
        const messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: messageText
            }
        };

        const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });

        const result = await response.json();
        
        if (response.ok) {
            logger.info('Facebook message sent successfully', { 
                recipientId, 
                messageId: result.message_id,
                businessId 
            });
        } else {
            logger.error('Failed to send Facebook message', { 
                error: result,
                recipientId,
                businessId 
            });
        }
        
        return result;
    } catch (error) {
        logger.error('Error sending Facebook message', { error, recipientId, businessId });
        throw error;
    }
}

// Send message back to WhatsApp  
async function sendWhatsAppMessage(recipientId, messageText, businessId) {
    try {
        // You'll need to add your WhatsApp access token here
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_WHATSAPP_TOKEN';
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
        
        const messageData = {
            messaging_product: "whatsapp",
            to: recipientId,
            text: {
                body: messageText
            }
        };

        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });

        const result = await response.json();
        
        if (response.ok) {
            logger.info('WhatsApp message sent successfully', { 
                recipientId, 
                messageId: result.messages?.[0]?.id,
                businessId 
            });
        } else {
            logger.error('Failed to send WhatsApp message', { 
                error: result,
                recipientId,
                businessId 
            });
        }
        
        return result;
    } catch (error) {
        logger.error('Error sending WhatsApp message', { error, recipientId, businessId });
        throw error;
    }
}

module.exports = router;