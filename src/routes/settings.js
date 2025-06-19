const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { authenticate, requireBusinessAccess } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/settings/ai-mode - Update AI mode settings
router.post('/ai-mode', authenticate, [
  body('aiModeEnabled').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { aiModeEnabled } = req.body;
    
    // Use businessId from authenticated user
    const businessId = req.user.businessId;
    
    logger.info('AI mode update request - DETAILED', {
      businessId,
      requestedBusinessId: req.body.businessId,
      userId: req.user.id,
      userEmail: req.user.email,
      aiModeEnabled,
      headers: {
        authorization: req.headers.authorization ? 'Bearer ***' : 'MISSING',
        contentType: req.headers['content-type']
      },
      fullUser: {
        id: req.user.id,
        email: req.user.email,
        businessId: req.user.businessId,
        role: req.user.role
      }
    });
    
    // Get current business settings
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }
    
    // Parse existing settings or create new ones
    let settings = {};
    if (business.settings) {
      try {
        settings = JSON.parse(business.settings);
      } catch (error) {
        logger.warn('Invalid JSON in business settings, creating new settings object');
      }
    }
    
    // Update AI mode settings
    settings.aiModeEnabled = aiModeEnabled;
    settings.aiModeUpdatedAt = new Date().toISOString();
    
    // Update business with new settings
    await prisma.business.update({
      where: { id: businessId },
      data: {
        settings: JSON.stringify(settings),
        updatedAt: new Date()
      }
    });
    
    logger.info('AI mode settings updated successfully', { businessId, aiModeEnabled });
    
    res.json({
      success: true,
      message: 'AI mode settings updated successfully',
      settings: {
        aiModeEnabled: settings.aiModeEnabled,
        updatedAt: settings.aiModeUpdatedAt
      }
    });
    
  } catch (error) {
    logger.error('Error updating AI mode settings:', error);
    res.status(500).json({
      error: 'Failed to update AI mode settings',
      details: error.message
    });
  }
});

// POST /api/settings/order-tracking - Update order tracking settings
router.post('/order-tracking', authenticate, [
  body('orderTrackingSource').isIn(['shopify', 'local'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { orderTrackingSource } = req.body;
    
    // Use businessId from authenticated user
    const businessId = req.user.businessId;
    
    logger.info('Order tracking update request', {
      businessId,
      requestedBusinessId: req.body.businessId,
      userId: req.user.id,
      orderTrackingSource
    });
    
    // Get current business settings
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }
    
    // Parse existing settings or create new ones
    let settings = {};
    if (business.settings) {
      try {
        settings = JSON.parse(business.settings);
      } catch (error) {
        logger.warn('Invalid JSON in business settings, creating new settings object');
      }
    }
    
    // Update order tracking settings
    settings.orderTrackingSource = orderTrackingSource;
    settings.autoDetectOrderFormat = true; // Keep existing or set default
    settings.showTrackingUrls = true;
    settings.orderStatusUpdates = true;
    
    // Save updated settings
    await prisma.business.update({
      where: { id: businessId },
      data: {
        settings: JSON.stringify(settings, null, 2)
      }
    });
    
    logger.info(`Order tracking source updated to: ${orderTrackingSource}`, { businessId });
    
    // Clear any cached agents for this business so they reload with new settings
    // Try to access the agentsMap from ai-chat route
    try {
      const aiChatRoute = require('./ai-chat');
      if (aiChatRoute.clearAgentsForBusiness) {
        aiChatRoute.clearAgentsForBusiness(businessId);
        logger.info(`Cleared AI chat agents for business: ${businessId}`);
      }
    } catch (error) {
      logger.warn('Could not clear AI chat agents:', error.message);
    }
    
    res.json({
      success: true,
      orderTrackingSource: orderTrackingSource,
      message: 'Order tracking settings updated successfully'
    });
    
  } catch (error) {
    logger.error('Failed to update order tracking settings:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      details: error.message
    });
  }
});

// GET /api/settings/ai-mode/:businessId - Get current AI mode settings
router.get('/ai-mode/:businessId', authenticate, requireBusinessAccess, async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }
    
    let settings = {};
    if (business.settings) {
      try {
        settings = JSON.parse(business.settings);
      } catch (error) {
        logger.warn('Invalid JSON in business settings');
      }
    }
    
    res.json({
      success: true,
      aiModeEnabled: settings.aiModeEnabled || false,
      aiModeUpdatedAt: settings.aiModeUpdatedAt || null
    });
    
  } catch (error) {
    logger.error('Failed to get AI mode settings:', error);
    res.status(500).json({
      error: 'Failed to get AI mode settings',
      details: error.message
    });
  }
});

// GET /api/settings/order-tracking/:businessId - Get current order tracking settings
router.get('/order-tracking/:businessId', authenticate, requireBusinessAccess, async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    if (!business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }
    
    let settings = {};
    if (business.settings) {
      try {
        settings = JSON.parse(business.settings);
      } catch (error) {
        logger.warn('Invalid JSON in business settings');
      }
    }
    
    res.json({
      orderTrackingSource: settings.orderTrackingSource || 'shopify',
      autoDetectOrderFormat: settings.autoDetectOrderFormat || true,
      showTrackingUrls: settings.showTrackingUrls || true,
      orderStatusUpdates: settings.orderStatusUpdates || true
    });
    
  } catch (error) {
    logger.error('Failed to get order tracking settings:', error);
    res.status(500).json({
      error: 'Failed to get settings',
      details: error.message
    });
  }
});

module.exports = router;