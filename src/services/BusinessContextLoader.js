const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class BusinessContextLoader {
  constructor() {
    this.prisma = new PrismaClient();
    this.contextCache = new Map(); // businessId -> context cache
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load business context for a session
   * @param {string} sessionId - Session identifier
   * @param {string} businessId - Business identifier (optional)
   * @returns {Promise<Object>} Business context object
   */
  async loadBusinessContext(sessionId, businessId = null) {
    try {
      logger.info(`Loading business context for session: ${sessionId}, businessId: ${businessId}`);

      // If no businessId provided, try to extract from session or use default
      if (!businessId) {
        businessId = await this.getBusinessIdFromSession(sessionId);
      }

      // Check cache first
      const cacheKey = businessId || 'default';
      if (this.contextCache.has(cacheKey)) {
        const cached = this.contextCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          logger.info(`Using cached business context for: ${cacheKey}`);
          return cached.context;
        }
      }

      // Load business data
      const context = await this.buildBusinessContext(businessId);
      
      // Cache the context
      this.contextCache.set(cacheKey, {
        context,
        timestamp: Date.now()
      });

      logger.info(`Business context loaded for: ${cacheKey}`, {
        hasShopify: !!context.shopify,
        hasPinecone: !!context.pinecone,
        productsCount: context.products?.length || 0
      });

      return context;
    } catch (error) {
      logger.error('Error loading business context:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Build complete business context
   * @param {string} businessId - Business identifier
   * @returns {Promise<Object>} Complete business context
   */
  async buildBusinessContext(businessId) {
    if (!businessId) {
      return this.getDefaultContext();
    }

    try {
      // Load business with all related data
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        include: {
          agents: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              personality: true,
              instructions: true,
              tools: true
            }
          }
        }
      });

      if (!business) {
        logger.warn(`Business not found: ${businessId}`);
        return this.getDefaultContext();
      }

      const context = {
        business: {
          id: business.id,
          name: business.name,
          industry: business.industry,
          description: business.description,
          settings: this.parseJSON(business.settings, {}),
          timezone: business.timezone
        },
        agents: business.agents,
        dataSource: 'database' // Default to database
      };

      // Add Shopify integration if available
      if (business.shopifyDomain && business.shopifyAccessToken) {
        context.shopify = {
          domain: business.shopifyDomain,
          storeId: business.shopifyStoreId,
          hasIntegration: true,
          lastSync: business.lastProductSync
        };
        context.dataSource = 'shopify'; // Switch to Shopify as primary source
      }

      // Add Pinecone integration if available
      if (business.pineconeNamespace && business.pineconeIndexName) {
        context.pinecone = {
          namespace: business.pineconeNamespace,
          indexName: business.pineconeIndexName,
          hasIntegration: true
        };
      }

      // Load products based on data source
      context.products = await this.loadProducts(businessId, context.dataSource === 'shopify');
      
      // Load business-specific FAQs and knowledge
      context.faqs = await this.loadFAQs(businessId);
      context.knowledge = await this.loadKnowledgeBase(businessId);

      return context;
    } catch (error) {
      logger.error('Error building business context:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Load products for business
   * @param {string} businessId - Business identifier
   * @param {boolean} useShopify - Whether to use Shopify API
   * @returns {Promise<Array>} Products array
   */
  async loadProducts(businessId, useShopify = false) {
    try {
      if (useShopify) {
        // TODO: Implement Shopify API product loading
        logger.info('Shopify product loading not yet implemented, falling back to database');
      }

      // Load from database
      const products = await this.prisma.product.findMany({
        where: {
          OR: [
            { businessId: businessId },
            { businessId: null } // Include system-wide products
          ]
        },
        orderBy: { updatedAt: 'desc' },
        take: 100 // Limit for performance
      });

      return products.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        description: product.description,
        features: product.features?.split(',') || [],
        inStock: product.inStock,
        stockCount: product.stockCount,
        rating: product.rating,
        imageUrl: product.imageUrl,
        metadata: this.parseJSON(product.metadata, {})
      }));
    } catch (error) {
      logger.error('Error loading products:', error);
      return [];
    }
  }

  /**
   * Load FAQs for business
   * @param {string} businessId - Business identifier
   * @returns {Promise<Array>} FAQs array
   */
  async loadFAQs(businessId) {
    try {
      const faqs = await this.prisma.fAQ.findMany({
        where: {
          AND: [
            {
              OR: [
                { businessId: businessId },
                { businessId: null } // Include system-wide FAQs
              ]
            },
            { isActive: true }
          ]
        },
        orderBy: { priority: 'desc' }
      });

      return faqs.map(faq => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        tags: faq.tags?.split(',') || []
      }));
    } catch (error) {
      logger.error('Error loading FAQs:', error);
      return [];
    }
  }

  /**
   * Load knowledge base for business
   * @param {string} businessId - Business identifier
   * @returns {Promise<Array>} Knowledge base array
   */
  async loadKnowledgeBase(businessId) {
    try {
      const knowledge = await this.prisma.knowledgeBase.findMany({
        where: {
          OR: [
            { businessId: businessId },
            { businessId: null } // Include system-wide knowledge
          ]
        },
        orderBy: { priority: 'desc' }
      });

      return knowledge.map(kb => ({
        id: kb.id,
        title: kb.title,
        content: kb.content,
        category: kb.category,
        tags: kb.tags?.split(',') || []
      }));
    } catch (error) {
      logger.error('Error loading knowledge base:', error);
      return [];
    }
  }

  /**
   * Get business ID from session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<string|null>} Business ID
   */
  async getBusinessIdFromSession(sessionId) {
    try {
      const session = await this.prisma.session.findFirst({
        where: { id: sessionId },
        select: { businessId: true }
      });
      return session?.businessId || null;
    } catch (error) {
      logger.error('Error getting business ID from session:', error);
      return null;
    }
  }

  /**
   * Get default context for system-wide operation
   * @returns {Object} Default context
   */
  getDefaultContext() {
    return {
      business: {
        id: null,
        name: 'System Default',
        industry: 'E-commerce',
        description: 'Default system configuration',
        settings: {},
        timezone: 'UTC'
      },
      agents: [],
      products: [],
      faqs: [],
      knowledge: [],
      dataSource: 'database',
      shopify: null,
      pinecone: null
    };
  }

  /**
   * Parse JSON string safely
   * @param {string} jsonString - JSON string to parse
   * @param {*} defaultValue - Default value if parsing fails
   * @returns {*} Parsed value or default
   */
  parseJSON(jsonString, defaultValue = null) {
    try {
      return jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Clear cache for specific business or all
   * @param {string} businessId - Business ID to clear (optional)
   */
  clearCache(businessId = null) {
    if (businessId) {
      this.contextCache.delete(businessId);
      this.contextCache.delete('default');
    } else {
      this.contextCache.clear();
    }
    logger.info(`Business context cache cleared for: ${businessId || 'all'}`);
  }

  /**
   * Close database connection
   */
  async close() {
    await this.prisma.$disconnect();
  }
}

module.exports = BusinessContextLoader;