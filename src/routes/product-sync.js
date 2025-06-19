const express = require('express');
const router = express.Router();
const ProductSyncService = require('../services/ProductSyncService');
const { PrismaClient } = require('@prisma/client');

const productSyncService = new ProductSyncService();
const prisma = new PrismaClient();

/**
 * Get products sync dashboard data
 */
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const data = await productSyncService.getProductsSyncData(businessId);
    const syncStatus = productSyncService.getSyncStatus(businessId);
    
    res.json({
      success: true,
      data: {
        ...data,
        syncStatus
      }
    });
  } catch (error) {
    console.error('Get sync data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Start automatic sync (Shopify + Auto Pinecone)
 */
router.post('/:businessId/sync/auto', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    // Start sync process (non-blocking)
    productSyncService.syncProducts(businessId, {
      autoPineconeSync: true,
      onProgress: (progress) => {
        // TODO: Send via WebSocket for real-time updates
        console.log(`Sync progress for ${businessId}:`, progress);
      }
    }).catch(error => {
      console.error('Async sync error:', error);
    });
    
    res.json({
      success: true,
      message: 'Automatic sync started',
      syncType: 'auto'
    });
  } catch (error) {
    console.error('Auto sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Start manual sync (Shopify only, no Pinecone)
 */
router.post('/:businessId/sync/manual', async (req, res) => {
  console.log('🚀 MANUAL SYNC ROUTE HIT!', {
    businessId: req.params.businessId,
    hasAuth: !!req.headers.authorization,
    timestamp: new Date().toISOString()
  });
  
  try {
    const { businessId } = req.params;
    
    console.log(`Starting manual sync for business: ${businessId}`);
    
    // Start sync process (non-blocking)
    productSyncService.syncProducts(businessId, {
      autoPineconeSync: false,
      onProgress: (progress) => {
        console.log(`Manual sync progress for ${businessId}:`, progress);
      }
    }).catch(error => {
      console.error('Manual sync error:', error);
    });
    
    console.log('✅ Manual sync response sent');
    res.json({
      success: true,
      message: 'Manual sync started (Shopify only)',
      syncType: 'manual'
    });
  } catch (error) {
    console.error('❌ Manual sync route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test endpoint
 */
router.post('/:businessId/test', async (req, res) => {
  console.log('=== TEST ROUTE HIT ===', req.params.businessId);
  res.json({ success: true, message: 'Test route working' });
});

/**
 * Manual Pinecone indexing trigger
 */
router.post('/:businessId/pinecone/index', async (req, res) => {
  console.log('=== PINECONE ROUTE HIT ===', {
    businessId: req.params.businessId,
    hasAuth: !!req.headers.authorization,
    body: req.body
  });
  
  try {
    const { businessId } = req.params;
    const { productIds } = req.body; // Optional: specific products to index
    
    // Check if Pinecone is configured
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        pineconeApiKey: true,
        pineconeEnvironment: true,
        pineconeNamespace: true,
        pineconeIndexName: true
      }
    });
    
    if (!business || !business.pineconeApiKey || !business.pineconeEnvironment || !business.pineconeNamespace || !business.pineconeIndexName) {
      return res.status(400).json({
        success: false,
        error: 'Pinecone integration not configured. Please go to Integrations page and set up Pinecone with API key, environment, namespace, and index name.',
        requiresSetup: true
      });
    }
    
    // Start Pinecone indexing (non-blocking)
    console.log('Calling manualPineconeSync...');
    productSyncService.manualPineconeSync(businessId, productIds).catch(error => {
      console.error('Manual Pinecone sync error:', error);
      console.error('Error details:', error.message, error.stack);
    });
    
    res.json({
      success: true,
      message: 'Pinecone indexing started',
      syncType: 'pinecone_manual'
    });
  } catch (error) {
    console.error('Manual Pinecone sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Stop active sync
 */
router.post('/:businessId/sync/stop', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const result = await productSyncService.stopSync(businessId);
    
    res.json(result);
  } catch (error) {
    console.error('Stop sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get current sync status
 */
router.get('/:businessId/status', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const status = productSyncService.getSyncStatus(businessId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Retry failed products
 */
router.post('/:businessId/retry', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { type = 'all' } = req.body; // 'shopify', 'pinecone', or 'all'
    
    // Reset failed products status
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    if (type === 'shopify' || type === 'all') {
      await prisma.productSync.updateMany({
        where: {
          businessId,
          shopifyStatus: 'failed'
        },
        data: {
          shopifyStatus: 'pending',
          lastError: null
        }
      });
    }
    
    if (type === 'pinecone' || type === 'all') {
      await prisma.productSync.updateMany({
        where: {
          businessId,
          pineconeStatus: 'failed'
        },
        data: {
          pineconeStatus: 'pending',
          lastError: null
        }
      });
    }
    
    res.json({
      success: true,
      message: `Retry initiated for ${type} sync`
    });
  } catch (error) {
    console.error('Retry sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;