const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// POST /api/knowledge-base/save - Save final knowledge base
router.post('/save', [
  body('businessId').isString().trim(),
  body('knowledgeBase').isObject(),
  body('scrapedData').optional().isObject(),
  body('additionalFeedback').optional().isString()
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

    const { businessId, knowledgeBase, scrapedData, additionalFeedback } = req.body;
    
    logger.info('Saving knowledge base', { businessId, sectionsCount: Object.keys(knowledgeBase).length });

    // Format knowledge base for GeneralInfo tool
    const formattedKnowledgeBase = {
      businessName: scrapedData?.businessName || 'Unknown Business',
      businessCategory: scrapedData?.businessCategory || 'General',
      knowledgeSections: knowledgeBase,
      additionalInstructions: additionalFeedback || '',
      createdAt: new Date().toISOString(),
      version: '1.0'
    };

    // Save to business context as knowledge base
    const savedContext = await prisma.businessContext.upsert({
      where: { businessId },
      update: {
        knowledgeBase: JSON.stringify(formattedKnowledgeBase),
        updatedAt: new Date()
      },
      create: {
        businessId,
        knowledgeBase: JSON.stringify(formattedKnowledgeBase),
        businessInfo: scrapedData ? JSON.stringify({
          name: scrapedData.businessName,
          category: scrapedData.businessCategory,
          industry: scrapedData.industry || 'Unknown',
          businessType: scrapedData.businessType || 'Unknown'
        }) : null
      }
    });

    // Knowledge base is now stored in BusinessContext.knowledgeBase field

    logger.info('Knowledge base saved successfully', { 
      businessId, 
      sectionsCount: Object.keys(knowledgeBase).length 
    });

    res.json({
      success: true,
      message: 'Knowledge base saved successfully',
      data: {
        sectionsCount: Object.keys(knowledgeBase).length,
        businessName: formattedKnowledgeBase.businessName,
        savedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to save knowledge base', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to save knowledge base',
      details: error.message
    });
  }
});

// GET /api/knowledge-base/:businessId - Get saved knowledge base
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const businessContext = await prisma.businessContext.findUnique({
      where: { businessId }
    });

    if (!businessContext || !businessContext.knowledgeBase) {
      return res.status(404).json({
        success: false,
        error: 'Knowledge base not found'
      });
    }

    const knowledgeBase = JSON.parse(businessContext.knowledgeBase);
    
    res.json({
      success: true,
      data: knowledgeBase
    });

  } catch (error) {
    logger.error('Failed to get knowledge base', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve knowledge base',
      details: error.message
    });
  }
});

module.exports = router;