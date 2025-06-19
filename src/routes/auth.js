const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const prisma = new PrismaClient();

// Register business and owner
router.post('/register', [
    body('businessName').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').isString().trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
    body('lastName').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
    body('phone').optional().isMobilePhone(),
    body('website').optional().isURL(),
    body('industry').optional().isString().trim()
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

        const {
            businessName,
            email,
            password,
            firstName,
            lastName,
            phone,
            website,
            industry
        } = req.body;

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate API key for the business
        const apiKey = `sk_${uuidv4().replace(/-/g, '')}`;

        // Create business and owner in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create business
            const business = await tx.business.create({
                data: {
                    name: businessName,
                    email: email,
                    phone: phone,
                    website: website,
                    industry: industry,
                    settings: JSON.stringify({
                        apiKey: apiKey,
                        allowRegistration: false,
                        requireEmailVerification: false,
                        defaultTimezone: 'UTC'
                    })
                }
            });

            // Create owner user
            const user = await tx.user.create({
                data: {
                    businessId: business.id,
                    email: email,
                    password: hashedPassword,
                    firstName: firstName,
                    lastName: lastName,
                    role: 'owner'
                }
            });

            // Create default agent
            const agent = await tx.agent.create({
                data: {
                    businessId: business.id,
                    name: 'AI Customer Assistant',
                    description: 'Your intelligent customer service assistant',
                    personality: 'friendly, helpful, and professional',
                    instructions: 'Provide excellent customer service and use tools to give accurate information.',
                    tools: JSON.stringify([
                        'ProductSearchTool',
                        'ProductAvailabilityTool',
                        'OrderTrackingTool',
                        'FAQTool',
                        'ShoppingCartTool',
                        'CustomerSupportTool'
                    ])
                }
            });

            return { business, user, agent };
        });

        // Generate JWT token
        const token = generateToken(result.user);

        logger.info('New business registered', {
            businessId: result.business.id,
            userId: result.user.id,
            email: email
        });

        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName,
                    role: result.user.role
                },
                business: {
                    id: result.business.id,
                    name: result.business.name,
                    subscription: result.business.subscription
                },
                agent: {
                    id: result.agent.id,
                    name: result.agent.name
                },
                token: token,
                apiKey: apiKey
            },
            message: 'Business registered successfully'
        });

    } catch (error) {
        logger.error('Registration error', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});

// Login
router.post('/login', [
    body('email').notEmpty().withMessage('Email is required'),
    body('password').notEmpty().withMessage('Password is required')
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

        const { email, password } = req.body;

        // Debug logging
        logger.info('Login attempt details', {
            email: email,
            emailType: typeof email,
            passwordProvided: !!password,
            passwordLength: password ? password.length : 0,
            passwordFirst3: password ? password.substring(0, 3) : 'none',
            passwordLast3: password ? password.substring(password.length - 3) : 'none',
            bodyKeys: Object.keys(req.body)
        });

        // Find user with business
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                business: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        subscription: true,
                        settings: true
                    }
                }
            }
        });

        if (!user) {
            logger.info('User not found for email', { email: email });
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated'
            });
        }

        if (user.business.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Business account is suspended'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            logger.info('Password validation failed', { email: email, userId: user.id });
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        // Generate JWT token
        const token = generateToken(user);

        logger.info('User logged in', {
            userId: user.id,
            businessId: user.businessId,
            email: email
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    lastLogin: user.lastLogin
                },
                business: {
                    id: user.business.id,
                    name: user.business.name,
                    subscription: user.business.subscription
                },
                token: token
            },
            message: 'Login successful'
        });

    } catch (error) {
        logger.error('Login error', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// Get current user profile
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'No authorization header'
            });
        }

        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                business: {
                    select: {
                        id: true,
                        name: true,
                        subscription: true,
                        settings: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Debug log to check user data
        logger.info('User profile data', {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    avatar: user.avatar,
                    businessId: user.businessId
                },
                business: user.business
            }
        });

    } catch (error) {
        logger.error('Get profile error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'Refresh token required'
            });
        }

        // In a production app, you'd verify the refresh token from database
        // For now, we'll just generate a new token if the old one is valid
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
        }

        const newToken = generateToken(user);

        res.json({
            success: true,
            data: { token: newToken }
        });

    } catch (error) {
        logger.error('Token refresh error', error);
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token'
        });
    }
});

// Logout (in a real app, you'd blacklist the token)
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;