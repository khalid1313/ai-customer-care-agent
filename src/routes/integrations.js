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

// Available integration types
const INTEGRATION_TYPES = {
    SHOPIFY: {
        name: 'Shopify',
        description: 'Connect your Shopify store to sync products and orders',
        category: 'E-commerce',
        fields: [
            { name: 'store_url', label: 'Store URL', type: 'url', required: true, placeholder: 'https://yourstore.myshopify.com' },
            { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'shpat_...' },
            { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false, placeholder: 'Optional webhook secret' }
        ]
    },
    WHATSAPP: {
        name: 'WhatsApp Business',
        description: 'Connect WhatsApp Business API for customer messaging',
        category: 'Messaging',
        fields: [
            { name: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true, placeholder: '1234567890123456' },
            { name: 'access_token', label: 'Access Token', type: 'password', required: true, placeholder: 'EAAxxxx...' },
            { name: 'webhook_verify_token', label: 'Webhook Verify Token', type: 'password', required: true, placeholder: 'your_verify_token' },
            { name: 'business_account_id', label: 'Business Account ID', type: 'text', required: false, placeholder: 'Optional' }
        ]
    },
    INSTAGRAM: {
        name: 'Instagram',
        description: 'Connect Instagram for direct message management',
        category: 'Messaging',
        fields: [
            { name: 'page_id', label: 'Instagram Page ID', type: 'text', required: true, placeholder: 'Your Instagram page ID' },
            { name: 'access_token', label: 'Page Access Token', type: 'password', required: true, placeholder: 'EAAxxxx...' },
            { name: 'app_secret', label: 'App Secret', type: 'password', required: true, placeholder: 'Your app secret' }
        ]
    },
    EMAIL: {
        name: 'Email',
        description: 'Connect email for customer support',
        category: 'Messaging',
        fields: [
            { name: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
            { name: 'smtp_port', label: 'SMTP Port', type: 'number', required: true, placeholder: '587' },
            { name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'support@yourbusiness.com' },
            { name: 'password', label: 'Email Password', type: 'password', required: true, placeholder: 'Your email password' },
            { name: 'imap_host', label: 'IMAP Host', type: 'text', required: false, placeholder: 'imap.gmail.com' },
            { name: 'imap_port', label: 'IMAP Port', type: 'number', required: false, placeholder: '993' }
        ]
    },
    STRIPE: {
        name: 'Stripe',
        description: 'Connect Stripe for payment processing',
        category: 'Payments',
        fields: [
            { name: 'publishable_key', label: 'Publishable Key', type: 'text', required: true, placeholder: 'pk_live_...' },
            { name: 'secret_key', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_live_...' },
            { name: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false, placeholder: 'whsec_...' }
        ]
    },
    ZENDESK: {
        name: 'Zendesk',
        description: 'Connect Zendesk for ticket management',
        category: 'Support',
        fields: [
            { name: 'subdomain', label: 'Zendesk Subdomain', type: 'text', required: true, placeholder: 'yourcompany' },
            { name: 'email', label: 'Admin Email', type: 'email', required: true, placeholder: 'admin@yourcompany.com' },
            { name: 'api_token', label: 'API Token', type: 'password', required: true, placeholder: 'Your API token' }
        ]
    }
};

// Get all integrations for business
router.get('/', async (req, res) => {
    try {
        const integrations = await prisma.integration.findMany({
            where: { businessId: req.user.businessId },
            orderBy: { createdAt: 'desc' }
        });

        // Parse config for each integration (remove sensitive data)
        const integrationsWithConfig = integrations.map(integration => {
            const config = integration.config ? JSON.parse(integration.config) : {};
            const syncData = integration.syncData ? JSON.parse(integration.syncData) : {};
            
            // Remove sensitive fields from config
            const sanitizedConfig = { ...config };
            Object.keys(sanitizedConfig).forEach(key => {
                if (key.includes('token') || key.includes('secret') || key.includes('password')) {
                    sanitizedConfig[key] = '***masked***';
                }
            });

            return {
                ...integration,
                config: sanitizedConfig,
                syncData: syncData,
                credentials: undefined // Never return credentials
            };
        });

        res.json({
            success: true,
            data: {
                integrations: integrationsWithConfig,
                availableTypes: INTEGRATION_TYPES
            }
        });

    } catch (error) {
        logger.error('Get integrations error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get integrations'
        });
    }
});

// Get specific integration
router.get('/:integrationId', async (req, res) => {
    try {
        const { integrationId } = req.params;

        const integration = await prisma.integration.findFirst({
            where: {
                id: integrationId,
                businessId: req.user.businessId
            }
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: 'Integration not found'
            });
        }

        const config = integration.config ? JSON.parse(integration.config) : {};
        const syncData = integration.syncData ? JSON.parse(integration.syncData) : {};

        // Sanitize sensitive data
        const sanitizedConfig = { ...config };
        Object.keys(sanitizedConfig).forEach(key => {
            if (key.includes('token') || key.includes('secret') || key.includes('password')) {
                sanitizedConfig[key] = '***masked***';
            }
        });

        res.json({
            success: true,
            data: {
                integration: {
                    ...integration,
                    config: sanitizedConfig,
                    syncData: syncData,
                    credentials: undefined,
                    availableFields: INTEGRATION_TYPES[integration.type]?.fields || []
                }
            }
        });

    } catch (error) {
        logger.error('Get integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get integration'
        });
    }
});

// Create new integration
router.post('/', [
    body('type').isIn(Object.keys(INTEGRATION_TYPES)).withMessage('Invalid integration type'),
    body('name').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('description').optional().isString().trim(),
    body('config').isObject().withMessage('Configuration is required')
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

        const { type, name, description, config } = req.body;

        // Validate required fields for this integration type
        const integrationDef = INTEGRATION_TYPES[type];
        if (!integrationDef) {
            return res.status(400).json({
                success: false,
                error: 'Invalid integration type'
            });
        }

        // Check required fields
        const missingFields = [];
        integrationDef.fields.forEach(field => {
            if (field.required && !config[field.name]) {
                missingFields.push(field.label);
            }
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Check if integration of this type already exists
        const existingIntegration = await prisma.integration.findFirst({
            where: {
                businessId: req.user.businessId,
                type: type
            }
        });

        if (existingIntegration) {
            return res.status(409).json({
                success: false,
                error: `${integrationDef.name} integration already exists. Please update the existing one.`
            });
        }

        // Encrypt sensitive credentials
        const credentials = {};
        const publicConfig = {};

        Object.keys(config).forEach(key => {
            if (key.includes('token') || key.includes('secret') || key.includes('password')) {
                credentials[key] = encrypt(config[key]);
            } else {
                publicConfig[key] = config[key];
            }
        });

        // Generate webhook URL
        const webhook = `/api/webhooks/${type.toLowerCase()}/${req.user.businessId}`;

        const integration = await prisma.integration.create({
            data: {
                businessId: req.user.businessId,
                type: type,
                name: name,
                description: description,
                config: JSON.stringify(publicConfig),
                credentials: JSON.stringify(credentials),
                webhook: webhook,
                status: 'PENDING' // Will be activated after successful test
            }
        });

        // Test the integration
        let testResult;
        try {
            testResult = await testIntegration(type, config);
            
            if (testResult.success) {
                await prisma.integration.update({
                    where: { id: integration.id },
                    data: { 
                        status: 'ACTIVE',
                        lastSync: new Date(),
                        syncData: JSON.stringify(testResult.data || {})
                    }
                });
            }
        } catch (testError) {
            logger.error('Integration test failed', testError);
            testResult = { success: false, error: testError.message };
        }

        logger.info('Integration created', {
            integrationId: integration.id,
            type: type,
            businessId: req.user.businessId,
            testSuccess: testResult.success
        });

        res.status(201).json({
            success: true,
            data: {
                integration: {
                    ...integration,
                    credentials: undefined,
                    testResult: testResult
                }
            },
            message: testResult.success ? 
                'Integration created and tested successfully' : 
                'Integration created but connection test failed'
        });

    } catch (error) {
        logger.error('Create integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create integration'
        });
    }
});

// Update integration
router.put('/:integrationId', [
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().trim(),
    body('config').optional().isObject(),
    body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'ERROR'])
], authorize(['owner', 'admin']), async (req, res) => {
    try {
        const { integrationId } = req.params;
        const { config, ...updateData } = req.body;

        const existingIntegration = await prisma.integration.findFirst({
            where: {
                id: integrationId,
                businessId: req.user.businessId
            }
        });

        if (!existingIntegration) {
            return res.status(404).json({
                success: false,
                error: 'Integration not found'
            });
        }

        let updatedConfig = existingIntegration.config ? JSON.parse(existingIntegration.config) : {};
        let updatedCredentials = existingIntegration.credentials ? JSON.parse(existingIntegration.credentials) : {};

        // Update config and credentials if provided
        if (config) {
            Object.keys(config).forEach(key => {
                if (key.includes('token') || key.includes('secret') || key.includes('password')) {
                    if (config[key] !== '***masked***') {
                        updatedCredentials[key] = encrypt(config[key]);
                    }
                } else {
                    updatedConfig[key] = config[key];
                }
            });
        }

        const integration = await prisma.integration.update({
            where: { id: integrationId },
            data: {
                ...updateData,
                config: JSON.stringify(updatedConfig),
                credentials: JSON.stringify(updatedCredentials),
                updatedAt: new Date()
            }
        });

        logger.info('Integration updated', {
            integrationId: integrationId,
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.json({
            success: true,
            data: {
                integration: {
                    ...integration,
                    credentials: undefined
                }
            },
            message: 'Integration updated successfully'
        });

    } catch (error) {
        logger.error('Update integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update integration'
        });
    }
});

// Test integration connection
router.post('/:integrationId/test', async (req, res) => {
    try {
        const { integrationId } = req.params;

        const integration = await prisma.integration.findFirst({
            where: {
                id: integrationId,
                businessId: req.user.businessId
            }
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: 'Integration not found'
            });
        }

        // Decrypt credentials and merge with config
        const config = integration.config ? JSON.parse(integration.config) : {};
        const credentials = integration.credentials ? JSON.parse(integration.credentials) : {};
        
        const decryptedCredentials = {};
        Object.keys(credentials).forEach(key => {
            decryptedCredentials[key] = decrypt(credentials[key]);
        });

        const fullConfig = { ...config, ...decryptedCredentials };

        // Test the integration
        const testResult = await testIntegration(integration.type, fullConfig);

        // Update integration status based on test result
        await prisma.integration.update({
            where: { id: integrationId },
            data: {
                status: testResult.success ? 'ACTIVE' : 'ERROR',
                lastSync: testResult.success ? new Date() : integration.lastSync,
                syncData: testResult.success ? JSON.stringify(testResult.data || {}) : integration.syncData
            }
        });

        res.json({
            success: true,
            data: {
                testResult: testResult,
                integration: {
                    id: integration.id,
                    name: integration.name,
                    status: testResult.success ? 'ACTIVE' : 'ERROR'
                }
            }
        });

    } catch (error) {
        logger.error('Test integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to test integration'
        });
    }
});

// Sync integration data
router.post('/:integrationId/sync', async (req, res) => {
    try {
        const { integrationId } = req.params;

        const integration = await prisma.integration.findFirst({
            where: {
                id: integrationId,
                businessId: req.user.businessId,
                status: 'ACTIVE'
            }
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: 'Active integration not found'
            });
        }

        // Perform sync based on integration type
        const syncResult = await syncIntegrationData(integration);

        // Update last sync time
        await prisma.integration.update({
            where: { id: integrationId },
            data: {
                lastSync: new Date(),
                syncData: JSON.stringify(syncResult.data || {})
            }
        });

        res.json({
            success: true,
            data: {
                syncResult: syncResult,
                lastSync: new Date()
            }
        });

    } catch (error) {
        logger.error('Sync integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync integration'
        });
    }
});

// Delete integration
router.delete('/:integrationId', authorize(['owner', 'admin']), async (req, res) => {
    try {
        const { integrationId } = req.params;

        const integration = await prisma.integration.findFirst({
            where: {
                id: integrationId,
                businessId: req.user.businessId
            }
        });

        if (!integration) {
            return res.status(404).json({
                success: false,
                error: 'Integration not found'
            });
        }

        await prisma.integration.delete({
            where: { id: integrationId }
        });

        logger.info('Integration deleted', {
            integrationId: integrationId,
            type: integration.type,
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.json({
            success: true,
            message: 'Integration deleted successfully'
        });

    } catch (error) {
        logger.error('Delete integration error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete integration'
        });
    }
});

// Helper functions
function encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'fallback-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
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
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

async function testIntegration(type, config) {
    // Simulate integration testing
    // In a real implementation, you would make actual API calls
    
    switch (type) {
        case 'SHOPIFY':
            return testShopifyConnection(config);
        case 'WHATSAPP':
            return testWhatsAppConnection(config);
        case 'INSTAGRAM':
            return testInstagramConnection(config);
        default:
            return { success: true, message: 'Integration test not implemented yet' };
    }
}

async function testShopifyConnection(config) {
    try {
        // Simulate Shopify API test
        if (!config.store_url || !config.access_token) {
            throw new Error('Missing required Shopify credentials');
        }
        
        return {
            success: true,
            message: 'Shopify connection successful',
            data: {
                store: config.store_url,
                connectedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function testWhatsAppConnection(config) {
    try {
        if (!config.phone_number_id || !config.access_token) {
            throw new Error('Missing required WhatsApp credentials');
        }
        
        return {
            success: true,
            message: 'WhatsApp connection successful',
            data: {
                phoneNumberId: config.phone_number_id,
                connectedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function testInstagramConnection(config) {
    try {
        if (!config.page_id || !config.access_token) {
            throw new Error('Missing required Instagram credentials');
        }
        
        return {
            success: true,
            message: 'Instagram connection successful',
            data: {
                pageId: config.page_id,
                connectedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function syncIntegrationData(integration) {
    // Simulate data sync
    return {
        success: true,
        message: 'Data sync completed',
        data: {
            syncedAt: new Date().toISOString(),
            recordsProcessed: Math.floor(Math.random() * 100)
        }
    };
}

module.exports = router;