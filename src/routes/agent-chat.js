const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Store SSE connections
const sseConnections = new Map(); // userId -> response object

// GET /api/agent-chat/rooms/:businessId - Get all chat rooms for a business
router.get('/rooms/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        
        const chatRooms = await prisma.chatRoom.findMany({
            where: {
                businessId,
                isActive: true
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true,
                                isActive: true
                            }
                        }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: { lastActivity: 'desc' }
        });

        res.json({
            success: true,
            data: chatRooms
        });

    } catch (error) {
        logger.error('Error fetching chat rooms', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat rooms'
        });
    }
});

// POST /api/agent-chat/rooms - Create a new chat room
router.post('/rooms', [
    body('businessId').isString().trim().notEmpty(),
    body('name').optional().isString().trim(),
    body('type').isIn(['direct', 'group', 'support']).withMessage('Invalid room type'),
    body('participants').isArray().withMessage('Participants must be an array'),
    body('createdBy').isString().trim().notEmpty()
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

        const { businessId, name, type = 'direct', participants, createdBy } = req.body;

        // For direct chats, check if room already exists
        if (type === 'direct' && participants.length === 2) {
            const existingRoom = await prisma.chatRoom.findFirst({
                where: {
                    businessId,
                    type: 'direct',
                    participants: {
                        every: {
                            userId: { in: participants }
                        }
                    }
                },
                include: {
                    participants: true
                }
            });

            if (existingRoom && existingRoom.participants.length === 2) {
                return res.json({
                    success: true,
                    data: existingRoom,
                    message: 'Direct chat already exists'
                });
            }
        }

        // Create new chat room
        const chatRoom = await prisma.chatRoom.create({
            data: {
                businessId,
                name: name || (type === 'direct' ? null : `${type} chat`),
                type,
                createdBy,
                participants: {
                    create: participants.map(userId => ({
                        userId,
                        role: userId === createdBy ? 'admin' : 'member'
                    }))
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                }
            }
        });

        logger.info('Chat room created', {
            roomId: chatRoom.id,
            businessId,
            type,
            createdBy,
            participantCount: participants.length
        });

        res.json({
            success: true,
            data: chatRoom,
            message: 'Chat room created successfully'
        });

    } catch (error) {
        logger.error('Error creating chat room', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create chat room'
        });
    }
});

// GET /api/agent-chat/rooms/:roomId/messages - Get messages for a chat room
router.get('/rooms/:roomId/messages', [
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const { roomId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const messages = await prisma.chatMessage.findMany({
            where: {
                chatRoomId: roomId,
                deletedAt: null
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                },
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        sender: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                reactions: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        res.json({
            success: true,
            data: messages.reverse() // Return in chronological order
        });

    } catch (error) {
        logger.error('Error fetching chat messages', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch messages'
        });
    }
});

// POST /api/agent-chat/rooms/:roomId/messages - Send a message
router.post('/rooms/:roomId/messages', [
    body('senderId').isString().trim().notEmpty(),
    body('content').isString().trim().notEmpty(),
    body('messageType').optional().isIn(['text', 'file', 'ticket_tag', 'system']),
    body('metadata').optional().isString(),
    body('replyToId').optional().isString()
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

        const { roomId } = req.params;
        const { senderId, content, messageType = 'text', metadata, replyToId } = req.body;

        // Verify sender is participant in the room
        const participant = await prisma.chatParticipant.findFirst({
            where: {
                chatRoomId: roomId,
                userId: senderId,
                isActive: true
            }
        });

        if (!participant) {
            return res.status(403).json({
                success: false,
                error: 'You are not a participant in this chat room'
            });
        }

        // Process ticket tags if it's a ticket_tag message
        let processedContent = content;
        let processedMetadata = metadata;

        if (messageType === 'ticket_tag' || content.includes('#TK-')) {
            // Extract ticket numbers from content
            const ticketMatches = content.match(/#(TK-\d{8}-\d{3})/g);
            if (ticketMatches) {
                const ticketNumbers = ticketMatches.map(match => match.substring(1)); // Remove #
                
                // Verify tickets exist
                const tickets = await prisma.ticket.findMany({
                    where: {
                        ticketNumber: { in: ticketNumbers }
                    },
                    select: {
                        id: true,
                        ticketNumber: true,
                        title: true,
                        status: true,
                        priority: true
                    }
                });

                processedMetadata = JSON.stringify({
                    tickets: tickets,
                    originalMetadata: metadata
                });

                // Replace ticket numbers with clickable links in content
                processedContent = content.replace(/#(TK-\d{8}-\d{3})/g, (match, ticketNumber) => {
                    const ticket = tickets.find(t => t.ticketNumber === ticketNumber);
                    return ticket ? `[${match}]` : match;
                });
            }
        }

        // Create message
        const message = await prisma.chatMessage.create({
            data: {
                chatRoomId: roomId,
                senderId,
                content: processedContent,
                messageType: messageType === 'text' && content.includes('#TK-') ? 'ticket_tag' : messageType,
                metadata: processedMetadata,
                replyToId
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                },
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        sender: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });

        // Update room last activity
        await prisma.chatRoom.update({
            where: { id: roomId },
            data: { lastActivity: new Date() }
        });

        // Broadcast message to all participants via SSE
        const participants = await prisma.chatParticipant.findMany({
            where: {
                chatRoomId: roomId,
                isActive: true
            },
            select: { userId: true }
        });

        participants.forEach(participant => {
            if (participant.userId !== senderId && sseConnections.has(participant.userId)) {
                const connection = sseConnections.get(participant.userId);
                const eventData = {
                    type: 'new_message',
                    data: message
                };
                connection.write(`data: ${JSON.stringify(eventData)}\n\n`);
            }
        });

        logger.info('Chat message sent', {
            messageId: message.id,
            roomId,
            senderId,
            messageType: message.messageType,
            participantsNotified: participants.length - 1
        });

        res.json({
            success: true,
            data: message,
            message: 'Message sent successfully'
        });

    } catch (error) {
        logger.error('Error sending chat message', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message'
        });
    }
});

// GET /api/agent-chat/users/:businessId/online - Get online users for chat
router.get('/users/:businessId/online', async (req, res) => {
    try {
        const { businessId } = req.params;

        const users = await prisma.user.findMany({
            where: {
                businessId,
                isActive: true,
                role: { in: ['admin', 'owner', 'agent', 'senior_agent', 'team_lead', 'supervisor'] }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                lastLogin: true
            }
        });

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        logger.error('Error fetching online users', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

// POST /api/agent-chat/messages/:messageId/react - Add reaction to message
router.post('/messages/:messageId/react', [
    body('userId').isString().trim().notEmpty(),
    body('emoji').isString().trim().notEmpty()
], async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId, emoji } = req.body;

        const reaction = await prisma.chatReaction.upsert({
            where: {
                messageId_userId_emoji: {
                    messageId,
                    userId,
                    emoji
                }
            },
            update: {
                createdAt: new Date()
            },
            create: {
                messageId,
                userId,
                emoji
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

        res.json({
            success: true,
            data: reaction,
            message: 'Reaction added'
        });

    } catch (error) {
        logger.error('Error adding reaction', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add reaction'
        });
    }
});

// POST /api/agent-chat/invite - Invite user to existing chat room
router.post('/invite', [
    body('roomId').isString().trim().notEmpty(),
    body('userId').isString().trim().notEmpty(),
    body('invitedBy').isString().trim().notEmpty()
], async (req, res) => {
    try {
        const { roomId, userId, invitedBy } = req.body;

        // Check if user is already a participant
        const existingParticipant = await prisma.chatParticipant.findFirst({
            where: {
                chatRoomId: roomId,
                userId: userId
            }
        });

        if (existingParticipant) {
            return res.status(400).json({
                success: false,
                error: 'User is already in this chat room'
            });
        }

        // Add user as participant
        const participant = await prisma.chatParticipant.create({
            data: {
                chatRoomId: roomId,
                userId: userId,
                role: 'member'
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        // Send system message about invitation
        await prisma.chatMessage.create({
            data: {
                chatRoomId: roomId,
                senderId: invitedBy,
                content: `${participant.user.firstName} ${participant.user.lastName} was invited to the chat`,
                messageType: 'system'
            }
        });

        // Update room last activity
        await prisma.chatRoom.update({
            where: { id: roomId },
            data: { lastActivity: new Date() }
        });

        res.json({
            success: true,
            data: participant,
            message: 'User invited successfully'
        });

    } catch (error) {
        logger.error('Error inviting user to chat', error);
        res.status(500).json({
            success: false,
            error: 'Failed to invite user'
        });
    }
});

// SSE endpoint for real-time chat updates
router.get('/events/:userId', async (req, res) => {
    const { userId } = req.params;
    
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Store connection
    sseConnections.set(userId, res);
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);
    
    logger.info('SSE connection established', { userId });

    // Handle connection close
    req.on('close', () => {
        sseConnections.delete(userId);
        logger.info('SSE connection closed', { userId });
    });

    req.on('aborted', () => {
        sseConnections.delete(userId);
        logger.info('SSE connection aborted', { userId });
    });
});

// POST /api/agent-chat/start-direct - Start or get direct chat with another user
router.post('/start-direct', [
    body('businessId').isString().trim().notEmpty(),
    body('userId1').isString().trim().notEmpty(),
    body('userId2').isString().trim().notEmpty()
], async (req, res) => {
    try {
        const { businessId, userId1, userId2 } = req.body;

        // Check if direct chat already exists
        const existingRoom = await prisma.chatRoom.findFirst({
            where: {
                businessId,
                type: 'direct',
                participants: {
                    every: {
                        userId: { in: [userId1, userId2] }
                    }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                }
            }
        });

        if (existingRoom && existingRoom.participants.length === 2) {
            return res.json({
                success: true,
                data: existingRoom,
                message: 'Existing chat found'
            });
        }

        // Create new direct chat
        const chatRoom = await prisma.chatRoom.create({
            data: {
                businessId,
                type: 'direct',
                createdBy: userId1,
                participants: {
                    create: [
                        { userId: userId1, role: 'member' },
                        { userId: userId2, role: 'member' }
                    ]
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                }
            }
        });

        // Notify participants via SSE
        [userId1, userId2].forEach(userId => {
            if (sseConnections.has(userId)) {
                const connection = sseConnections.get(userId);
                const eventData = {
                    type: 'new_chat_room',
                    data: chatRoom
                };
                connection.write(`data: ${JSON.stringify(eventData)}\n\n`);
            }
        });

        logger.info('Direct chat created', {
            roomId: chatRoom.id,
            participants: [userId1, userId2]
        });

        res.json({
            success: true,
            data: chatRoom,
            message: 'Direct chat created'
        });

    } catch (error) {
        logger.error('Error starting direct chat', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start direct chat'
        });
    }
});

// POST /api/agent-chat/typing - Send typing indicator
router.post('/typing', [
    body('roomId').isString().trim().notEmpty(),
    body('userId').isString().trim().notEmpty(),
    body('isTyping').isBoolean()
], async (req, res) => {
    try {
        const { roomId, userId, isTyping } = req.body;

        // Get room participants
        const participants = await prisma.chatParticipant.findMany({
            where: {
                chatRoomId: roomId,
                isActive: true
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

        // Get sender info
        const sender = participants.find(p => p.userId === userId);
        
        // Broadcast typing indicator to other participants
        participants.forEach(participant => {
            if (participant.userId !== userId && sseConnections.has(participant.userId)) {
                const connection = sseConnections.get(participant.userId);
                const eventData = {
                    type: 'typing_indicator',
                    data: {
                        roomId,
                        userId,
                        userName: sender ? `${sender.user.firstName} ${sender.user.lastName}` : 'Unknown',
                        isTyping
                    }
                };
                connection.write(`data: ${JSON.stringify(eventData)}\n\n`);
            }
        });

        res.json({
            success: true,
            message: 'Typing indicator sent'
        });

    } catch (error) {
        logger.error('Error sending typing indicator', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send typing indicator'
        });
    }
});

module.exports = router;