const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/tickets/by-number/:ticketNumber - Get ticket by number
router.get('/by-number/:ticketNumber', async (req, res) => {
  try {
    const { ticketNumber } = req.params
    const { businessId } = req.query
    
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Business ID is required' })
    }
    
    logger.info('Fetching ticket by number', { ticketNumber, businessId })
    
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber,
        businessId
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' })
    }
    
    res.json({ success: true, ticket })
  } catch (error) {
    logger.error('Error fetching ticket by number:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' })
  }
})

// GET /api/tickets/:businessId - Get all tickets for a business with filtering
router.get('/:businessId', [
    query('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED']),
    query('priority').optional().isIn(['URGENT', 'HIGH', 'NORMAL', 'LOW']),
    query('category').optional().isString(),
    query('slaStatus').optional().isIn(['overdue', 'urgent', 'soon', 'on_time']),
    query('escalation').optional().isIn(['escalated', 'not_escalated']),
    query('search').optional().isString(),
    query('assignedToId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 500 }),
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

        const { businessId } = req.params;
        const {
            status,
            priority,
            category,
            slaStatus,
            escalation,
            search,
            assignedToId,
            limit = 100,
            offset = 0
        } = req.query;

        logger.info('Fetching tickets for business', { 
            businessId, 
            filters: { status, priority, category, slaStatus, escalation, search, assignedToId } 
        });

        // Build where clause for filtering
        const whereClause = {
            businessId: businessId
        };

        if (status && status !== 'all') {
            whereClause.status = status.toUpperCase();
        }

        if (priority && priority !== 'all') {
            whereClause.priority = priority.toUpperCase();
        }

        if (category && category !== 'all') {
            whereClause.category = category;
        }

        if (assignedToId) {
            whereClause.assignedTo = assignedToId;
        }

        if (escalation === 'escalated') {
            whereClause.escalationLevel = { gt: 0 };
        } else if (escalation === 'not_escalated') {
            whereClause.AND = whereClause.AND || [];
            whereClause.AND.push({
                OR: [
                    { escalationLevel: null },
                    { escalationLevel: 0 }
                ]
            });
        }

        if (search) {
            whereClause.AND = whereClause.AND || [];
            whereClause.AND.push({
                OR: [
                    { ticketNumber: { contains: search } },
                    { title: { contains: search } },
                    { description: { contains: search } },
                    { customerName: { contains: search } },
                    { customerEmail: { contains: search } }
                ]
            });
        }

        // Fetch tickets with related data
        const tickets = await prisma.ticket.findMany({
            where: whereClause,
            include: {
                assignedUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: [
                { priority: 'desc' }, // Urgent first
                { createdAt: 'desc' }  // Then newest first
            ],
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        // Format tickets with SLA status calculation
        const formattedTickets = tickets.map(ticket => {
            const slaDeadline = ticket.slaDeadline ? new Date(ticket.slaDeadline) : null;
            const now = new Date();
            let calculatedSlaStatus = 'on_time';
            let timeRemaining = null;

            if (slaDeadline) {
                const timeDiff = slaDeadline.getTime() - now.getTime();
                const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
                
                if (timeDiff < 0) {
                    calculatedSlaStatus = 'overdue';
                    timeRemaining = `${Math.abs(hoursRemaining)}h overdue`;
                } else if (hoursRemaining < 2) {
                    calculatedSlaStatus = 'urgent';
                    timeRemaining = `${hoursRemaining}h remaining`;
                } else if (hoursRemaining < 24) {
                    calculatedSlaStatus = 'soon';
                    timeRemaining = `${hoursRemaining}h remaining`;
                } else {
                    const daysRemaining = Math.floor(hoursRemaining / 24);
                    timeRemaining = `${daysRemaining}d remaining`;
                }
            }

            // Apply SLA status filter if specified
            if (slaStatus && slaStatus !== 'all' && calculatedSlaStatus !== slaStatus) {
                return null; // Will be filtered out
            }

            return {
                id: ticket.id,
                ticketNumber: ticket.ticketNumber,
                title: ticket.title,
                description: ticket.description,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                customerId: ticket.customerId,
                customerName: ticket.customerName,
                customerEmail: ticket.customerEmail,
                assignedTo: ticket.assignedUser ? 
                    `${ticket.assignedUser.firstName} ${ticket.assignedUser.lastName}` : 
                    null,
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                slaDeadline: ticket.slaDeadline,
                slaStatus: calculatedSlaStatus,
                timeRemaining,
                followUpCount: ticket.followUpCount,
                escalationLevel: ticket.escalationLevel,
                source: ticket.source,
                linkedToConversation: !!ticket.parentConversationId
            };
        }).filter(Boolean); // Remove null entries from SLA filtering

        logger.info('Tickets fetched successfully', {
            businessId,
            totalTickets: formattedTickets.length,
            filtersApplied: Object.keys(req.query).length
        });

        res.json({
            success: true,
            data: {
                tickets: formattedTickets,
                pagination: {
                    total: formattedTickets.length,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });

    } catch (error) {
        logger.error('Error fetching business tickets', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tickets'
        });
    }
});

// GET /api/tickets/:businessId/stats - Get ticket statistics for a business
router.get('/:businessId/stats', [
    query('assignedToId').optional().isString()
], async (req, res) => {
    try {
        const { businessId } = req.params;
        const { assignedToId } = req.query;

        logger.info('Fetching ticket statistics for business', { businessId, assignedToId });

        // Build where clause for filtering
        const whereClause = { businessId: businessId };
        if (assignedToId) {
            whereClause.assignedTo = assignedToId;
        }

        // Get counts by status
        const statusCounts = await prisma.ticket.groupBy({
            by: ['status'],
            where: whereClause,
            _count: true
        });

        // Get SLA statistics
        const allTickets = await prisma.ticket.findMany({
            where: whereClause,
            select: {
                status: true,
                slaDeadline: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // Calculate stats
        let stats = {
            total: allTickets.length,
            open: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
            overdue: 0,
            avgResponseTime: 0
        };

        // Count by status
        statusCounts.forEach(statusGroup => {
            const status = statusGroup.status.toLowerCase();
            const count = statusGroup._count;
            
            if (status === 'open') stats.open = count;
            else if (status === 'in_progress') stats.inProgress = count;
            else if (status === 'resolved') stats.resolved = count;
            else if (status === 'closed') stats.closed = count;
        });

        // Calculate overdue tickets and average response time
        const now = new Date();
        let totalResponseTime = 0;
        let resolvedTicketsCount = 0;

        allTickets.forEach(ticket => {
            // Count overdue tickets
            if (ticket.slaDeadline && new Date(ticket.slaDeadline) < now && 
                !['RESOLVED', 'CLOSED'].includes(ticket.status)) {
                stats.overdue++;
            }

            // Calculate average response time for resolved tickets
            if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
                const responseTime = (new Date(ticket.updatedAt) - new Date(ticket.createdAt)) / (1000 * 60 * 60); // hours
                totalResponseTime += responseTime;
                resolvedTicketsCount++;
            }
        });

        // Calculate average response time
        if (resolvedTicketsCount > 0) {
            stats.avgResponseTime = Math.round((totalResponseTime / resolvedTicketsCount) * 10) / 10; // Round to 1 decimal
        }

        logger.info('Ticket statistics calculated', {
            businessId,
            stats
        });

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching ticket statistics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ticket statistics'
        });
    }
});

// PUT /api/tickets/:ticketId/status - Update ticket status
router.put('/:ticketId/status', [
    body('status').isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED']).withMessage('Invalid status'),
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

        const { ticketId } = req.params;
        const { status, updatedBy } = req.body;

        logger.info('Updating ticket status', { ticketId, status, updatedBy });

        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { 
                status: status,
                updatedAt: new Date(),
                ...(status === 'RESOLVED' && { resolvedAt: new Date() })
            }
        });

        logger.info('Ticket status updated successfully', {
            ticketId,
            newStatus: status
        });

        res.json({
            success: true,
            data: ticket,
            message: `Ticket status updated to ${status}`
        });

    } catch (error) {
        logger.error('Error updating ticket status', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update ticket status'
        });
    }
});

// PUT /api/tickets/:ticketId/assign - Assign ticket to user
router.put('/:ticketId/assign', [
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

        const { ticketId } = req.params;
        const { assignedTo, assignedBy } = req.body;

        logger.info('Assigning ticket', { ticketId, assignedTo, assignedBy });

        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { 
                assignedTo: assignedTo,
                updatedAt: new Date()
            },
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

        logger.info('Ticket assigned successfully', {
            ticketId,
            assignedTo
        });

        res.json({
            success: true,
            data: ticket,
            message: `Ticket assigned to ${assignedTo}`
        });

    } catch (error) {
        logger.error('Error assigning ticket', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign ticket'
        });
    }
});

// PUT /api/tickets/:ticketId/escalate - Escalate ticket to higher level
router.put('/:ticketId/escalate', [
    body('escalationNote').isString().trim().notEmpty().withMessage('Escalation note is required'),
    body('escalatedBy').optional().isString().trim(),
    body('escalatedByName').optional().isString().trim()
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

        const { ticketId } = req.params;
        const { escalationNote, escalatedBy, escalatedByName } = req.body;

        logger.info('Escalating ticket', { ticketId, escalatedBy, escalatedByName });

        // First, get the current ticket to check escalation level
        const currentTicket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!currentTicket) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found'
            });
        }

        // Check if ticket is already escalated
        if (currentTicket.escalationLevel > 0 || currentTicket.status === 'ESCALATED') {
            return res.status(400).json({
                success: false,
                error: 'Ticket is already escalated to admin'
            });
        }

        const newEscalationLevel = 1;

        // Update the ticket with escalation level and set status to ESCALATED
        const updatedTicket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { 
                escalationLevel: newEscalationLevel,
                status: 'ESCALATED', // Set status to escalated for admin handling
                assignedTo: null, // Unassign from current agent
                updatedAt: new Date()
            },
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

        // Store escalation metadata for admin interface
        const escalationTimestamp = new Date().toISOString();
        const escalationHistoryNote = `ESCALATION by ${escalatedByName || 'Agent'}: ${escalationNote}`;
        
        // Try to store escalation details (will fail gracefully if fields don't exist)
        try {
            await prisma.ticket.update({
                where: { id: ticketId },
                data: {
                    escalationNote: escalationNote,
                    escalatedBy: escalatedBy,
                    escalatedByName: escalatedByName,
                    escalatedAt: escalationTimestamp
                }
            });
        } catch (error) {
            // If custom fields don't exist, store in description or log
            logger.info('Escalation metadata stored in logs (DB fields not available)', {
                ticketId,
                escalatedBy,
                escalatedByName,
                escalationNote,
                escalatedAt: escalationTimestamp
            });
        }
        
        logger.info('Ticket escalation history', {
            ticketId,
            escalationLevel: newEscalationLevel,
            escalatedBy,
            escalatedByName,
            note: escalationHistoryNote,
            timestamp: escalationTimestamp
        });

        logger.info('Ticket escalated successfully', {
            ticketId,
            previousLevel: currentLevel,
            newLevel: newEscalationLevel,
            escalatedBy
        });

        res.json({
            success: true,
            data: {
                ...updatedTicket,
                escalationLevel: newEscalationLevel,
                escalationNote: escalationNote
            },
            message: `Ticket escalated to level ${newEscalationLevel}`
        });

    } catch (error) {
        logger.error('Error escalating ticket', error);
        res.status(500).json({
            success: false,
            error: 'Failed to escalate ticket'
        });
    }
});

// PUT /api/tickets/:ticketId/complete-escalation - Complete escalation with admin response and reassignment
router.put('/:ticketId/complete-escalation', [
    body('adminResponse').isString().trim().notEmpty().withMessage('Admin response is required'),
    body('reassignTo').isString().trim().notEmpty().withMessage('Agent assignment is required'),
    body('adminId').optional().isString().trim(),
    body('adminName').optional().isString().trim()
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

        const { ticketId } = req.params;
        const { adminResponse, reassignTo, adminId, adminName } = req.body;

        logger.info('Completing escalation', { ticketId, reassignTo, adminId });

        // First, verify the ticket exists and is escalated
        const currentTicket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!currentTicket) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found'
            });
        }

        if (currentTicket.escalationLevel <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Ticket is not currently escalated'
            });
        }

        // Update the ticket with admin resolution and reassignment
        const updatedTicket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { 
                status: 'IN_PROGRESS',
                assignedTo: reassignTo,
                escalationLevel: 0, // Reset escalation level
                updatedAt: new Date()
            },
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

        // Try to store admin response (will fail gracefully if fields don't exist)
        try {
            await prisma.ticket.update({
                where: { id: ticketId },
                data: {
                    adminResponse: adminResponse,
                    adminResponseBy: adminId,
                    adminResponseByName: adminName,
                    adminResponseAt: new Date().toISOString(),
                    escalationResolvedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            // If custom fields don't exist, log the admin response
            logger.info('Admin response stored in logs (DB fields not available)', {
                ticketId,
                adminResponse,
                adminId,
                adminName,
                adminResponseAt: new Date().toISOString()
            });
        }

        logger.info('Escalation completed successfully', {
            ticketId,
            reassignedTo: reassignTo,
            resolvedBy: adminName || adminId,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: {
                ...updatedTicket,
                adminResponse,
                message: 'Escalation resolved and ticket reassigned'
            },
            message: `Escalation completed and ticket assigned to ${updatedTicket.assignedUser ? `${updatedTicket.assignedUser.firstName} ${updatedTicket.assignedUser.lastName}` : 'agent'}`
        });

    } catch (error) {
        logger.error('Error completing escalation', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete escalation'
        });
    }
});

module.exports = router;