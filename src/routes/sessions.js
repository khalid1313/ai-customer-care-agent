const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const ContextManager = require('../services/ContextManager');

const router = express.Router();
const prisma = new PrismaClient();
const contextManager = new ContextManager();

// GET /api/sessions - Get all active sessions
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        
        const whereClause = {};
        if (status) {
            whereClause.isActive = status === 'active';
        }

        const sessions = await prisma.session.findMany({
            where: whereClause,
            orderBy: { lastActivity: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const totalCount = await prisma.session.count({ where: whereClause });

        res.json({
            success: true,
            data: {
                sessions: sessions.map(session => ({
                    id: session.id,
                    customerId: session.customerId,
                    customerName: session.customerName,
                    isActive: session.isActive,
                    lastActivity: session.lastActivity,
                    createdAt: session.createdAt,
                    summary: session.summary
                })),
                totalCount,
                hasMore: (parseInt(offset) + sessions.length) < totalCount
            }
        });

    } catch (error) {
        logger.error('Error fetching sessions', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sessions'
        });
    }
});

// GET /api/sessions/:sessionId - Get specific session details
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Get session summary from context manager
        const summary = await contextManager.getSummary(sessionId);

        res.json({
            success: true,
            data: {
                session: {
                    id: session.id,
                    customerId: session.customerId,
                    customerName: session.customerName,
                    isActive: session.isActive,
                    lastActivity: session.lastActivity,
                    createdAt: session.createdAt,
                    summary: session.summary,
                    context: session.context
                },
                analytics: summary
            }
        });

    } catch (error) {
        logger.error('Error fetching session details', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session details'
        });
    }
});

// POST /api/sessions - Create a new session
router.post('/', [
    body('customerId').isString().trim().notEmpty().withMessage('Customer ID is required'),
    body('customerName').optional().isString().trim(),
    body('customerEmail').optional().isEmail(),
    body('customerPhone').optional().isString().trim()
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

        const { customerId, customerName, customerEmail, customerPhone } = req.body;

        // Check if there's already an active session for this customer
        const existingSession = await prisma.session.findFirst({
            where: {
                customerId: customerId,
                isActive: true
            }
        });

        if (existingSession) {
            return res.json({
                success: true,
                data: {
                    sessionId: existingSession.id,
                    message: 'Returning existing active session'
                }
            });
        }

        // Create new session
        const sessionId = await contextManager.createSession(customerId, customerName);

        // Update session with additional customer info if provided
        if (customerEmail || customerPhone) {
            const context = await contextManager.getContext(sessionId);
            await contextManager.updateContext(sessionId, {
                ...context,
                customer_info: {
                    ...context.customer_info,
                    email: customerEmail,
                    phone: customerPhone
                }
            });
        }

        res.status(201).json({
            success: true,
            data: {
                sessionId: sessionId,
                message: 'New session created successfully'
            }
        });

    } catch (error) {
        logger.error('Error creating session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create session'
        });
    }
});

// PUT /api/sessions/:sessionId/close - Close a session
router.put('/:sessionId/close', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { reason } = req.body;

        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        if (!session.isActive) {
            return res.json({
                success: true,
                message: 'Session already closed'
            });
        }

        // Close session and save final state
        await contextManager.saveSession(sessionId, {
            close_reason: reason || 'Manual close',
            closed_at: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'Session closed successfully'
        });

    } catch (error) {
        logger.error('Error closing session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to close session'
        });
    }
});

// GET /api/sessions/:sessionId/context - Get session context
router.get('/:sessionId/context', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const context = await contextManager.getContext(sessionId);
        
        if (!context || Object.keys(context).length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session context not found'
            });
        }

        // Remove sensitive information
        const sanitizedContext = {
            current_topic: context.current_topic,
            previous_topic: context.previous_topic,
            mentioned_products: context.mentioned_products,
            conversation_flow: context.conversation_flow,
            context_switches: context.context_switches,
            session_start: context.session_start,
            last_activity: context.last_activity
        };

        res.json({
            success: true,
            data: {
                sessionId: sessionId,
                context: sanitizedContext
            }
        });

    } catch (error) {
        logger.error('Error fetching session context', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session context'
        });
    }
});

// GET /api/sessions/:sessionId/summary - Get session analytics summary
router.get('/:sessionId/summary', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const summary = await contextManager.getSummary(sessionId);
        
        if (!summary) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        logger.error('Error generating session summary', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate session summary'
        });
    }
});

// GET /api/sessions/customer/:customerId - Get all sessions for a customer
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const sessions = await prisma.session.findMany({
            where: { customerId: customerId },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const totalCount = await prisma.session.count({
            where: { customerId: customerId }
        });

        res.json({
            success: true,
            data: {
                customerId: customerId,
                sessions: sessions.map(session => ({
                    id: session.id,
                    isActive: session.isActive,
                    lastActivity: session.lastActivity,
                    createdAt: session.createdAt,
                    summary: session.summary
                })),
                totalCount,
                hasMore: (parseInt(offset) + sessions.length) < totalCount
            }
        });

    } catch (error) {
        logger.error('Error fetching customer sessions', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer sessions'
        });
    }
});

// DELETE /api/sessions/:sessionId - Delete a session (admin only)
router.delete('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Delete session from database
        await prisma.session.delete({
            where: { id: sessionId }
        });

        // Remove from memory cache if exists
        if (contextManager.sessions && contextManager.sessions.has(sessionId)) {
            contextManager.sessions.delete(sessionId);
        }

        logger.info('Session deleted', { sessionId });

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete session'
        });
    }
});

module.exports = router;