const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Get assignment settings for a business
router.get('/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        
        let settings = await prisma.assignmentSettings.findUnique({
            where: { businessId }
        });
        
        // Create default settings if none exist
        if (!settings) {
            settings = await prisma.assignmentSettings.create({
                data: {
                    businessId,
                    method: 'manual',
                    categoryAssignments: JSON.stringify({}),
                    roundRobinIndex: 0
                }
            });
        }
        
        res.json({
            success: true,
            data: {
                method: settings.method,
                categoryAssignments: JSON.parse(settings.categoryAssignments || '{}'),
                roundRobinIndex: settings.roundRobinIndex
            }
        });
        
    } catch (error) {
        logger.error('Error fetching assignment settings', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignment settings'
        });
    }
});

// Update assignment settings for a business
router.put('/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const { method, categoryAssignments, roundRobinIndex } = req.body;
        
        const settings = await prisma.assignmentSettings.upsert({
            where: { businessId },
            update: {
                method,
                categoryAssignments: JSON.stringify(categoryAssignments || {}),
                roundRobinIndex: roundRobinIndex || 0
            },
            create: {
                businessId,
                method,
                categoryAssignments: JSON.stringify(categoryAssignments || {}),
                roundRobinIndex: roundRobinIndex || 0
            }
        });
        
        logger.info('Assignment settings updated', {
            businessId,
            method,
            categoryAssignments
        });
        
        res.json({
            success: true,
            data: {
                method: settings.method,
                categoryAssignments: JSON.parse(settings.categoryAssignments || '{}'),
                roundRobinIndex: settings.roundRobinIndex
            }
        });
        
    } catch (error) {
        logger.error('Error updating assignment settings', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update assignment settings'
        });
    }
});

// Auto-assign ticket based on settings
router.post('/auto-assign/:businessId', async (req, res) => {
    try {
        const { businessId } = req.params;
        const { ticketId, category } = req.body;
        
        // Get assignment settings
        const settings = await prisma.assignmentSettings.findUnique({
            where: { businessId }
        });
        
        if (!settings || settings.method === 'manual') {
            return res.json({
                success: true,
                assigned: false,
                message: 'Manual assignment mode - no auto-assignment performed'
            });
        }
        
        let assignedAgentId = null;
        
        if (settings.method === 'category_wise') {
            const categoryAssignments = JSON.parse(settings.categoryAssignments || '{}');
            assignedAgentId = categoryAssignments[category];
        } else if (settings.method === 'round_robin') {
            // Get active agents
            const activeAgents = await prisma.user.findMany({
                where: {
                    businessId,
                    role: { in: ['agent', 'senior_agent', 'team_lead', 'supervisor'] },
                    isActive: true
                },
                orderBy: { createdAt: 'asc' }
            });
            
            if (activeAgents.length > 0) {
                const currentIndex = settings.roundRobinIndex % activeAgents.length;
                assignedAgentId = activeAgents[currentIndex].id;
                
                // Update the round robin index for next assignment
                await prisma.assignmentSettings.update({
                    where: { businessId },
                    data: {
                        roundRobinIndex: (currentIndex + 1) % activeAgents.length
                    }
                });
            }
        }
        
        if (assignedAgentId) {
            // Assign the ticket
            await prisma.ticket.update({
                where: { id: ticketId },
                data: { assignedTo: assignedAgentId }
            });
            
            const assignedAgent = await prisma.user.findUnique({
                where: { id: assignedAgentId },
                select: { firstName: true, lastName: true, email: true }
            });
            
            logger.info('Ticket auto-assigned', {
                ticketId,
                assignedTo: assignedAgentId,
                method: settings.method,
                category
            });
            
            res.json({
                success: true,
                assigned: true,
                assignedTo: assignedAgentId,
                assignedAgent
            });
        } else {
            res.json({
                success: true,
                assigned: false,
                message: 'No suitable agent found for assignment'
            });
        }
        
    } catch (error) {
        logger.error('Error auto-assigning ticket', error);
        res.status(500).json({
            success: false,
            error: 'Failed to auto-assign ticket'
        });
    }
});

module.exports = router;