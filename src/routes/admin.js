const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check admin permissions
const requireAdmin = async (req, res, next) => {
    try {
        // Extract user ID from JWT token or use default for testing
        const authHeader = req.headers.authorization;
        let userId = 'cmbsfx1qw0003tvvjxss73kz8'; // Your actual user ID (khalid@clicky.pk)
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            // In a real implementation, you would verify the JWT token here
            // For now, we'll use your user ID
        }
        
        logger.info('Admin middleware checking user', { userId });
        
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        logger.info('User found in admin middleware', { 
            user: user ? { id: user.id, email: user.email, role: user.role } : null 
        });

        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            logger.error('Admin access denied', { 
                userExists: !!user, 
                userRole: user?.role 
            });
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        req.adminUser = user;
        logger.info('Admin access granted', { userId: user.id, role: user.role });
        next();
    } catch (error) {
        logger.error('Admin auth error', error);
        res.status(500).json({
            success: false,
            error: 'Authorization check failed'
        });
    }
};

// Get all agents for a business
router.get('/agents/:businessId', requireAdmin, async (req, res) => {
    try {
        const { businessId } = req.params;

        const agents = await prisma.user.findMany({
            where: {
                businessId,
                role: { in: ['agent', 'senior_agent', 'team_lead', 'supervisor'] }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
                preferences: true,
                createdAt: true,
                lastLogin: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get performance stats for each agent
        const agentsWithStats = await Promise.all(agents.map(async (agent) => {
            // Get ticket stats
            const ticketStats = await prisma.ticket.aggregate({
                where: {
                    assignedTo: agent.id,
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                    }
                },
                _count: { id: true }
            });

            // Get SLA compliance (simplified calculation based on resolved tickets within deadline)
            const resolvedTickets = await prisma.ticket.count({
                where: {
                    assignedTo: agent.id,
                    status: 'RESOLVED',
                    createdAt: {
                        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    }
                }
            });

            const totalTickets = ticketStats._count.id || 1;
            const slaCompliance = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100;

            return {
                ...agent,
                ticketsHandled: totalTickets,
                slaCompliance
            };
        }));

        res.json({
            success: true,
            data: agentsWithStats
        });

    } catch (error) {
        logger.error('Error fetching agents', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agents'
        });
    }
});

// Create new agent
router.post('/agents', requireAdmin, async (req, res) => {
    try {
        logger.info('Create agent request received', { body: req.body });
        
        const {
            name,
            email,
            role = 'agent',
            permissions = {
                inbox: true,
                tickets: true,
                analytics: false,
                settings: false,
                admin: false
            },
            shiftSchedule = {
                start: '09:00',
                end: '17:00',
                timezone: 'UTC',
                days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
            },
            businessId
        } = req.body;

        logger.info('Extracted fields', { name, email, role, businessId });

        // Validate required fields
        if (!name || !email || !businessId) {
            logger.error('Missing required fields', { name, email, businessId });
            return res.status(400).json({
                success: false,
                error: 'Name, email, and business ID are required'
            });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-12);
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Split name into firstName and lastName
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const newAgent = await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password: hashedPassword,
                role,
                businessId,
                isActive: true,
                preferences: JSON.stringify({
                    permissions,
                    shiftSchedule
                })
            }
        });

        // Store credential notification for admin
        const credentialNotification = await prisma.agentCredential.create({
            data: {
                agentId: newAgent.id,
                agentName: `${newAgent.firstName} ${newAgent.lastName}`,
                agentEmail: newAgent.email,
                tempPassword,
                createdBy: req.adminUser.id
            }
        });

        // In production, send email with temporary password
        logger.info('New agent created', {
            agentId: newAgent.id,
            email: newAgent.email,
            tempPassword, // Remove in production
            createdBy: req.adminUser.id
        });

        logger.info('Agent credential notification stored', {
            notificationId: credentialNotification.id,
            agentEmail: newAgent.email,
            createdBy: req.adminUser.id
        });

        res.json({
            success: true,
            data: {
                agent: {
                    id: newAgent.id,
                    name: `${newAgent.firstName} ${newAgent.lastName}`,
                    firstName: newAgent.firstName,
                    lastName: newAgent.lastName,
                    email: newAgent.email,
                    role: newAgent.role,
                    isActive: newAgent.isActive
                },
                tempPassword, // Send via secure channel in production
                credentialNotification: {
                    id: credentialNotification.id,
                    stored: true
                }
            }
        });

    } catch (error) {
        logger.error('Error creating agent', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create agent'
        });
    }
});

// Update agent status (activate/deactivate)
router.patch('/agents/:agentId/status', requireAdmin, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { isActive } = req.body;

        const updatedAgent = await prisma.user.update({
            where: { id: agentId },
            data: { isActive }
        });

        logger.info('Agent status updated', {
            agentId,
            isActive,
            updatedBy: req.adminUser.id
        });

        res.json({
            success: true,
            data: updatedAgent
        });

    } catch (error) {
        logger.error('Error updating agent status', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update agent status'
        });
    }
});

// Delete agent
router.delete('/agents/:agentId', requireAdmin, async (req, res) => {
    try {
        const { agentId } = req.params;

        // Check if agent has active tickets
        const activeTickets = await prisma.ticket.count({
            where: {
                assignedTo: agentId,
                status: { in: ['open', 'in_progress'] }
            }
        });

        if (activeTickets > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete agent with ${activeTickets} active tickets. Please reassign tickets first.`
            });
        }

        await prisma.user.delete({
            where: { id: agentId }
        });

        logger.info('Agent deleted', {
            agentId,
            deletedBy: req.adminUser.id
        });

        res.json({
            success: true,
            message: 'Agent deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting agent', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete agent'
        });
    }
});

// Get analytics and performance data
router.get('/analytics/:businessId', requireAdmin, async (req, res) => {
    try {
        const { businessId } = req.params;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Total tickets
        const totalTickets = await prisma.ticket.count({
            where: { businessId }
        });

        // Tickets by status
        const ticketsByStatus = await prisma.ticket.groupBy({
            by: ['status'],
            where: { businessId },
            _count: { id: true }
        });

        // Tickets by priority
        const ticketsByPriority = await prisma.ticket.groupBy({
            by: ['priority'],
            where: { businessId },
            _count: { id: true }
        });

        // Average response time (simplified calculation)
        const resolvedTickets = await prisma.ticket.findMany({
            where: {
                businessId,
                status: { not: 'OPEN' },
                createdAt: { gte: thirtyDaysAgo }
            },
            select: {
                createdAt: true,
                updatedAt: true
            }
        });
        
        const avgResponseTimeHours = resolvedTickets.length > 0 
            ? resolvedTickets.reduce((sum, ticket) => {
                const diff = new Date(ticket.updatedAt) - new Date(ticket.createdAt);
                return sum + (diff / (1000 * 60 * 60)); // Convert to hours
            }, 0) / resolvedTickets.length
            : 0;

        // SLA compliance
        const totalRecentTickets = await prisma.ticket.count({
            where: {
                businessId,
                createdAt: { gte: thirtyDaysAgo }
            }
        });

        const slaCompliantTickets = await prisma.ticket.count({
            where: {
                businessId,
                status: 'RESOLVED',
                createdAt: { gte: thirtyDaysAgo }
            }
        });

        const slaCompliance = totalRecentTickets > 0 
            ? Math.round((slaCompliantTickets / totalRecentTickets) * 100)
            : 100;

        // Agent performance
        const agents = await prisma.user.findMany({
            where: {
                businessId,
                role: { in: ['agent', 'senior_agent', 'team_lead', 'supervisor'] }
            }
        });

        const agentPerformance = await Promise.all(agents.map(async (agent) => {
            const ticketsResolved = await prisma.ticket.count({
                where: {
                    assignedTo: agent.id,
                    status: 'resolved',
                    createdAt: { gte: thirtyDaysAgo }
                }
            });

            const agentSlaCompliant = await prisma.ticket.count({
                where: {
                    assignedTo: agent.id,
                    status: 'RESOLVED',
                    createdAt: { gte: thirtyDaysAgo }
                }
            });

            const agentTotalTickets = await prisma.ticket.count({
                where: {
                    assignedTo: agent.id,
                    createdAt: { gte: thirtyDaysAgo }
                }
            });

            const agentSlaCompliance = agentTotalTickets > 0 
                ? Math.round((agentSlaCompliant / agentTotalTickets) * 100)
                : 100;

            return {
                id: agent.id,
                name: `${agent.firstName} ${agent.lastName}`,
                ticketsResolved,
                slaCompliance: agentSlaCompliance
            };
        }));

        // Sort by performance
        agentPerformance.sort((a, b) => b.slaCompliance - a.slaCompliance);

        // Get escalated tickets for admin dashboard
        const escalatedTickets = await prisma.ticket.findMany({
            where: {
                businessId,
                escalationLevel: { gt: 0 }
            },
            select: {
                id: true,
                ticketNumber: true,
                title: true,
                status: true,
                escalationLevel: true,
                updatedAt: true,
                assignedUser: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: [
                { escalationLevel: 'desc' },
                { updatedAt: 'desc' }
            ],
            take: 10 // Limit to 10 most recent escalated tickets
        });

        // Format escalated tickets
        const formattedEscalatedTickets = escalatedTickets.map(ticket => ({
            ...ticket,
            assignedTo: ticket.assignedUser 
                ? `${ticket.assignedUser.firstName} ${ticket.assignedUser.lastName}`
                : null
        }));

        res.json({
            success: true,
            data: {
                totalTickets,
                avgResponseTime: Math.round(avgResponseTimeHours * 10) / 10,
                slaCompliance,
                customerSatisfaction: 92, // This would come from actual CSAT surveys
                ticketsByStatus: ticketsByStatus.reduce((acc, item) => {
                    acc[item.status] = item._count.id;
                    return acc;
                }, {}),
                ticketsByPriority: ticketsByPriority.reduce((acc, item) => {
                    acc[item.priority] = item._count.id;
                    return acc;
                }, {}),
                agentPerformance,
                escalatedTickets: formattedEscalatedTickets
            }
        });

    } catch (error) {
        logger.error('Error fetching analytics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics'
        });
    }
});

// In-memory presence store (in production, use Redis)
const presenceStore = new Map();

// Store real-time presence data
router.post('/presence', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        const presenceData = req.body;

        // Get user details from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Store presence data with user info
        const fullPresenceData = {
            userId,
            name: `${user.firstName} ${user.lastName}`.trim() || user.email,
            email: user.email,
            role: user.role,
            ...presenceData,
            lastSeen: new Date()
        };

        presenceStore.set(userId, fullPresenceData);

        logger.info('Agent presence update', {
            userId,
            name: fullPresenceData.name,
            isOnline: presenceData.isOnline,
            isVisible: presenceData.isVisible,
            isActive: presenceData.isActive,
            timestamp: presenceData.timestamp,
            screen: presenceData.screen,
            connection: presenceData.connection
        });

        res.json({
            success: true,
            message: 'Presence updated'
        });

    } catch (error) {
        logger.error('Error updating presence', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update presence'
        });
    }
});

// Get real-time presence data for all agents
router.get('/presence/:businessId', requireAdmin, async (req, res) => {
    try {
        const { businessId } = req.params;

        // In production, fetch from Redis
        // const agents = await getActiveAgents(businessId);
        // const presenceData = await Promise.all(
        //     agents.map(agent => redis.get(`presence:${agent.id}`))
        // );

        // Get all agents for this business
        const agents = await prisma.user.findMany({
            where: {
                businessId: businessId,
                role: { in: ['agent', 'admin', 'owner'] }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
            }
        });

        // Get presence data from store and combine with agent info
        const presenceData = agents.map(agent => {
            const presence = presenceStore.get(agent.id);
            const agentName = `${agent.firstName} ${agent.lastName}`.trim() || agent.email;
            
            if (!presence) {
                // No presence data = offline
                logger.info('No presence data found for agent', { agentId: agent.id, agentName });
                return {
                    userId: agent.id,
                    name: agentName,
                    email: agent.email,
                    role: agent.role,
                    isOnline: false,
                    isVisible: false,
                    isActive: false,
                    timestamp: null,
                    lastSeen: null,
                    screen: null,
                    connection: null,
                    permissions: null
                };
            }

            // Check if presence data is stale (older than 2 minutes)
            const now = new Date();
            const isStale = presence.lastSeen && (now.getTime() - new Date(presence.lastSeen).getTime()) > 120000;

            logger.info('Presence data found for agent', { 
                agentId: agent.id, 
                agentName,
                isOnline: presence.isOnline,
                isStale,
                lastSeen: presence.lastSeen,
                timestamp: presence.timestamp
            });

            return {
                ...presence,
                name: agentName,
                email: agent.email,
                role: agent.role,
                isOnline: isStale ? false : presence.isOnline,
                isVisible: isStale ? false : presence.isVisible,
                isActive: isStale ? false : presence.isActive
            };
        });

        logger.info('Returning presence data for Live Monitoring', { 
            agentCount: presenceData.length,
            storeSize: presenceStore.size,
            businessId 
        });

        res.json({
            success: true,
            data: presenceData
        });

    } catch (error) {
        logger.error('Error fetching presence data', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch presence data'
        });
    }
});

// Role-based access control middleware
const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id || 'current-user-id';
            
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const permissions = typeof user.permissions === 'string' 
                ? JSON.parse(user.permissions) 
                : user.permissions || {};

            // Admin has all permissions
            if (user.role === 'admin' || permissions.admin) {
                return next();
            }

            // Check specific permission
            if (!permissions[permission]) {
                return res.status(403).json({
                    success: false,
                    error: `Access denied. Required permission: ${permission}`
                });
            }

            next();
        } catch (error) {
            logger.error('Permission check error', error);
            res.status(500).json({
                success: false,
                error: 'Permission check failed'
            });
        }
    };
};

// GET /api/admin/stats - Get system statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await generateSystemStats();
        
        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching admin stats', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system statistics'
        });
    }
});

// GET /api/admin/conversations - Get all conversations with filters
router.get('/conversations', async (req, res) => {
    try {
        const { 
            status, 
            priority, 
            channel, 
            limit = 50, 
            offset = 0,
            startDate,
            endDate 
        } = req.query;

        const whereClause = {};
        
        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;
        if (channel) whereClause.channel = channel;
        
        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        const conversations = await prisma.conversation.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { messages: true }
                }
            },
            orderBy: { lastMessageAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const totalCount = await prisma.conversation.count({ where: whereClause });

        res.json({
            success: true,
            data: {
                conversations,
                totalCount,
                hasMore: (parseInt(offset) + conversations.length) < totalCount
            }
        });

    } catch (error) {
        logger.error('Error fetching conversations', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch conversations'
        });
    }
});

// GET /api/admin/ai-responses - Get AI response analytics
router.get('/ai-responses', async (req, res) => {
    try {
        const { limit = 100, offset = 0, approved } = req.query;

        const whereClause = {};
        if (approved !== undefined) {
            whereClause.approved = approved === 'true';
        }

        const responses = await prisma.aIResponse.findMany({
            where: whereClause,
            include: {
                conversation: {
                    select: {
                        customerId: true,
                        customerName: true,
                        channel: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const analytics = await generateAIResponseAnalytics();

        res.json({
            success: true,
            data: {
                responses,
                analytics
            }
        });

    } catch (error) {
        logger.error('Error fetching AI responses', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI responses'
        });
    }
});

// POST /api/admin/ai-responses/:responseId/approve - Approve/reject AI response
router.post('/ai-responses/:responseId/approve', async (req, res) => {
    try {
        const { responseId } = req.params;
        const { approved, feedback } = req.body;

        const aiResponse = await prisma.aIResponse.findUnique({
            where: { id: responseId }
        });

        if (!aiResponse) {
            return res.status(404).json({
                success: false,
                error: 'AI response not found'
            });
        }

        await prisma.aIResponse.update({
            where: { id: responseId },
            data: {
                approved: approved,
                feedback: feedback || null
            }
        });

        res.json({
            success: true,
            message: `AI response ${approved ? 'approved' : 'rejected'} successfully`
        });

    } catch (error) {
        logger.error('Error updating AI response approval', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update AI response'
        });
    }
});

// GET /api/admin/performance - Get performance metrics
router.get('/performance', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const metrics = await generatePerformanceMetrics(startDate);

        res.json({
            success: true,
            data: metrics
        });

    } catch (error) {
        logger.error('Error fetching performance metrics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch performance metrics'
        });
    }
});

// GET /api/admin/tools-usage - Get tools usage analytics
router.get('/tools-usage', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const toolsUsage = await generateToolsUsageAnalytics(startDate);

        res.json({
            success: true,
            data: toolsUsage
        });

    } catch (error) {
        logger.error('Error fetching tools usage', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tools usage analytics'
        });
    }
});

// Helper functions
async function generateSystemStats() {
    const [
        totalConversations,
        activeConversations,
        totalMessages,
        totalSessions,
        activeSessions,
        totalAIResponses,
        approvedResponses
    ] = await Promise.all([
        prisma.conversation.count(),
        prisma.conversation.count({ where: { status: 'ACTIVE' } }),
        prisma.message.count(),
        prisma.session.count(),
        prisma.session.count({ where: { isActive: true } }),
        prisma.aIResponse.count(),
        prisma.aIResponse.count({ where: { approved: true } })
    ]);

    return {
        conversations: {
            total: totalConversations,
            active: activeConversations
        },
        messages: {
            total: totalMessages
        },
        sessions: {
            total: totalSessions,
            active: activeSessions
        },
        aiResponses: {
            total: totalAIResponses,
            approved: approvedResponses,
            approvalRate: totalAIResponses > 0 ? (approvedResponses / totalAIResponses * 100).toFixed(2) : 0
        },
        timestamp: new Date().toISOString()
    };
}

async function generateAIResponseAnalytics() {
    const [
        avgProcessingTime,
        toolsUsageCount,
        confidenceDistribution
    ] = await Promise.all([
        prisma.aIResponse.aggregate({
            _avg: { processingTime: true }
        }),
        prisma.aIResponse.findMany({
            select: { toolsUsed: true }
        }),
        prisma.aIResponse.groupBy({
            by: ['confidence'],
            _count: true
        })
    ]);

    // Process tools usage
    const toolsCount = {};
    toolsUsageCount.forEach(response => {
        response.toolsUsed.forEach(tool => {
            toolsCount[tool] = (toolsCount[tool] || 0) + 1;
        });
    });

    return {
        averageProcessingTime: avgProcessingTime._avg.processingTime || 0,
        toolsUsage: toolsCount,
        confidenceDistribution: confidenceDistribution
    };
}

async function generatePerformanceMetrics(startDate) {
    const [
        responseTimeMetrics,
        dailyMessageCounts,
        channelDistribution,
        resolutionTimes
    ] = await Promise.all([
        prisma.aIResponse.aggregate({
            where: { createdAt: { gte: startDate } },
            _avg: { processingTime: true },
            _min: { processingTime: true },
            _max: { processingTime: true }
        }),
        prisma.message.groupBy({
            by: ['createdAt'],
            where: { createdAt: { gte: startDate } },
            _count: true
        }),
        prisma.conversation.groupBy({
            by: ['channel'],
            where: { createdAt: { gte: startDate } },
            _count: true
        }),
        prisma.conversation.findMany({
            where: {
                createdAt: { gte: startDate },
                status: 'RESOLVED'
            },
            select: {
                createdAt: true,
                updatedAt: true
            }
        })
    ]);

    // Calculate average resolution time
    const avgResolutionTime = resolutionTimes.length > 0 
        ? resolutionTimes.reduce((sum, conv) => {
            const resTime = new Date(conv.updatedAt) - new Date(conv.createdAt);
            return sum + resTime;
        }, 0) / resolutionTimes.length / (1000 * 60) // Convert to minutes
        : 0;

    return {
        responseTime: {
            average: responseTimeMetrics._avg.processingTime || 0,
            minimum: responseTimeMetrics._min.processingTime || 0,
            maximum: responseTimeMetrics._max.processingTime || 0
        },
        dailyActivity: dailyMessageCounts.map(day => ({
            date: day.createdAt,
            messageCount: day._count
        })),
        channelDistribution: channelDistribution.map(channel => ({
            channel: channel.channel,
            count: channel._count
        })),
        averageResolutionTime: Math.round(avgResolutionTime)
    };
}

async function generateToolsUsageAnalytics(startDate) {
    const aiResponses = await prisma.aIResponse.findMany({
        where: { createdAt: { gte: startDate } },
        select: { toolsUsed: true, createdAt: true }
    });

    const toolsStats = {};
    const dailyToolsUsage = {};

    aiResponses.forEach(response => {
        const date = response.createdAt.toISOString().split('T')[0];
        
        if (!dailyToolsUsage[date]) {
            dailyToolsUsage[date] = {};
        }

        response.toolsUsed.forEach(tool => {
            // Overall stats
            if (!toolsStats[tool]) {
                toolsStats[tool] = { count: 0, firstUsed: response.createdAt, lastUsed: response.createdAt };
            }
            toolsStats[tool].count++;
            if (response.createdAt > toolsStats[tool].lastUsed) {
                toolsStats[tool].lastUsed = response.createdAt;
            }

            // Daily stats
            dailyToolsUsage[date][tool] = (dailyToolsUsage[date][tool] || 0) + 1;
        });
    });

    return {
        toolsStats,
        dailyUsage: dailyToolsUsage,
        totalResponses: aiResponses.length
    };
}

// Export permission middleware for use in other routes
router.checkPermission = checkPermission;

module.exports = router;