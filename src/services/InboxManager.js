const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class InboxManager {
    constructor() {
        this.activeFilters = new Map(); // Store active filters per user/session
    }

    // Get conversations with filtering and pagination
    async getConversations(options = {}) {
        const {
            status,
            priority,
            channel,
            limit = 50,
            offset = 0,
            searchTerm,
            unreadOnly = false,
            assignedTo,
            startDate,
            endDate,
            sortBy = 'lastMessageAt',
            sortOrder = 'desc'
        } = options;

        try {
            const whereClause = {};
            
            // Apply filters
            if (status) whereClause.status = status;
            if (priority) whereClause.priority = priority;
            if (channel) whereClause.channel = channel;
            if (assignedTo) whereClause.assignedTo = assignedTo;
            
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) whereClause.createdAt.gte = new Date(startDate);
                if (endDate) whereClause.createdAt.lte = new Date(endDate);
            }

            // Search functionality
            if (searchTerm) {
                whereClause.OR = [
                    { customerName: { contains: searchTerm, mode: 'insensitive' } },
                    { customerId: { contains: searchTerm, mode: 'insensitive' } },
                    { 
                        messages: {
                            some: {
                                content: { contains: searchTerm, mode: 'insensitive' }
                            }
                        }
                    }
                ];
            }

            // Unread filter
            if (unreadOnly) {
                whereClause.messages = {
                    some: {
                        isRead: false,
                        sender: 'CUSTOMER'
                    }
                };
            }

            const conversations = await prisma.conversation.findMany({
                where: whereClause,
                include: {
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1, // Get only the latest message for preview
                        select: {
                            id: true,
                            content: true,
                            sender: true,
                            createdAt: true,
                            isRead: true,
                            messageType: true
                        }
                    },
                    _count: {
                        select: { 
                            messages: {
                                where: {
                                    isRead: false,
                                    sender: 'CUSTOMER'
                                }
                            }
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                take: parseInt(limit),
                skip: parseInt(offset)
            });

            const totalCount = await prisma.conversation.count({ where: whereClause });

            // Transform data for inbox display
            const inboxConversations = conversations.map(conv => ({
                id: conv.id,
                customerId: conv.customerId,
                customerName: conv.customerName,
                customerEmail: conv.customerEmail,
                customerPhone: conv.customerPhone,
                channel: conv.channel,
                status: conv.status,
                priority: conv.priority,
                sentiment: conv.sentiment,
                intent: conv.intent,
                topic: conv.topic,
                assignedTo: conv.assignedTo,
                tags: conv.tags,
                createdAt: conv.createdAt,
                updatedAt: conv.updatedAt,
                lastMessageAt: conv.lastMessageAt,
                lastMessage: conv.messages[0] || null,
                unreadCount: conv._count.messages,
                hasUnread: conv._count.messages > 0
            }));

            return {
                conversations: inboxConversations,
                totalCount,
                hasMore: (parseInt(offset) + conversations.length) < totalCount,
                filters: {
                    status,
                    priority,
                    channel,
                    unreadOnly,
                    assignedTo
                }
            };

        } catch (error) {
            logger.error('Error fetching inbox conversations', error);
            throw error;
        }
    }

    // Get conversation details with full message history
    async getConversationDetails(conversationId, options = {}) {
        const { limit = 100, offset = 0, markAsRead = true } = options;

        try {
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' },
                        take: parseInt(limit),
                        skip: parseInt(offset),
                        include: {
                            replies: {
                                orderBy: { createdAt: 'asc' }
                            }
                        }
                    },
                    aiResponses: {
                        orderBy: { createdAt: 'desc' },
                        take: 10 // Latest AI responses for context
                    }
                }
            });

            if (!conversation) {
                throw new Error('Conversation not found');
            }

            // Mark customer messages as read if requested
            if (markAsRead) {
                await this.markMessagesAsRead(conversationId, 'CUSTOMER');
            }

            return {
                conversation,
                messageCount: conversation.messages.length
            };

        } catch (error) {
            logger.error('Error fetching conversation details', error);
            throw error;
        }
    }

    // Mark messages as read
    async markMessagesAsRead(conversationId, senderType = null) {
        try {
            const updateData = { isRead: true };
            const whereClause = { conversationId };
            
            if (senderType) {
                whereClause.sender = senderType;
            }

            const result = await prisma.message.updateMany({
                where: whereClause,
                data: updateData
            });

            logger.info('Messages marked as read', {
                conversationId,
                senderType,
                updatedCount: result.count
            });

            return result.count;

        } catch (error) {
            logger.error('Error marking messages as read', error);
            throw error;
        }
    }

    // Assign conversation to agent
    async assignConversation(conversationId, assignedTo, assignedBy = null) {
        try {
            const conversation = await prisma.conversation.update({
                where: { id: conversationId },
                data: { 
                    assignedTo,
                    updatedAt: new Date()
                }
            });

            // Log assignment
            await this.addSystemMessage(conversationId, 
                `Conversation assigned to ${assignedTo}${assignedBy ? ` by ${assignedBy}` : ''}`
            );

            logger.info('Conversation assigned', {
                conversationId,
                assignedTo,
                assignedBy
            });

            return conversation;

        } catch (error) {
            logger.error('Error assigning conversation', error);
            throw error;
        }
    }

    // Update conversation status
    async updateConversationStatus(conversationId, status, updatedBy = null) {
        try {
            const conversation = await prisma.conversation.update({
                where: { id: conversationId },
                data: { 
                    status,
                    updatedAt: new Date()
                }
            });

            // Log status change
            await this.addSystemMessage(conversationId, 
                `Conversation status changed to ${status}${updatedBy ? ` by ${updatedBy}` : ''}`
            );

            logger.info('Conversation status updated', {
                conversationId,
                status,
                updatedBy
            });

            return conversation;

        } catch (error) {
            logger.error('Error updating conversation status', error);
            throw error;
        }
    }

    // Update conversation priority
    async updateConversationPriority(conversationId, priority, updatedBy = null) {
        try {
            const conversation = await prisma.conversation.update({
                where: { id: conversationId },
                data: { 
                    priority,
                    updatedAt: new Date()
                }
            });

            // Log priority change
            await this.addSystemMessage(conversationId, 
                `Conversation priority changed to ${priority}${updatedBy ? ` by ${updatedBy}` : ''}`
            );

            logger.info('Conversation priority updated', {
                conversationId,
                priority,
                updatedBy
            });

            return conversation;

        } catch (error) {
            logger.error('Error updating conversation priority', error);
            throw error;
        }
    }

    // Add tags to conversation
    async addConversationTags(conversationId, tags) {
        try {
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                select: { tags: true }
            });

            if (!conversation) {
                throw new Error('Conversation not found');
            }

            const newTags = [...new Set([...conversation.tags, ...tags])];

            const updatedConversation = await prisma.conversation.update({
                where: { id: conversationId },
                data: { tags: newTags }
            });

            return updatedConversation;

        } catch (error) {
            logger.error('Error adding conversation tags', error);
            throw error;
        }
    }

    // Add system message
    async addSystemMessage(conversationId, content) {
        try {
            const message = await prisma.message.create({
                data: {
                    conversationId,
                    content,
                    sender: 'SYSTEM',
                    senderName: 'System',
                    channel: 'WEB_CHAT',
                    messageType: 'SYSTEM',
                    isRead: true
                }
            });

            return message;

        } catch (error) {
            logger.error('Error adding system message', error);
            throw error;
        }
    }

    // Get inbox statistics
    async getInboxStats(filters = {}) {
        try {
            const { assignedTo, channel, startDate, endDate } = filters;
            
            const whereClause = {};
            if (assignedTo) whereClause.assignedTo = assignedTo;
            if (channel) whereClause.channel = channel;
            
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) whereClause.createdAt.gte = new Date(startDate);
                if (endDate) whereClause.createdAt.lte = new Date(endDate);
            }

            const [
                totalConversations,
                activeConversations,
                escalatedConversations,
                resolvedConversations,
                unreadMessages,
                avgResponseTime
            ] = await Promise.all([
                prisma.conversation.count({ where: whereClause }),
                prisma.conversation.count({ where: { ...whereClause, status: 'ACTIVE' } }),
                prisma.conversation.count({ where: { ...whereClause, status: 'ESCALATED' } }),
                prisma.conversation.count({ where: { ...whereClause, status: 'RESOLVED' } }),
                this.getUnreadMessageCount(whereClause),
                this.getAverageResponseTime(whereClause)
            ]);

            // Channel distribution
            const channelStats = await prisma.conversation.groupBy({
                by: ['channel'],
                where: whereClause,
                _count: true
            });

            // Priority distribution
            const priorityStats = await prisma.conversation.groupBy({
                by: ['priority'],
                where: whereClause,
                _count: true
            });

            return {
                totalConversations,
                activeConversations,
                escalatedConversations,
                resolvedConversations,
                unreadMessages,
                avgResponseTime,
                channelDistribution: channelStats.map(stat => ({
                    channel: stat.channel,
                    count: stat._count
                })),
                priorityDistribution: priorityStats.map(stat => ({
                    priority: stat.priority,
                    count: stat._count
                }))
            };

        } catch (error) {
            logger.error('Error fetching inbox stats', error);
            throw error;
        }
    }

    // Helper method to get unread message count
    async getUnreadMessageCount(conversationFilters = {}) {
        try {
            const count = await prisma.message.count({
                where: {
                    isRead: false,
                    sender: 'CUSTOMER',
                    conversation: conversationFilters
                }
            });

            return count;
        } catch (error) {
            logger.error('Error getting unread message count', error);
            return 0;
        }
    }

    // Helper method to calculate average response time
    async getAverageResponseTime(conversationFilters = {}) {
        try {
            // This is a simplified calculation
            // In a real implementation, you'd track response times more precisely
            const conversations = await prisma.conversation.findMany({
                where: conversationFilters,
                select: {
                    createdAt: true,
                    updatedAt: true,
                    status: true
                }
            });

            if (conversations.length === 0) return 0;

            const totalTime = conversations.reduce((sum, conv) => {
                if (conv.status === 'RESOLVED') {
                    return sum + (new Date(conv.updatedAt) - new Date(conv.createdAt));
                }
                return sum;
            }, 0);

            const resolvedCount = conversations.filter(c => c.status === 'RESOLVED').length;
            
            return resolvedCount > 0 ? Math.round(totalTime / resolvedCount / (1000 * 60)) : 0; // in minutes

        } catch (error) {
            logger.error('Error calculating average response time', error);
            return 0;
        }
    }

    // Search conversations by content
    async searchConversations(searchTerm, options = {}) {
        const { limit = 20, offset = 0 } = options;

        try {
            const conversations = await prisma.conversation.findMany({
                where: {
                    OR: [
                        { customerName: { contains: searchTerm, mode: 'insensitive' } },
                        { customerId: { contains: searchTerm, mode: 'insensitive' } },
                        { customerEmail: { contains: searchTerm, mode: 'insensitive' } },
                        {
                            messages: {
                                some: {
                                    content: { contains: searchTerm, mode: 'insensitive' }
                                }
                            }
                        }
                    ]
                },
                include: {
                    messages: {
                        where: {
                            content: { contains: searchTerm, mode: 'insensitive' }
                        },
                        take: 3,
                        orderBy: { createdAt: 'desc' }
                    }
                },
                take: parseInt(limit),
                skip: parseInt(offset)
            });

            return conversations;

        } catch (error) {
            logger.error('Error searching conversations', error);
            throw error;
        }
    }
}

module.exports = InboxManager;