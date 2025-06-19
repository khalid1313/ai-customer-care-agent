const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Platform configurations
const PLATFORMS = {
    INSTAGRAM: {
        name: 'Instagram',
        requiredPermissions: ['instagram_basic', 'instagram_manage_messages', 'pages_messaging'],
        requiredScopes: ['instagram_basic', 'instagram_manage_messages', 'pages_messaging', 'pages_read_engagement'],
        webhookEvents: ['messages', 'messaging_postbacks', 'message_reactions'],
    },
    MESSENGER: {
        name: 'Facebook Messenger',
        requiredPermissions: ['pages_messaging', 'pages_read_engagement'],
        requiredScopes: ['pages_messaging', 'pages_read_engagement', 'pages_manage_metadata'],
        webhookEvents: ['messages', 'messaging_postbacks', 'messaging_optins', 'messaging_referrals'],
    },
    WHATSAPP: {
        name: 'WhatsApp Business',
        requiredPermissions: ['whatsapp_business_messaging', 'whatsapp_business_management'],
        requiredScopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
        webhookEvents: ['messages', 'message_status', 'message_template_status_update'],
    },
    GMAIL: {
        name: 'Gmail',
        requiredPermissions: ['gmail.readonly', 'gmail.modify', 'gmail.send'],
        requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.send'],
        webhookEvents: ['email_received', 'email_sent', 'thread_updated'],
    }
};

// Get all channel integrations for business
router.get('/', async (req, res) => {
    try {
        const integrations = await prisma.channelIntegration.findMany({
            where: { businessId: req.user.businessId },
            orderBy: { createdAt: 'desc' }
        });

        // Sanitize sensitive data
        const sanitizedIntegrations = integrations.map(integration => ({
            ...integration,
            accessToken: integration.accessToken ? '***masked***' : null,
            refreshToken: integration.refreshToken ? '***masked***' : null,
            pageAccessToken: integration.pageAccessToken ? '***masked***' : null,
            webhookSecret: integration.webhookSecret ? '***masked***' : null,
            permissions: integration.permissions ? JSON.parse(integration.permissions) : [],
            features: integration.features ? JSON.parse(integration.features) : [],
            metadata: integration.metadata ? JSON.parse(integration.metadata) : {},
        }));

        res.json({
            success: true,
            integrations: sanitizedIntegrations,
            platforms: PLATFORMS
        });

    } catch (error) {
        logger.error('Get channel integrations error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get channel integrations'
        });
    }
});

// Get specific channel integration
router.get('/:platform', async (req, res) => {
    try {
        const { platform } = req.params;

        if (!PLATFORMS[platform]) {
            return res.status(400).json({
                success: false,
                error: 'Invalid platform'
            });
        }

        const integration = await prisma.channelIntegration.findUnique({
            where: {
                businessId_platform: {
                    businessId: req.user.businessId,
                    platform: platform
                }
            }
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: 'Integration not found'
            });
        }

        // Sanitize sensitive data
        const sanitizedIntegration = {
            ...integration,
            accessToken: integration.accessToken ? '***masked***' : null,
            refreshToken: integration.refreshToken ? '***masked***' : null,
            pageAccessToken: integration.pageAccessToken ? '***masked***' : null,
            webhookSecret: integration.webhookSecret ? '***masked***' : null,
            permissions: integration.permissions ? JSON.parse(integration.permissions) : [],
            features: integration.features ? JSON.parse(integration.features) : [],
            metadata: integration.metadata ? JSON.parse(integration.metadata) : {},
        };

        res.json({
            success: true,
            integration: sanitizedIntegration
        });

    } catch (error) {
        logger.error('Get channel integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get channel integration'
        });
    }
});

// Connect channel integration (mock OAuth flow)
router.post('/connect', [
    body('platform').isIn(Object.keys(PLATFORMS)).withMessage('Invalid platform')
], authorize(['owner', 'admin']), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { platform } = req.body;
        const platformConfig = PLATFORMS[platform];

        // Check if integration already exists
        const existingIntegration = await prisma.channelIntegration.findUnique({
            where: {
                businessId_platform: {
                    businessId: req.user.businessId,
                    platform: platform
                }
            }
        });

        if (existingIntegration && existingIntegration.status === 'CONNECTED') {
            return res.status(409).json({
                success: false,
                error: `${platformConfig.name} is already connected`
            });
        }

        // Generate mock tokens and data
        const mockAccessToken = generateMockToken();
        const mockPageId = generateMockId();
        const mockWebhookSecret = generateMockToken(16);

        // Create or update integration
        const integration = await prisma.channelIntegration.upsert({
            where: {
                businessId_platform: {
                    businessId: req.user.businessId,
                    platform: platform
                }
            },
            update: {
                status: 'CONNECTED',
                accessToken: encrypt(mockAccessToken),
                tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                platformAccountId: mockPageId,
                platformAccountName: `Mock ${platformConfig.name} Account`,
                platformPageId: platform !== 'WHATSAPP' ? mockPageId : null,
                platformPageName: platform !== 'WHATSAPP' ? `Mock ${platformConfig.name} Page` : null,
                pageAccessToken: platform !== 'WHATSAPP' ? encrypt(mockAccessToken) : null,
                webhookSecret: mockWebhookSecret,
                webhookUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/webhooks/${platform.toLowerCase()}`,
                webhookSubscribed: true,
                webhookSubscribedAt: new Date(),
                permissions: JSON.stringify(platformConfig.requiredPermissions),
                features: JSON.stringify(['messaging', 'webhooks']),
                metadata: JSON.stringify({
                    mockData: true,
                    connectedBy: req.user.email
                }),
                connectedAt: new Date(),
                connectionAttempts: 1,
                lastError: null,
                lastErrorAt: null
            },
            create: {
                businessId: req.user.businessId,
                platform: platform,
                status: 'CONNECTED',
                accessToken: encrypt(mockAccessToken),
                tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                platformAccountId: mockPageId,
                platformAccountName: `Mock ${platformConfig.name} Account`,
                platformPageId: platform !== 'WHATSAPP' ? mockPageId : null,
                platformPageName: platform !== 'WHATSAPP' ? `Mock ${platformConfig.name} Page` : null,
                pageAccessToken: platform !== 'WHATSAPP' ? encrypt(mockAccessToken) : null,
                webhookSecret: mockWebhookSecret,
                webhookUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/webhooks/${platform.toLowerCase()}`,
                webhookSubscribed: true,
                webhookSubscribedAt: new Date(),
                permissions: JSON.stringify(platformConfig.requiredPermissions),
                features: JSON.stringify(['messaging', 'webhooks']),
                metadata: JSON.stringify({
                    mockData: true,
                    connectedBy: req.user.email
                }),
                connectedAt: new Date(),
                connectionAttempts: 1
            }
        });

        logger.info('Channel integration connected', {
            integrationId: integration.id,
            platform: platform,
            businessId: req.user.businessId
        });

        res.json({
            success: true,
            message: `${platformConfig.name} connected successfully (mock)`,
            integration: {
                id: integration.id,
                platform: integration.platform,
                status: integration.status,
                platformAccountName: integration.platformAccountName
            }
        });

    } catch (error) {
        logger.error('Connect channel integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect channel integration'
        });
    }
});

// Test channel integration connection
router.post('/:id/test', async (req, res) => {
    try {
        const { id } = req.params;

        const integration = await prisma.channelIntegration.findFirst({
            where: {
                id: id,
                businessId: req.user.businessId
            }
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: 'Integration not found'
            });
        }

        // Simulate connection test
        const testSuccess = integration.status === 'CONNECTED' && Math.random() > 0.1; // 90% success rate for connected integrations

        if (testSuccess) {
            await prisma.channelIntegration.update({
                where: { id: id },
                data: {
                    lastTestAt: new Date(),
                    lastError: null,
                    lastErrorAt: null
                }
            });

            res.json({
                success: true,
                message: 'Connection test successful',
                details: {
                    platform: integration.platform,
                    accountName: integration.platformAccountName,
                    webhookActive: integration.webhookSubscribed,
                    tokenValid: integration.tokenExpiresAt ? integration.tokenExpiresAt > new Date() : false
                }
            });
        } else {
            const errorMessage = 'Mock connection test failed - please try again';
            
            await prisma.channelIntegration.update({
                where: { id: id },
                data: {
                    lastTestAt: new Date(),
                    lastError: errorMessage,
                    lastErrorAt: new Date(),
                    status: 'ERROR'
                }
            });

            res.status(400).json({
                success: false,
                error: errorMessage
            });
        }

    } catch (error) {
        logger.error('Test channel integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test channel integration'
        });
    }
});

// Disconnect channel integration
router.delete('/:id', authorize(['owner', 'admin']), async (req, res) => {
    try {
        const { id } = req.params;

        const integration = await prisma.channelIntegration.findFirst({
            where: {
                id: id,
                businessId: req.user.businessId
            }
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: 'Integration not found'
            });
        }

        // Update status to disconnected (soft delete)
        await prisma.channelIntegration.update({
            where: { id: id },
            data: {
                status: 'DISCONNECTED',
                webhookSubscribed: false,
                accessToken: null,
                refreshToken: null,
                pageAccessToken: null,
                lastError: 'Disconnected by user',
                lastErrorAt: new Date()
            }
        });

        logger.info('Channel integration disconnected', {
            integrationId: id,
            platform: integration.platform,
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.json({
            success: true,
            message: 'Integration disconnected successfully'
        });

    } catch (error) {
        logger.error('Disconnect channel integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect channel integration'
        });
    }
});

// Refresh channel integration token
router.post('/:id/refresh', async (req, res) => {
    try {
        const { id } = req.params;

        const integration = await prisma.channelIntegration.findFirst({
            where: {
                id: id,
                businessId: req.user.businessId,
                status: 'CONNECTED'
            }
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: 'Active integration not found'
            });
        }

        // Simulate token refresh
        const newAccessToken = generateMockToken();
        const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

        await prisma.channelIntegration.update({
            where: { id: id },
            data: {
                accessToken: encrypt(newAccessToken),
                tokenExpiresAt: newExpiresAt,
                pageAccessToken: integration.platformPageId ? encrypt(newAccessToken) : null
            }
        });

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            expiresAt: newExpiresAt
        });

    } catch (error) {
        logger.error('Refresh channel integration token error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
});

// Helper functions
function encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'fallback-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'fallback-key', 'salt', 32);
    
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encrypted = textParts.join(':');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

function generateMockToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

function generateMockId() {
    return Math.floor(Math.random() * 1000000000000000).toString();
}

module.exports = router;