const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Simple webhook verification for Instagram (GET /webhook)
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('🔐 Instagram webhook verification', { mode, token, challenge });

    if (mode === 'subscribe' && token === 'test123') {
        logger.info('✅ Instagram webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        logger.warn('❌ Instagram webhook verification failed', { 
            expected: 'test123', 
            received: token 
        });
        res.sendStatus(403);
    }
});

// Simple webhook handler for Instagram (POST /webhook)
router.post('/', async (req, res) => {
    try {
        const body = req.body;

        logger.info('🔔 WEBHOOK HIT! Incoming POST to /webhook', { 
            headers: req.headers,
            body: JSON.stringify(body),
            method: req.method,
            url: req.url,
            object: body.object,
            entriesCount: body.entry?.length || 0
        });

        // Detect if this is Instagram (like Python implementation)
        const isInstagram = body.object === 'instagram';
        
        if (isInstagram) {
            logger.info('📩 Instagram webhook received', {
                totalEntries: body.entry?.length || 0,
                bodyStructure: Object.keys(body)
            });
            
            for (const entry of body.entry || []) {
                logger.info('Processing Instagram entry', {
                    entryId: entry.id,
                    hasMessaging: !!entry.messaging,
                    messagingCount: entry.messaging?.length || 0,
                    entryKeys: Object.keys(entry)
                });
                
                if (entry.messaging) {
                    for (const messagingEvent of entry.messaging) {
                        try {
                            logger.info('Processing messaging event', {
                                messagingEventKeys: Object.keys(messagingEvent),
                                hasSender: !!messagingEvent.sender,
                                hasMessage: !!messagingEvent.message,
                                hasDelivery: !!messagingEvent.delivery,
                                hasRead: !!messagingEvent.read
                            });
                            
                            const senderId = messagingEvent.sender?.id;
                            const messageData = messagingEvent.message;
                            const messageText = messageData?.text || '';
                            
                            logger.info('Extracted message details', {
                                senderId,
                                hasMessageData: !!messageData,
                                messageText,
                                messageDataKeys: messageData ? Object.keys(messageData) : [],
                                isEcho: messageData?.is_echo,
                                hasAttachments: !!messageData?.attachments,
                                attachmentCount: messageData?.attachments?.length || 0
                            });

                        // Skip echo messages and delivery receipts (like Python implementation)
                        if (messageData?.is_echo || messagingEvent.delivery || messagingEvent.read) {
                            logger.info('Skipping message', {
                                reason: messageData?.is_echo ? 'echo' : messagingEvent.delivery ? 'delivery' : 'read',
                                isEcho: messageData?.is_echo,
                                hasDelivery: !!messagingEvent.delivery,
                                hasRead: !!messagingEvent.read
                            });
                            continue;
                        }

                        const platform = 'Instagram';
                        logger.info(`📩 ${platform} message from ${senderId}: ${messageText}`, {
                            messageData: JSON.stringify(messageData, null, 2),
                            hasText: !!messageData?.text,
                            hasAttachments: !!messageData?.attachments,
                            hasSticker: !!messageData?.sticker_id,
                            messageType: Object.keys(messageData || {})
                        });

                        if (senderId && messageData) {
                            try {
                                // Process any message, not just text messages
                                await processInstagramMessage({
                                    sender: { id: senderId },
                                    recipient: { id: messagingEvent.recipient?.id },
                                    message: messageData
                                }, 'cmbsfx1qt0001tvvj7hoemk12');
                                logger.info('✅ Bot received and processed Instagram message successfully!');
                            } catch (messageError) {
                                logger.error('❌ Error processing Instagram message in webhook', {
                                    senderId,
                                    messageData,
                                    error: messageError.message,
                                    stack: messageError.stack
                                });
                            }
                        } else {
                            logger.warn('⚠️ Instagram webhook: Missing senderId or messageData', {
                                hasSender: !!senderId,
                                hasMessageData: !!messageData,
                                messagingEvent: JSON.stringify(messagingEvent)
                            });
                        }
                        } catch (eventError) {
                            logger.error('❌ Error processing messaging event', {
                                error: eventError.message,
                                stack: eventError.stack,
                                messagingEvent: JSON.stringify(messagingEvent, null, 2)
                            });
                        }
                    }
                } else {
                    logger.warn('📩 Instagram entry has no messaging array', {
                        entryId: entry.id,
                        entryStructure: Object.keys(entry),
                        fullEntry: JSON.stringify(entry)
                    });
                }
            }
        } else {
            logger.warn('Unknown webhook object type', { object: body.object });
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('❌ Webhook error', error);
        res.sendStatus(500);
    }
});

// Webhook verification endpoint (GET)
router.get('/:platform/:businessId?', (req, res) => {
    const { platform, businessId } = req.params;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info(`Webhook verification for ${platform}`, {
        mode,
        token,
        challenge,
        businessId
    });

    // For development, accept any verify token
    if (mode === 'subscribe') {
        const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'my_verify_token';
        
        if (token === expectedToken) {
            logger.info(`Webhook verified for ${platform}`, { businessId });
            res.status(200).send(challenge);
        } else {
            logger.warn(`Webhook verification failed for ${platform}`, { 
                expected: expectedToken, 
                received: token,
                businessId 
            });
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// Instagram webhook handler (POST)
router.post('/instagram/:businessId?', async (req, res) => {
    try {
        const { businessId } = req.params;
        const body = req.body;

        logger.info('Instagram webhook received', { 
            body: JSON.stringify(body),
            businessId 
        });

        // Verify webhook signature if app secret is provided
        if (process.env.INSTAGRAM_APP_SECRET) {
            const signature = req.get('X-Hub-Signature-256');
            if (!verifySignature(JSON.stringify(body), signature, process.env.INSTAGRAM_APP_SECRET)) {
                logger.warn('Instagram webhook signature verification failed');
                return res.sendStatus(403);
            }
        }

        // Process Instagram messages
        if (body.object === 'instagram') {
            for (const entry of body.entry || []) {
                await processInstagramEntry(entry, businessId);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('Instagram webhook error', error);
        res.sendStatus(500);
    }
});

// WhatsApp webhook handler (POST)
router.post('/whatsapp/:businessId?', async (req, res) => {
    try {
        const { businessId } = req.params;
        const body = req.body;

        logger.info('WhatsApp webhook received', { 
            body: JSON.stringify(body),
            businessId 
        });

        // Verify webhook signature if app secret is provided
        if (process.env.WHATSAPP_APP_SECRET) {
            const signature = req.get('X-Hub-Signature-256');
            if (!verifySignature(JSON.stringify(body), signature, process.env.WHATSAPP_APP_SECRET)) {
                logger.warn('WhatsApp webhook signature verification failed');
                return res.sendStatus(403);
            }
        }

        // Process WhatsApp messages
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                await processWhatsAppEntry(entry, businessId);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('WhatsApp webhook error', error);
        res.sendStatus(500);
    }
});

// Universal webhook handler (POST) - handles both Instagram and WhatsApp
router.post('/:businessId?', async (req, res) => {
    try {
        const { businessId } = req.params;
        const body = req.body;

        logger.info('Universal webhook received', { 
            object: body.object,
            businessId,
            entriesCount: body.entry?.length || 0
        });

        // Route to appropriate handler based on object type
        if (body.object === 'instagram') {
            for (const entry of body.entry || []) {
                await processInstagramEntry(entry, businessId);
            }
        } else if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                await processWhatsAppEntry(entry, businessId);
            }
        } else {
            logger.warn('Unknown webhook object type', { object: body.object });
        }

        res.sendStatus(200);
    } catch (error) {
        logger.error('Universal webhook error', error);
        res.sendStatus(500);
    }
});

// Process Instagram webhook entry
async function processInstagramEntry(entry, businessId) {
    try {
        logger.info('Processing Instagram entry', { 
            entryId: entry.id,
            businessId,
            messaging: entry.messaging?.length || 0
        });

        for (const messagingEvent of entry.messaging || []) {
            await processInstagramMessage(messagingEvent, businessId);
        }
    } catch (error) {
        logger.error('Error processing Instagram entry', error);
    }
}

// Auto-discover Instagram Business Account ID (like Python implementation)
async function getInstagramBusinessAccountId() {
    try {
        const accessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
        logger.info('🔑 Instagram token verification', { 
            tokenLength: accessToken?.length,
            tokenStart: accessToken?.substring(0, 20),
            tokenEnd: accessToken?.substring(accessToken?.length - 20)
        });
        
        const response = await fetch(`https://graph.instagram.com/me?access_token=${accessToken}&fields=id,username,account_type`);
        
        if (response.ok) {
            const data = await response.json();
            logger.info('Instagram Business Account ID discovered', { accountId: data.id, username: data.username, accountType: data.account_type });
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

// Get Instagram user information
async function getInstagramUserInfo(userId) {
    try {
        const accessToken = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
        
        // Try to get user information from Instagram Graph API
        const response = await fetch(`https://graph.instagram.com/${userId}?access_token=${accessToken}&fields=id,username,name`);
        
        if (response.ok) {
            const data = await response.json();
            logger.info('Instagram user info retrieved', { 
                userId, 
                username: data.username, 
                name: data.name 
            });
            
            // Return the best available name
            return data.name || data.username || `Instagram User ${userId}`;
        } else {
            const errorText = await response.text();
            logger.warn('Could not fetch Instagram user info', { 
                userId,
                status: response.status, 
                error: errorText
            });
            
            // Fallback to user ID
            return `Instagram User ${userId}`;
        }
    } catch (error) {
        logger.error('Error getting Instagram user info', { userId, error });
        return `Instagram User ${userId}`;
    }
}

// Process individual Instagram message
async function processInstagramMessage(messagingEvent, businessId) {
    try {
        const { sender, recipient, message, delivery, read } = messagingEvent;

        // Skip echo messages and delivery receipts (like Python implementation)
        if (message?.is_echo || delivery || read) {
            logger.info('Instagram event skipped (echo/delivery/read)', { 
                isEcho: message?.is_echo,
                hasDelivery: !!delivery,
                hasRead: !!read,
                sender: sender?.id 
            });
            return;
        }

        if (!message) {
            logger.info('Instagram event without message', { 
                sender: sender?.id,
                recipient: recipient?.id 
            });
            return;
        }

        logger.info('Processing Instagram message', {
            senderId: sender?.id,
            recipientId: recipient?.id,
            messageText: message.text,
            businessId
        });

        // Get Instagram user info for better display name
        const userDisplayName = await getInstagramUserInfo(sender?.id);

        // Create or find conversation for this customer
        let conversation = await prisma.conversation.findFirst({
            where: {
                customerId: sender?.id,
                channel: 'INSTAGRAM',
                businessId: businessId || 'cmbsfx1qt0001tvvj7hoemk12',
                status: { not: 'CLOSED' }
            }
        });

        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    businessId: businessId || 'cmbsfx1qt0001tvvj7hoemk12',
                    customerId: sender?.id,
                    customerName: userDisplayName,
                    channel: 'INSTAGRAM',
                    status: 'ACTIVE',
                    priority: 'NORMAL',
                    channelData: JSON.stringify({
                        platform: 'instagram',
                        senderId: sender?.id,
                        recipientId: recipient?.id
                    }),
                    lastMessageAt: new Date()
                }
            });
        } else {
            // Update last message time and potentially update name if we got new info
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { 
                    lastMessageAt: new Date(),
                    customerName: userDisplayName
                }
            });
        }

        // Determine message content and type
        let messageContent = '[Empty message]';
        let messageType = 'TEXT';
        
        if (message.text) {
            messageContent = message.text;
            messageType = 'TEXT';
        } else if (message.attachments) {
            messageContent = '[Media attachment]';
            messageType = 'MEDIA';
        } else if (message.sticker_id) {
            messageContent = '[Sticker]';
            messageType = 'STICKER';
        } else if (message.quick_reply) {
            messageContent = message.quick_reply.payload || '[Quick reply]';
            messageType = 'QUICK_REPLY';
        }

        logger.info('Storing Instagram message in database', {
            conversationId: conversation.id,
            messageContent,
            messageType,
            senderId: sender?.id
        });

        // Store message in database
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: messageContent,
                sender: 'CUSTOMER',
                senderName: userDisplayName,
                channel: 'INSTAGRAM',
                messageType: messageType,
                channelData: JSON.stringify({
                    platform: 'instagram',
                    messageId: messagingEvent.mid,
                    senderId: sender?.id,
                    recipientId: recipient?.id,
                    originalMessage: message
                })
            }
        });

        // Get AI agent response for any message type
        let inputForAI = message.text || 'User sent a non-text message. How can I help you?';
        
        // If it's an image attachment, fetch the image and convert to base64 for AI analysis
        if (message.attachments && message.attachments.length > 0) {
            const attachment = message.attachments[0];
            if (attachment.type === 'image' && attachment.payload?.url) {
                try {
                    logger.info('Fetching image from Instagram for AI analysis', {
                        imageUrl: attachment.payload.url,
                        senderId: sender?.id
                    });
                    
                    const imageResponse = await fetch(attachment.payload.url);
                    if (imageResponse.ok) {
                        const imageBuffer = await imageResponse.arrayBuffer();
                        const base64Image = Buffer.from(imageBuffer).toString('base64');
                        
                        logger.info('Image fetched and converted to base64', {
                            senderId: sender?.id,
                            imageSizeBytes: imageBuffer.byteLength,
                            base64Length: base64Image.length
                        });
                        
                        // Prepare image data for AI analysis
                        inputForAI = {
                            type: 'image',
                            data: base64Image,
                            mimeType: 'image/jpeg', // Instagram typically serves images as JPEG
                            message: 'User sent an image. Please analyze it and respond appropriately based on the content. This could be a product image, order screenshot, payment screenshot, logistics tracking, product review, or any other business-related image. Please be intelligent about understanding the context and helping the customer.'
                        };
                    } else {
                        logger.warn('Failed to fetch image from Instagram', {
                            status: imageResponse.status,
                            statusText: imageResponse.statusText,
                            imageUrl: attachment.payload.url
                        });
                    }
                } catch (imageError) {
                    logger.error('Error fetching image for AI analysis', {
                        error: imageError.message,
                        imageUrl: attachment.payload.url,
                        senderId: sender?.id
                    });
                }
            }
        }
        
        // Check if conversation is under AI control before responding
        const currentConversation = await prisma.conversation.findUnique({
            where: { id: conversation.id }
        });
        
        const isAiHandling = currentConversation?.isAiHandling !== false; // Default to true if not set
        
        logger.info('Checking conversation control status', {
            conversationId: conversation.id,
            isAiHandling,
            senderId: sender?.id
        });
        
        if (!isAiHandling) {
            logger.info('Human agent is handling conversation - AI will not respond', {
                conversationId: conversation.id,
                senderId: sender?.id
            });
            return; // Exit early - don't generate AI response
        }
        
        const response = await getAIResponse(inputForAI, sender?.id, businessId, conversation);
        
        if (response) {
            // Extract actual text from AI response
            // The CoreAIAgent returns {response: actual_text, success: true, ...}
            const replyText = typeof response === 'string' ? response : response?.response || response?.output || response?.text || 'Hello! How can I assist you today?';
            
            // Store AI response message
            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    content: replyText,
                    sender: 'AI_AGENT',
                    senderName: 'SARAH',
                    channel: 'INSTAGRAM',
                    messageType: 'TEXT',
                    channelData: JSON.stringify({
                        platform: 'instagram',
                        ai_generated: true,
                        senderId: recipient?.id,
                        recipientId: sender?.id
                    })
                }
            });

            // Send response via Instagram API (like Python implementation)
            await sendInstagramMessage(sender?.id, replyText);
            logger.info('Instagram AI response sent successfully', {
                senderId: sender?.id,
                response: replyText.substring(0, 100) + '...'
            });
        }

    } catch (error) {
        logger.error('Error processing Instagram message', error);
    }
}

// Process WhatsApp webhook entry
async function processWhatsAppEntry(entry, businessId) {
    try {
        logger.info('Processing WhatsApp entry', { 
            entryId: entry.id,
            businessId,
            changes: entry.changes?.length || 0
        });

        for (const change of entry.changes || []) {
            if (change.field === 'messages') {
                await processWhatsAppMessages(change.value, businessId);
            }
        }
    } catch (error) {
        logger.error('Error processing WhatsApp entry', error);
    }
}

// Process WhatsApp messages
async function processWhatsAppMessages(value, businessId) {
    try {
        const { messages, statuses } = value;

        // Process incoming messages
        for (const message of messages || []) {
            await processWhatsAppMessage(message, businessId);
        }

        // Process message statuses (delivered, read, etc.)
        for (const status of statuses || []) {
            logger.info('WhatsApp message status', {
                messageId: status.id,
                status: status.status,
                timestamp: status.timestamp
            });
        }
    } catch (error) {
        logger.error('Error processing WhatsApp messages', error);
    }
}

// Process individual WhatsApp message
async function processWhatsAppMessage(message, businessId) {
    try {
        const { from, to, text, type, timestamp } = message;

        logger.info('Processing WhatsApp message', {
            from,
            to,
            type,
            text: text?.body,
            businessId
        });

        // Store message in database
        await prisma.message.create({
            data: {
                platform: 'WHATSAPP',
                platformMessageId: message.id,
                senderId: from,
                recipientId: to,
                content: text?.body || `[${type} message]`,
                messageType: type?.toUpperCase() || 'TEXT',
                direction: 'INBOUND',
                timestamp: new Date(parseInt(timestamp) * 1000),
                businessId: businessId || 'cmbsfx1qt0001tvvj7hoemk12',
                metadata: JSON.stringify({
                    type,
                    context: message.context || null
                })
            }
        });

        // Get AI agent response for text messages
        if (text?.body) {
            const response = await getAIResponse(text.body, from, businessId);
            
            if (response) {
                // Store AI response
                await prisma.message.create({
                    data: {
                        platform: 'WHATSAPP',
                        platformMessageId: `ai_response_${Date.now()}_${from}`,
                        senderId: to,
                        recipientId: from,
                        content: response,
                        messageType: 'TEXT',
                        direction: 'OUTBOUND',
                        timestamp: new Date(),
                        businessId: businessId || 'cmbsfx1qt0001tvvj7hoemk12',
                        metadata: JSON.stringify({ ai_generated: true })
                    }
                });

                // Send response via WhatsApp API (implement when ready)
                logger.info('AI response generated for WhatsApp', {
                    from,
                    response: response.substring(0, 100) + '...'
                });
            }
        }

    } catch (error) {
        logger.error('Error processing WhatsApp message', error);
    }
}

// Get AI response using your existing agent
async function getAIResponse(input, senderId, businessId, conversation = null) {
    try {
        // Import your AI agent
        const CoreAIAgent = require('../agents/CoreAIAgent');
        
        // Create or get existing agent instance
        const aiAgent = new CoreAIAgent(businessId || 'cmbsfx1qt0001tvvj7hoemk12');
        await aiAgent.initialize();
        
        // Handle different input types
        let response;
        if (typeof input === 'object' && input.type === 'image') {
            // For image inputs, use the visual analysis capability
            logger.info('Processing image input for AI analysis', {
                senderId,
                hasImageData: !!input.data,
                imageDataLength: input.data?.length || 0
            });
            
            response = await aiAgent.chat(input.message, { 
                senderId,
                conversationId: conversation?.id || `instagram-${senderId}`,
                customerName: conversation?.customerName || `Instagram User ${senderId}`,
                image: input.data  // Pass image data in the format CoreAIAgent expects
            });
        } else {
            // For text inputs, use normal chat
            response = await aiAgent.chat(input, { 
                senderId, 
                conversationId: conversation?.id || `instagram-${senderId}`,
                customerName: conversation?.customerName || `Instagram User ${senderId}`
            });
        }
        
        return response;
    } catch (error) {
        logger.error('Error getting AI response', error);
        return 'I apologize, but I\'m having trouble processing your message right now. Please try again later.';
    }
}

// Send Instagram message (like Python implementation)
async function sendInstagramMessage(recipientId, messageText) {
    try {
        // Ensure messageText is a string
        const textToSend = typeof messageText === 'string' ? messageText : String(messageText);
        logger.info('📤 Sending Instagram message', { recipientId, text: textToSend.substring(0, 50) + '...' });
        
        // Auto-discover Instagram Business Account ID (like Python implementation)
        const igAccountId = await getInstagramBusinessAccountId();
        if (!igAccountId) {
            logger.error('❌ Failed to get Instagram Business Account ID');
            return;
        }

        logger.info('📱 Using Instagram Business Account ID', { igAccountId });

        // Use v19.0 API exactly like Python implementation (with access_token in URL)
        const url = `https://graph.instagram.com/v19.0/${igAccountId}/messages?access_token=${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN}`;
        
        const payload = {
            recipient: { id: recipientId },
            message: { text: textToSend }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // Note: No Authorization header - using access_token in URL like Python
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            logger.info('✅ Instagram message sent successfully', { 
                messageId: result.message_id,
                recipientId 
            });
        } else {
            const errorText = await response.text();
            logger.error('❌ Failed to send Instagram message', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText,
                recipientId
            });
        }
    } catch (error) {
        logger.error('❌ Error sending Instagram message', error);
    }
}

// Verify webhook signature
function verifySignature(payload, signature, secret) {
    if (!signature) return false;
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
    );
}

module.exports = router;