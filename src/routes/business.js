const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const ShopifyService = require('../services/ShopifyService');
const BusinessContextLoader = require('../services/BusinessContextLoader');
const ProductSyncService = require('../services/ProductSyncService');

const router = express.Router();
const prisma = new PrismaClient();
const businessContextLoader = new BusinessContextLoader();

// Apply authentication to all routes (except creation)
// router.use(authenticate);

// Get business dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const timeRange = req.query.timeRange || '7d';
        
        // Calculate date range
        const now = new Date();
        const startDate = new Date();
        switch (timeRange) {
            case '24h':
                startDate.setHours(now.getHours() - 24);
                break;
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        // Get dashboard metrics
        const [
            totalConversations,
            activeConversations,
            totalMessages,
            unreadMessages,
            totalTickets,
            openTickets,
            avgResponseTime,
            customerSatisfaction
        ] = await Promise.all([
            // Total conversations
            prisma.conversation.count({
                where: { 
                    businessId,
                    createdAt: { gte: startDate }
                }
            }),
            
            // Active conversations
            prisma.conversation.count({
                where: { 
                    businessId,
                    status: 'ACTIVE'
                }
            }),
            
            // Total messages
            prisma.message.count({
                where: { 
                    conversation: { businessId },
                    createdAt: { gte: startDate }
                }
            }),
            
            // Unread messages
            prisma.message.count({
                where: { 
                    conversation: { businessId },
                    isRead: false,
                    sender: 'CUSTOMER'
                }
            }),
            
            // Total tickets
            prisma.ticket.count({
                where: { 
                    businessId,
                    createdAt: { gte: startDate }
                }
            }),
            
            // Open tickets
            prisma.ticket.count({
                where: { 
                    businessId,
                    status: { in: ['OPEN', 'IN_PROGRESS'] }
                }
            }),
            
            // Average response time (simplified calculation)
            prisma.aIResponse.aggregate({
                where: {
                    conversation: { businessId },
                    createdAt: { gte: startDate }
                },
                _avg: { processingTime: true }
            }),
            
            // Customer satisfaction (from AI response approvals)
            prisma.aIResponse.aggregate({
                where: {
                    conversation: { businessId },
                    approved: { not: null },
                    createdAt: { gte: startDate }
                },
                _avg: { 
                    approved: true  // This would need to be converted to rating
                }
            })
        ]);

        // Get recent activity
        const recentConversations = await prisma.conversation.findMany({
            where: { businessId },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            },
            orderBy: { lastMessageAt: 'desc' },
            take: 5
        });

        // Get channel distribution
        const channelStats = await prisma.conversation.groupBy({
            by: ['channel'],
            where: { 
                businessId,
                createdAt: { gte: startDate }
            },
            _count: true
        });

        res.json({
            success: true,
            data: {
                timeRange,
                metrics: {
                    totalConversations,
                    activeConversations,
                    totalMessages,
                    unreadMessages,
                    totalTickets,
                    openTickets,
                    avgResponseTime: Math.round(avgResponseTime._avg?.processingTime || 0),
                    customerSatisfaction: Math.round((customerSatisfaction._avg?.approved || 0) * 100)
                },
                recentActivity: recentConversations.map(conv => ({
                    id: conv.id,
                    customerName: conv.customerName,
                    channel: conv.channel,
                    status: conv.status,
                    lastMessage: conv.messages[0]?.content.substring(0, 100),
                    lastMessageAt: conv.lastMessageAt
                })),
                channelDistribution: channelStats.map(stat => ({
                    channel: stat.channel,
                    count: stat._count
                }))
            }
        });

    } catch (error) {
        logger.error('Dashboard data error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load dashboard data'
        });
    }
});

// Get business settings
router.get('/settings', async (req, res) => {
    try {
        const business = await prisma.business.findUnique({
            where: { id: req.user.businessId }
        });

        if (!business) {
            return res.status(404).json({
                success: false,
                error: 'Business not found'
            });
        }

        const settings = business.settings ? JSON.parse(business.settings) : {};

        res.json({
            success: true,
            data: {
                business: {
                    id: business.id,
                    name: business.name,
                    email: business.email,
                    phone: business.phone,
                    website: business.website,
                    industry: business.industry,
                    description: business.description,
                    logo: business.logo,
                    timezone: business.timezone,
                    subscription: business.subscription
                },
                settings: {
                    apiKey: settings.apiKey,
                    allowRegistration: settings.allowRegistration || false,
                    requireEmailVerification: settings.requireEmailVerification || false,
                    defaultTimezone: settings.defaultTimezone || 'UTC',
                    businessHours: settings.businessHours || {
                        enabled: false,
                        timezone: 'UTC',
                        schedule: {
                            monday: { enabled: true, start: '09:00', end: '17:00' },
                            tuesday: { enabled: true, start: '09:00', end: '17:00' },
                            wednesday: { enabled: true, start: '09:00', end: '17:00' },
                            thursday: { enabled: true, start: '09:00', end: '17:00' },
                            friday: { enabled: true, start: '09:00', end: '17:00' },
                            saturday: { enabled: false, start: '09:00', end: '17:00' },
                            sunday: { enabled: false, start: '09:00', end: '17:00' }
                        }
                    },
                    notifications: settings.notifications || {
                        email: true,
                        slack: false,
                        webhook: false
                    }
                }
            }
        });

    } catch (error) {
        logger.error('Get settings error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get business settings'
        });
    }
});

// Update business settings
router.put('/settings', [
    body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().isMobilePhone(),
    body('website').optional().isURL(),
    body('industry').optional().isString().trim(),
    body('description').optional().isString().trim(),
    body('timezone').optional().isString(),
    body('settings').optional().isObject()
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

        const { settings: newSettings, ...businessData } = req.body;

        // Get current business
        const currentBusiness = await prisma.business.findUnique({
            where: { id: req.user.businessId }
        });

        if (!currentBusiness) {
            return res.status(404).json({
                success: false,
                error: 'Business not found'
            });
        }

        // Merge settings
        const currentSettings = currentBusiness.settings ? JSON.parse(currentBusiness.settings) : {};
        const mergedSettings = { ...currentSettings, ...newSettings };

        // Update business
        const updatedBusiness = await prisma.business.update({
            where: { id: req.user.businessId },
            data: {
                ...businessData,
                settings: JSON.stringify(mergedSettings),
                updatedAt: new Date()
            }
        });

        logger.info('Business settings updated', {
            businessId: req.user.businessId,
            userId: req.user.id
        });

        res.json({
            success: true,
            data: {
                business: updatedBusiness,
                settings: mergedSettings
            },
            message: 'Settings updated successfully'
        });

    } catch (error) {
        logger.error('Update settings error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update settings'
        });
    }
});

// Get team members
router.get('/team', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { businessId: req.user.businessId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true,
                isActive: true,
                lastLogin: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json({
            success: true,
            data: { users }
        });

    } catch (error) {
        logger.error('Get team error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get team members'
        });
    }
});

// Save brand configuration data
router.put('/:businessId/brand-config', authenticate, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { brandData, completedSteps, currentStep } = req.body;
        
        // Verify user has access to this business
        if (req.user.businessId !== businessId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this business'
            });
        }

        // Get existing business context
        const existingContext = await prisma.businessContext.findUnique({
            where: { businessId }
        });

        // Merge brand data with existing data
        const existingBusinessInfo = existingContext ? JSON.parse(existingContext.businessInfo || '{}') : {};
        const updatedBusinessInfo = {
            ...existingBusinessInfo,
            ...brandData,
            brandWizardCompleted: completedSteps,
            brandWizardCurrentStep: currentStep
        };

        // Update business context with brand data
        await prisma.businessContext.upsert({
            where: { businessId },
            update: {
                businessInfo: JSON.stringify(updatedBusinessInfo),
                brandVoice: brandData.voiceTone ? JSON.stringify({
                    tone: brandData.voiceTone,
                    style: brandData.communicationStyle,
                    personality: brandData.brandPersonality,
                    avoidPhrases: brandData.avoidPhrases
                }) : existingContext?.brandVoice,
                aiPersonality: brandData.brandPersonality || existingContext?.aiPersonality,
                updatedAt: new Date()
            },
            create: {
                businessId,
                businessInfo: JSON.stringify(updatedBusinessInfo),
                brandVoice: brandData.voiceTone ? JSON.stringify({
                    tone: brandData.voiceTone,
                    style: brandData.communicationStyle,
                    personality: brandData.brandPersonality,
                    avoidPhrases: brandData.avoidPhrases
                }) : null,
                aiPersonality: brandData.brandPersonality || null
            }
        });

        // Clear cache
        businessContextLoader.clearCache(businessId);

        res.json({
            success: true,
            message: 'Brand configuration saved successfully'
        });

    } catch (error) {
        logger.error('Failed to save brand configuration', { error: error.message, businessId: req.params.businessId });
        res.status(500).json({
            success: false,
            error: 'Failed to save brand configuration'
        });
    }
});

// Get business context data (scraped data)
router.get('/:businessId/context', authenticate, async (req, res) => {
    try {
        const { businessId } = req.params;
        
        // Verify user has access to this business
        if (req.user.businessId !== businessId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this business'
            });
        }

        const businessContext = await prisma.businessContext.findUnique({
            where: { businessId }
        });

        if (!businessContext) {
            return res.json({
                success: true,
                data: null,
                message: 'No business context data found'
            });
        }

        res.json({
            success: true,
            data: businessContext
        });

    } catch (error) {
        logger.error('Failed to get business context', { error: error.message, businessId: req.params.businessId });
        res.status(500).json({
            success: false,
            error: 'Failed to get business context'
        });
    }
});

// Invite team member
router.post('/team/invite', [
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['admin', 'agent', 'member']),
    body('firstName').isString().trim().isLength({ min: 1 }),
    body('lastName').isString().trim().isLength({ min: 1 })
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

        const { email, role, firstName, lastName } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-8);
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        // Create user
        const user = await prisma.user.create({
            data: {
                businessId: req.user.businessId,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                role
            }
        });

        // In a real app, you'd send an invitation email here
        logger.info('Team member invited', {
            businessId: req.user.businessId,
            newUserId: user.id,
            invitedBy: req.user.id
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                },
                tempPassword // In production, send this via email instead
            },
            message: 'Team member invited successfully'
        });

    } catch (error) {
        logger.error('Invite team member error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to invite team member'
        });
    }
});

// Update team member
router.put('/team/:userId', [
    body('role').optional().isIn(['admin', 'agent', 'member']),
    body('isActive').optional().isBoolean()
], authorize(['owner', 'admin']), async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, isActive } = req.body;

        // Check if user belongs to the same business
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                businessId: req.user.businessId
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(role && { role }),
                ...(isActive !== undefined && { isActive })
            }
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    role: updatedUser.role,
                    isActive: updatedUser.isActive
                }
            },
            message: 'Team member updated successfully'
        });

    } catch (error) {
        logger.error('Update team member error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update team member'
        });
    }
});

/**
 * Create a new business (public endpoint for onboarding)
 */
router.post('/create', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      website,
      industry,
      description,
      timezone = 'UTC'
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Check if business with email already exists
    const existingBusiness = await prisma.business.findUnique({
      where: { email }
    });

    if (existingBusiness) {
      return res.status(409).json({
        success: false,
        error: 'Business with this email already exists'
      });
    }

    // Create business
    const business = await prisma.business.create({
      data: {
        name,
        email,
        phone,
        website,
        industry,
        description,
        timezone,
        settings: JSON.stringify({
          aiPersonality: 'friendly',
          defaultLanguage: 'en',
          workingHours: {
            start: '09:00',
            end: '17:00',
            timezone: timezone
          }
        })
      }
    });

    logger.info(`Business created: ${business.id} - ${business.name}`);

    res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        industry: business.industry,
        status: business.status
      }
    });
  } catch (error) {
    logger.error('Error creating business:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create business'
    });
  }
});

/**
 * Test Shopify connection (without saving)
 */
router.post('/:businessId/integrations/shopify/test', async (req, res) => {
  try {
    const { domain, apiKey, accessToken } = req.body;

    if (!domain || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Domain and access token are required'
      });
    }

    // Test Shopify connection
    const shopify = new ShopifyService(domain, accessToken);
    const connectionTest = await shopify.testConnection();

    if (!connectionTest.success) {
      return res.status(400).json({
        success: false,
        error: connectionTest.error || 'Failed to connect to Shopify store'
      });
    }

    res.json({
      success: true,
      message: `✅ Successfully connected to ${connectionTest.shop.name}`,
      shop: {
        name: connectionTest.shop.name,
        domain: connectionTest.shop.domain,
        currency: connectionTest.shop.currency,
        planName: connectionTest.shop.plan_name
      }
    });
  } catch (error) {
    logger.error('Error testing Shopify connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Shopify connection: ' + error.message
    });
  }
});

/**
 * Setup Shopify integration
 */
router.post('/:businessId/integrations/shopify', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { domain, apiKey, accessToken } = req.body;

    if (!domain || !apiKey || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Domain, API key, and access token are required'
      });
    }

    // Test Shopify connection
    const shopify = new ShopifyService(domain, accessToken);
    const connectionTest = await shopify.testConnection();

    if (!connectionTest.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to connect to Shopify store: ' + connectionTest.error
      });
    }

    // Update business with Shopify details
    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        shopifyDomain: domain,
        shopifyApiKey: apiKey, // TODO: Encrypt this in production
        shopifyAccessToken: accessToken, // TODO: Encrypt this in production
        shopifyStoreId: connectionTest.shop.id.toString(),
        lastProductSync: new Date()
      }
    });

    // Create integration record
    await prisma.integration.upsert({
      where: {
        businessId_type: {
          businessId: businessId,
          type: 'shopify'
        }
      },
      update: {
        name: `Shopify - ${connectionTest.shop.name}`,
        config: JSON.stringify({
          domain: domain,
          apiKey: apiKey.substring(0, 8) + '...',
          accessToken: accessToken.substring(0, 12) + '...',
          shopName: connectionTest.shop.name,
          currency: connectionTest.shop.currency
        }),
        status: 'ACTIVE',
        lastSync: new Date()
      },
      create: {
        businessId: businessId,
        type: 'shopify',
        name: `Shopify - ${connectionTest.shop.name}`,
        config: JSON.stringify({
          domain: domain,
          apiKey: apiKey.substring(0, 8) + '...',
          accessToken: accessToken.substring(0, 12) + '...',
          shopName: connectionTest.shop.name,
          currency: connectionTest.shop.currency
        }),
        status: 'ACTIVE',
        lastSync: new Date()
      }
    });

    // Clear business context cache
    businessContextLoader.clearCache(businessId);

    logger.info(`Shopify integration setup for business ${businessId}: ${domain}`);

    res.json({
      success: true,
      integration: {
        type: 'shopify',
        domain: domain,
        shopName: connectionTest.shop.name,
        status: 'connected'
      }
    });
  } catch (error) {
    logger.error('Error setting up Shopify integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup Shopify integration'
    });
  }
});

/**
 * Setup Pinecone integration
 */
router.post('/:businessId/integrations/pinecone', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { apiKey, environment, namespace, indexName } = req.body;

    if (!apiKey || !namespace || !indexName) {
      return res.status(400).json({
        success: false,
        error: 'API key, namespace, and index name are required'
      });
    }

    // TODO: Test Pinecone connection

    // Update business with Pinecone details
    const business = await prisma.business.update({
      where: { id: businessId },
      data: {
        pineconeApiKey: apiKey, // TODO: Encrypt this in production
        pineconeEnvironment: environment,
        pineconeNamespace: namespace,
        pineconeIndexName: indexName
      }
    });

    // Create integration record
    await prisma.integration.upsert({
      where: {
        businessId_type: {
          businessId: businessId,
          type: 'pinecone'
        }
      },
      update: {
        name: `Pinecone - ${indexName}`,
        config: JSON.stringify({
          apiKey: apiKey.substring(0, 8) + '...',
          environment: environment,
          namespace: namespace,
          indexName: indexName
        }),
        status: 'ACTIVE',
        lastSync: new Date()
      },
      create: {
        businessId: businessId,
        type: 'pinecone',
        name: `Pinecone - ${indexName}`,
        config: JSON.stringify({
          apiKey: apiKey.substring(0, 8) + '...',
          environment: environment,
          namespace: namespace,
          indexName: indexName
        }),
        status: 'ACTIVE',
        lastSync: new Date()
      }
    });

    // Clear business context cache
    businessContextLoader.clearCache(businessId);

    logger.info(`Pinecone integration setup for business ${businessId}: ${namespace}/${indexName}`);

    res.json({
      success: true,
      integration: {
        type: 'pinecone',
        namespace: namespace,
        indexName: indexName,
        status: 'connected'
      }
    });
  } catch (error) {
    logger.error('Error setting up Pinecone integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup Pinecone integration'
    });
  }
});

/**
 * Sync products from Shopify (using new ProductSyncService)
 */
router.post('/:businessId/sync/products', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { autoPineconeSync = false } = req.body; // Allow enabling auto Pinecone sync

    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }

    if (!business.shopifyDomain || !business.shopifyAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Shopify integration not configured'
      });
    }

    // Use the new ProductSyncService
    const productSyncService = new ProductSyncService();
    const result = await productSyncService.syncProducts(businessId, {
      autoPineconeSync,
      onProgress: (progress) => {
        // Could emit WebSocket events here for real-time updates
        logger.info(`Sync progress for ${businessId}: ${progress.stage} - ${progress.progress}%`);
      }
    });

    // Clear business context cache
    businessContextLoader.clearCache(businessId);

    logger.info(`Synced products for business ${businessId} using ProductSyncService`);

    res.json({
      success: true,
      synced: {
        products: 'Completed', // Will be determined by ProductSyncService
        message: result.message,
        lastSync: new Date()
      }
    });
  } catch (error) {
    logger.error('Error syncing products:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync products'
    });
  }
});

/**
 * Get business details (public endpoint for testing)
 */
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true
          }
        },
        agents: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            model: true,
            isActive: true
          }
        },
        integrations: {
          select: {
            id: true,
            type: true,
            name: true,
            status: true,
            lastSync: true
          }
        }
      }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }

    // Parse settings
    const settings = business.settings ? JSON.parse(business.settings) : {};

    // Check integration status
    const integrationStatus = {
      shopify: {
        connected: !!(business.shopifyDomain && business.shopifyApiKey && business.shopifyAccessToken),
        domain: business.shopifyDomain,
        apiKey: business.shopifyApiKey,
        accessToken: business.shopifyAccessToken,
        lastSync: business.lastProductSync
      },
      pinecone: {
        connected: !!(business.pineconeApiKey && business.pineconeNamespace && business.pineconeIndexName),
        apiKey: business.pineconeApiKey,
        environment: business.pineconeEnvironment,
        namespace: business.pineconeNamespace,
        indexName: business.pineconeIndexName
      }
    };

    res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        phone: business.phone,
        website: business.website,
        industry: business.industry,
        description: business.description,
        timezone: business.timezone,
        settings,
        subscription: business.subscription,
        status: business.status,
        createdAt: business.createdAt,
        users: business.users,
        agents: business.agents,
        integrations: {
          list: business.integrations,
          status: integrationStatus
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching business:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business details'
    });
  }
});

/**
 * List all businesses (admin endpoint)
 */
router.get('/', async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        industry: true,
        status: true,
        subscription: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            agents: true,
            conversations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      businesses
    });
  } catch (error) {
    logger.error('Error fetching businesses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch businesses'
    });
  }
});

module.exports = router;