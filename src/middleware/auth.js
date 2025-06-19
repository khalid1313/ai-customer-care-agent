const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            userId: user.id, 
            businessId: user.businessId,
            email: user.email,
            role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'No authorization header provided'
            });
        }

        const token = authHeader.split(' ')[1]; // Bearer <token>
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }

        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                business: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        subscription: true
                    }
                }
            }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        if (user.business.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Business account is suspended'
            });
        }

        // Attach user to request
        req.user = user;
        req.business = user.business;

        next();
    } catch (error) {
        logger.error('Authentication error', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

// Role-based authorization
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
        }

        if (roles.length > 0 && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Business ownership check
const requireBusinessAccess = async (req, res, next) => {
    try {
        const businessId = req.params.businessId || req.body.businessId || req.query.businessId;
        
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'Business ID is required'
            });
        }

        if (req.user.businessId !== businessId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this business'
            });
        }

        next();
    } catch (error) {
        logger.error('Business access check error', error);
        res.status(500).json({
            success: false,
            error: 'Access check failed'
        });
    }
};

// API Key authentication (for external integrations)
const authenticateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key required'
            });
        }

        // Find business by API key (stored in business settings)
        const business = await prisma.business.findFirst({
            where: {
                settings: {
                    contains: apiKey
                }
            }
        });

        if (!business || business.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key'
            });
        }

        // Attach business to request
        req.business = business;
        req.isApiAuth = true;

        next();
    } catch (error) {
        logger.error('API key authentication error', error);
        res.status(500).json({
            success: false,
            error: 'API authentication failed'
        });
    }
};

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    authorize,
    requireBusinessAccess,
    authenticateApiKey
};