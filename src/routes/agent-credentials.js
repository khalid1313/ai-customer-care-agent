const express = require('express');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Store agent credential notification
router.post('/store-credential', async (req, res) => {
    try {
        const {
            agentId,
            agentName,
            agentEmail,
            tempPassword,
            createdBy
        } = req.body;

        // Store the credential notification in database
        const notification = await prisma.agentCredential.create({
            data: {
                agentId,
                agentName,
                agentEmail,
                tempPassword,
                createdBy,
                isViewed: false,
                createdAt: new Date()
            }
        });

        logger.info('Agent credential notification stored', {
            notificationId: notification.id,
            agentEmail,
            createdBy
        });

        res.json({
            success: true,
            data: notification
        });

    } catch (error) {
        logger.error('Error storing agent credential', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store credential notification'
        });
    }
});

// Get all unviewed credential notifications for admin
router.get('/notifications/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;

        const notifications = await prisma.agentCredential.findMany({
            where: {
                createdBy: adminId,
                isViewed: false
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: notifications
        });

    } catch (error) {
        logger.error('Error fetching credential notifications', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

// Mark credential notification as viewed
router.patch('/notifications/:notificationId/viewed', async (req, res) => {
    try {
        const { notificationId } = req.params;

        const updatedNotification = await prisma.agentCredential.update({
            where: { id: notificationId },
            data: { isViewed: true }
        });

        res.json({
            success: true,
            data: updatedNotification
        });

    } catch (error) {
        logger.error('Error marking notification as viewed', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update notification'
        });
    }
});

// Get credential notification by ID (for detailed view)
router.get('/notifications/detail/:notificationId', async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await prisma.agentCredential.findUnique({
            where: { id: notificationId }
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        res.json({
            success: true,
            data: notification
        });

    } catch (error) {
        logger.error('Error fetching notification detail', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification'
        });
    }
});

module.exports = router;