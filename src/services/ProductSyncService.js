const { PrismaClient } = require('@prisma/client');
const ShopifyService = require('./ShopifyService');
const OpenAI = require('openai');

class ProductSyncService {
  constructor() {
    this.prisma = new PrismaClient();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.activeSync = new Map(); // Track active sync processes per business
  }

  /**
   * Main sync function - supports both auto and manual Pinecone indexing
   */
  async syncProducts(businessId, options = {}) {
    const {
      autoPineconeSync = true,  // Auto trigger Pinecone indexing
      batchSize = 10,
      onProgress = null
    } = options;

    try {
      // Check if sync is already running
      if (this.activeSync.has(businessId)) {
        throw new Error('Sync already in progress for this business');
      }

      this.activeSync.set(businessId, { status: 'starting', progress: 0 });

      // Get business details
      const business = await this.prisma.business.findUnique({
        where: { id: businessId }
      });

      if (!business.shopifyDomain || !business.shopifyAccessToken) {
        throw new Error('Shopify integration not configured');
      }

      // Initialize Shopify service
      const shopify = new ShopifyService(business.shopifyDomain, business.shopifyAccessToken);

      // Phase 1: Download products from Shopify
      await this.downloadShopifyProducts(businessId, shopify, onProgress);

      // Phase 2: Auto Pinecone sync (if enabled)
      if (autoPineconeSync && business.pineconeApiKey) {
        await this.syncToPinecone(businessId, { batchSize, onProgress });
      }

      this.activeSync.delete(businessId);
      return { success: true, message: 'Sync completed successfully' };

    } catch (error) {
      console.error('🚨 PRODUCT SYNC ERROR:', error);
      console.error('Error stack:', error.stack);
      this.activeSync.set(businessId, { 
        status: 'error', 
        progress: 0, 
        message: error.message || 'Unknown error' 
      });
      // Don't delete immediately so frontend can see the error
      setTimeout(() => {
        this.activeSync.delete(businessId);
      }, 10000); // Keep error visible for 10 seconds
      throw error;
    }
  }

  /**
   * Download products from Shopify and store in database
   */
  async downloadShopifyProducts(businessId, shopify, onProgress) {
    try {
      this.updateSyncStatus(businessId, 'downloading_shopify', 10);
      onProgress?.({ stage: 'downloading', message: 'Fetching products from Shopify...', progress: 10 });

      // Get all products from Shopify
      const products = await shopify.getProducts(250); // Get more products
      
      this.updateSyncStatus(businessId, 'processing_shopify', 30);
      onProgress?.({ stage: 'processing', message: `Processing ${products.length} products...`, progress: 30 });

      // Process products in batches
      for (let i = 0; i < products.length; i += 10) {
        const batch = products.slice(i, i + 10);
        
        console.log(`Processing batch ${Math.floor(i/10) + 1}, products ${i+1}-${Math.min(i+10, products.length)}`);
        
        for (const product of batch) {
          try {
            console.log(`Processing product: ${product.title}`);
            await this.upsertProductSync(businessId, product);
            console.log(`✅ Successfully processed: ${product.title}`);
          } catch (error) {
            console.error(`❌ Error processing product ${product.title}:`, error);
            console.error('Product data:', product);
            throw error; // Re-throw to stop the sync
          }
        }

        const progress = 30 + ((i + batch.length) / products.length) * 40;
        this.updateSyncStatus(businessId, 'processing_shopify', progress);
        onProgress?.({ 
          stage: 'processing', 
          message: `Processed ${Math.min(i + 10, products.length)}/${products.length} products`, 
          progress 
        });
        console.log(`Batch complete. Progress: ${Math.round(progress)}%`);
      }

      this.updateSyncStatus(businessId, 'shopify_complete', 70);
      onProgress?.({ stage: 'shopify_complete', message: 'Shopify sync completed', progress: 70 });

    } catch (error) {
      console.error('Shopify download error:', error);
      throw new Error(`Failed to download from Shopify: ${error.message}`);
    }
  }

  /**
   * Sync products to Pinecone with vectorization
   */
  async syncToPinecone(businessId, options = {}) {
    const { batchSize = 5, onProgress = null, filteredProducts = null } = options;
    const logger = require('../utils/logger');
    logger.info(`=== Starting syncToPinecone for business ${businessId} ===`);

    try {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId }
      });

      if (!business.pineconeApiKey || !business.pineconeNamespace || !business.pineconeEnvironment) {
        throw new Error('Pinecone integration not configured properly. Missing API key, environment, or namespace.');
      }

      // Get products that need Pinecone indexing (exclude already indexed)
      const products = filteredProducts || await this.prisma.productSync.findMany({
        where: {
          businessId,
          shopifyStatus: 'synced',
          pineconeStatus: { 
            in: ['not_configured', 'failed', 'pending'] 
          }
        }
      });
      
      console.log(`Found ${products.length} products to sync to Pinecone`);
      
      // Use logger to ensure message appears in logs
      const logger = require('../utils/logger');
      logger.info(`Pinecone sync: Found ${products.length} products to sync for business ${businessId}`);

      if (products.length === 0) {
        onProgress?.({ stage: 'pinecone_complete', message: 'No products to index', progress: 100 });
        return;
      }

      onProgress?.({ stage: 'vectorizing', message: `Vectorizing ${products.length} products...`, progress: 75 });

      // Process in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        await this.vectorizeAndUpsertBatch(businessId, batch, business);
        
        const progress = 75 + ((i + batch.length) / products.length) * 25;
        onProgress?.({ 
          stage: 'upserting', 
          message: `Indexed ${Math.min(i + batchSize, products.length)}/${products.length} products to Pinecone`, 
          progress 
        });
      }

      onProgress?.({ stage: 'complete', message: 'All products indexed successfully', progress: 100 });

    } catch (error) {
      console.error('Pinecone sync error:', error);
      throw new Error(`Failed to sync to Pinecone: ${error.message}`);
    }
  }

  /**
   * Vectorize and upsert a batch of products to Pinecone
   */
  async vectorizeAndUpsertBatch(businessId, products, business) {
    try {
      // Use direct HTTP approach since Node.js SDK has compatibility issues
      console.log('🔧 Using direct HTTP approach for Pinecone...');
      
      const pineconeHost = 'mrsfc-ql2ujzo.svc.aped-4627-b74a.pinecone.io';
      const apiKey = 'pcsk_5maRBX_2AyaTs6eQrsHnHbZDqVHeZgMKHU2p8GVTvM62iSiLy9F24zNiofKVrtXyynTRLh';
      const targetNamespace = 'mrsfc';
      
      // Test connection first
      console.log('Testing Pinecone connection...');
      const statsResponse = await fetch(`https://${pineconeHost}/describe_index_stats`, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!statsResponse.ok) {
        throw new Error(`Pinecone connection failed: ${statsResponse.status}`);
      }
      
      const indexStats = await statsResponse.json();
      console.log('✅ Index stats:', indexStats);

      for (const product of products) {
        try {
          // Double-check if product is already indexed (race condition safety)
          const currentProduct = await this.prisma.productSync.findUnique({
            where: { id: product.id }
          });

          if (currentProduct?.pineconeStatus === 'indexed' && currentProduct?.vectorId) {
            console.log(`Skipping already indexed product: ${product.productTitle}`);
            continue;
          }

          // Check if product content has changed since last indexing
          const needsReindexing = await this.checkIfReindexingNeeded(currentProduct);
          
          if (!needsReindexing && currentProduct?.pineconeStatus === 'indexed') {
            console.log(`Product unchanged, skipping: ${product.productTitle}`);
            continue;
          }

          // Update status to vectorizing
          await this.prisma.productSync.update({
            where: { id: product.id },
            data: { pineconeStatus: 'vectorizing' }
          });

          // Create comprehensive text for vectorization
          const productText = this.createProductText(product);
          
          // Generate combined text + image embedding
          const embeddingResult = await this.generateCombinedEmbedding(productText, product.productImage);
          const embedding = embeddingResult.embedding;
          
          // Update status to upserting
          await this.prisma.productSync.update({
            where: { id: product.id },
            data: { pineconeStatus: 'upserting' }
          });

          // Prepare metadata (including image description for better search)
          const metadata = {
            businessId,
            shopifyProductId: product.shopifyProductId,
            title: product.productTitle,
            handle: product.productHandle,
            price: product.productPrice,
            category: product.productCategory,
            tags: product.productTags,
            url: product.productUrl,
            image: product.productImage,
            imageDescription: embeddingResult.imageDescription || 'No image description available', // AI-generated image description
            syncedAt: new Date().toISOString()
          };

          // Upsert to Pinecone using direct HTTP - Use only Shopify Product ID
          const vectorId = product.shopifyProductId;
          
          console.log(`Upserting product: ${product.productTitle}`);
          const upsertResponse = await fetch(`https://${pineconeHost}/vectors/upsert`, {
            method: 'POST',
            headers: {
              'Api-Key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              namespace: targetNamespace,
              vectors: [{
                id: vectorId,
                values: embedding,
                metadata
              }]
            })
          });
          
          if (!upsertResponse.ok) {
            const errorText = await upsertResponse.text();
            throw new Error(`Pinecone upsert failed: ${upsertResponse.status} - ${errorText}`);
          }
          
          console.log(`✅ Successfully indexed: ${product.productTitle}`);

          // Create content hash for change detection
          const contentHash = this.createProductContentHash(product);

          // Update success status
          await this.prisma.productSync.update({
            where: { id: product.id },
            data: {
              pineconeStatus: 'indexed',
              vectorId,
              contentHash,
              pineconeLastSync: new Date(),
              pineconeAttempts: product.pineconeAttempts + 1
            }
          });

        } catch (error) {
          // Update error status
          await this.prisma.productSync.update({
            where: { id: product.id },
            data: {
              pineconeStatus: 'failed',
              lastError: error.message,
              pineconeAttempts: product.pineconeAttempts + 1
            }
          });
          console.error(`Failed to index product ${product.productTitle}:`, error);
        }
      }

    } catch (error) {
      console.error('Batch vectorization error:', error);
      throw error;
    }
  }

  /**
   * Check if product needs reindexing based on content changes
   */
  async checkIfReindexingNeeded(product) {
    if (!product || product.pineconeStatus !== 'indexed') {
      return true; // New product or failed index
    }

    // Create current content hash
    const currentContentHash = this.createProductContentHash(product);
    
    // Compare with stored hash (if exists)
    const storedHash = product.contentHash;
    
    if (!storedHash || currentContentHash !== storedHash) {
      console.log(`Content changed for product ${product.productTitle}, reindexing needed`);
      return true;
    }

    // Check if indexing was recent (within last 24 hours) to avoid unnecessary re-indexing
    const lastIndexed = product.pineconeLastSync;
    if (lastIndexed) {
      const timeDiff = Date.now() - new Date(lastIndexed).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        console.log(`Product ${product.productTitle} indexed recently, skipping`);
        return false;
      }
    }

    return false; // No reindexing needed
  }

  /**
   * Create content hash for change detection
   */
  createProductContentHash(product) {
    const crypto = require('crypto');
    const content = [
      product.productTitle,
      product.productDescription,
      product.productCategory,
      product.productTags,
      product.productPrice
    ].join('|');
    
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Create comprehensive text for vectorization
   */
  createProductText(product) {
    const parts = [
      product.productTitle,
      product.productDescription,
      product.productCategory,
      product.productTags ? JSON.parse(product.productTags || '[]').join(' ') : '',
      `Price: ${product.productPrice}`,
    ].filter(Boolean);

    return parts.join(' | ');
  }

  /**
   * Generate OpenAI text embedding
   */
  async generateTextEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI text embedding error:', error);
      throw new Error(`Failed to generate text embedding: ${error.message}`);
    }
  }

  /**
   * Generate OpenAI image embedding using vision model
   */
  async generateImageEmbedding(imageUrl) {
    try {
      console.log('Generating image embedding for:', imageUrl);
      
      // Use OpenAI's vision model to get image description, then embed that
      const visionResponse = await this.openai.chat.completions.create({
        model: "gpt-4o", // Updated to current vision model
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this product image in detail for search purposes. Include colors, style, materials, shape, and key visual features. Keep it concise but descriptive."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 200
      });

      const imageDescription = visionResponse.choices[0].message.content;
      console.log('Image description:', imageDescription);

      // Convert the image description to embedding
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: imageDescription,
      });

      return {
        embedding: embeddingResponse.data[0].embedding,
        description: imageDescription
      };
    } catch (error) {
      console.error('OpenAI image embedding error:', error);
      throw new Error(`Failed to generate image embedding: ${error.message}`);
    }
  }

  /**
   * Generate combined embedding (text + image)
   */
  async generateCombinedEmbedding(text, imageUrl) {
    try {
      console.log('Generating combined text + image embedding...');
      
      // Generate text embedding
      const textEmbedding = await this.generateTextEmbedding(text);
      
      // Generate image embedding
      const imageResult = await this.generateImageEmbedding(imageUrl);
      const imageEmbedding = imageResult.embedding;
      
      // Combine embeddings by averaging them
      const combinedEmbedding = textEmbedding.map((textVal, index) => 
        (textVal + imageEmbedding[index]) / 2
      );
      
      console.log('✅ Combined embedding created (text + image)');
      return {
        embedding: combinedEmbedding,
        imageDescription: imageResult.description
      };
      
    } catch (error) {
      console.error('Combined embedding error:', error);
      // Fallback to text-only if image fails
      console.log('Falling back to text-only embedding...');
      const textEmbedding = await this.generateTextEmbedding(text);
      return {
        embedding: textEmbedding,
        imageDescription: null
      };
    }
  }

  /**
   * Upsert product sync record
   */
  async upsertProductSync(businessId, shopifyProduct) {
    try {
      const productData = {
        businessId,
        shopifyProductId: shopifyProduct.id.toString(),
        productTitle: shopifyProduct.title,
        productHandle: shopifyProduct.handle,
        productUrl: `https://${shopifyProduct.handle}`,
        productImage: shopifyProduct.images?.[0]?.src || null,
        productPrice: shopifyProduct.variants?.[0]?.price || '0',
        productCategory: shopifyProduct.product_type || 'General',
        productTags: JSON.stringify(shopifyProduct.tags.split(',').map(t => t.trim())),
        productDescription: shopifyProduct.body_html?.replace(/<[^>]*>/g, '') || '',
        productStatus: shopifyProduct.status || 'draft', // active, archived, draft
        inventoryQuantity: shopifyProduct.variants?.[0]?.inventory_quantity || 0,
        inventoryTracked: shopifyProduct.variants?.[0]?.inventory_management === 'shopify',
        shopifyStatus: 'synced',
        shopifyLastSync: new Date(),
        syncAttempts: 1
      };

      // Create content hash for this product and add it to the data
      const contentHash = this.createProductContentHash(productData);
      productData.contentHash = contentHash;

      return await this.prisma.productSync.upsert({
        where: {
          businessId_shopifyProductId: {
            businessId,
            shopifyProductId: shopifyProduct.id.toString()
          }
        },
        update: {
          ...productData,
          syncAttempts: { increment: 1 }
        },
        create: productData
      });

    } catch (error) {
      console.error('Product upsert error:', error);
      throw error;
    }
  }

  /**
   * Manual Pinecone sync trigger
   */
  async manualPineconeSync(businessId, productIds = null) {
    try {
      console.log('=== MANUAL PINECONE SYNC STARTED ===', { businessId, productIds });
      
      if (this.activeSync.has(businessId)) {
        throw new Error('Sync already in progress');
      }

      this.activeSync.set(businessId, { status: 'manual_pinecone', progress: 0 });
      console.log('Sync status set to manual_pinecone');

      const whereClause = {
        businessId,
        shopifyStatus: 'synced',
        productStatus: 'active', // Only active products
        OR: [
          { inventoryTracked: false }, // Products not tracking inventory (always available)
          { 
            AND: [
              { inventoryTracked: true },
              { inventoryQuantity: { gt: 0 } } // Products with inventory > 0
            ]
          }
        ]
      };

      if (productIds?.length > 0) {
        whereClause.id = { in: productIds };
      }

      // Reset Pinecone status for selected products
      await this.prisma.productSync.updateMany({
        where: whereClause,
        data: { pineconeStatus: 'pending' }
      });

      // Get the filtered products for sync
      const filteredProducts = await this.prisma.productSync.findMany({
        where: whereClause
      });

      console.log(`Manual sync will process ${filteredProducts.length} products`);

      // Sync to Pinecone with filtered products and progress updates
      await this.syncToPinecone(businessId, { 
        filteredProducts: filteredProducts,
        onProgress: (progress) => {
          // Update the active sync status with progress
          this.activeSync.set(businessId, {
            status: 'manual_pinecone',
            progress: progress.progress,
            message: progress.message
          });
          console.log(`Sync progress: ${progress.progress}% - ${progress.message}`);
        }
      });

      // Set final success status
      this.activeSync.set(businessId, {
        status: 'complete',
        progress: 100,
        message: 'Sync completed successfully'
      });

      return { success: true };

    } catch (error) {
      console.error('=== MANUAL PINECONE SYNC ERROR ===', error);
      // Set error status
      this.activeSync.set(businessId, {
        status: 'error',
        progress: 0,
        message: error.message
      });
      throw error;
    } finally {
      // Only delete the sync status if it's not in error state
      const currentStatus = this.activeSync.get(businessId);
      if (currentStatus?.status !== 'error') {
        this.activeSync.delete(businessId);
      }
    }
  }

  /**
   * Stop sync process
   */
  async stopSync(businessId) {
    if (this.activeSync.has(businessId)) {
      this.activeSync.delete(businessId);
      return { success: true, message: 'Sync stopped' };
    }
    return { success: false, message: 'No active sync found' };
  }

  /**
   * Get sync status
   */
  getSyncStatus(businessId) {
    return this.activeSync.get(businessId) || { status: 'idle', progress: 0 };
  }

  /**
   * Update sync status
   */
  updateSyncStatus(businessId, status, progress) {
    if (this.activeSync.has(businessId)) {
      this.activeSync.set(businessId, { status, progress });
    }
  }

  /**
   * Get products sync dashboard data
   */
  async getProductsSyncData(businessId) {
    const products = await this.prisma.productSync.findMany({
      where: { 
        businessId,
        productStatus: 'active' // Only show active products
      },
      orderBy: { updatedAt: 'desc' }
    });

    const stats = {
      total: products.length,
      shopify_synced: products.filter(p => p.shopifyStatus === 'synced').length,
      pinecone_indexed: products.filter(p => p.pineconeStatus === 'indexed').length,
      failed: products.filter(p => p.shopifyStatus === 'failed' || p.pineconeStatus === 'failed').length,
      pending: products.filter(p => p.pineconeStatus === 'pending' || p.pineconeStatus === 'vectorizing' || p.pineconeStatus === 'upserting').length
    };

    return { products, stats };
  }
}

module.exports = ProductSyncService;