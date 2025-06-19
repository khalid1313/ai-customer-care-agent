const { DynamicTool } = require('@langchain/core/tools');
const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class ProductSearchTool {
  constructor(businessId, options = {}) {
    this.businessId = businessId;
    this.namespace = `business_${businessId}_products`;
    
    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT || 'insig1'
    });
    this.index = null;
    
    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002'
    });
    
    // Search configuration
    this.maxResults = options.maxResults || 5;
    this.similarityThreshold = options.similarityThreshold || 0.7;
    this.enableHybridSearch = options.enableHybridSearch !== false;
    
    this.initializeTool();
  }

  async initialize() {
    try {
      this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
      logger.info('ProductSearchTool initialized for business:', this.businessId);
      return true;
    } catch (error) {
      logger.error('Failed to initialize ProductSearchTool:', error);
      throw error;
    }
  }

  initializeTool() {
    this.tool = new DynamicTool({
      name: 'product_search',
      description: `Search for products by name, description, category, or features. 
                   Use this tool when customers ask about finding products, comparing items, 
                   checking availability, or need product recommendations. 
                   Input should be the search query or product description.`,
      func: async (searchQuery) => {
        const startTime = Date.now();
        
        try {
          logger.info('Product search initiated:', { 
            businessId: this.businessId,
            query: searchQuery 
          });

          // Validate input
          if (!searchQuery || searchQuery.trim().length === 0) {
            return this.formatErrorResponse('Please provide a product name or description to search for.');
          }

          // Clean and prepare search query
          const cleanQuery = this.cleanSearchQuery(searchQuery);
          
          // Perform hybrid search (semantic + keyword)
          const searchResults = await this.performHybridSearch(cleanQuery);
          
          // Format results for agent
          const formattedResponse = this.formatSearchResults(searchResults, cleanQuery);
          
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          // Log successful search
          logger.info('Product search completed:', {
            businessId: this.businessId,
            query: cleanQuery,
            resultsCount: searchResults.length,
            processingTime,
            success: true
          });

          return formattedResponse;

        } catch (error) {
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          logger.error('Product search failed:', {
            businessId: this.businessId,
            query: searchQuery,
            error: error.message,
            processingTime,
            success: false
          });

          return this.formatErrorResponse(
            'I encountered an issue searching for products. Let me connect you with our support team for assistance.'
          );
        }
      }
    });
  }

  async performHybridSearch(query) {
    try {
      // Step 1: Semantic search using Pinecone
      const semanticResults = await this.performSemanticSearch(query);
      
      // Step 2: Keyword search using database
      const keywordResults = await this.performKeywordSearch(query);
      
      // Step 3: Combine and rank results
      const combinedResults = this.combineSearchResults(semanticResults, keywordResults);
      
      // Step 4: Apply business rules and filters
      const filteredResults = this.applyBusinessFilters(combinedResults);
      
      return filteredResults.slice(0, this.maxResults);
      
    } catch (error) {
      logger.error('Hybrid search failed:', error);
      // Fallback to keyword search only
      return await this.performKeywordSearch(query);
    }
  }

  async performSemanticSearch(query) {
    try {
      if (!this.index) {
        await this.initialize();
      }

      // Create embedding for the search query
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Search Pinecone
      const searchResponse = await this.index.query({
        topK: this.maxResults * 2, // Get more results to allow for filtering
        vector: queryEmbedding,
        includeMetadata: true,
        namespace: this.namespace
      });

      // Convert Pinecone results to product format
      const semanticResults = [];
      for (const match of searchResponse.matches || []) {
        if (match.score >= this.similarityThreshold) {
          try {
            const productData = match.metadata;
            if (productData && productData.productId) {
              // Get full product details from database
              const product = await prisma.productSync.findUnique({
                where: { 
                  id: productData.productId,
                  businessId: this.businessId,
                  productStatus: 'active'
                }
              });
              
              if (product) {
                semanticResults.push({
                  ...product,
                  searchScore: match.score,
                  searchType: 'semantic'
                });
              }
            }
          } catch (productError) {
            logger.warn('Failed to fetch product from semantic result:', productError);
          }
        }
      }

      return semanticResults;
      
    } catch (error) {
      logger.error('Semantic search failed:', error);
      return [];
    }
  }

  async performKeywordSearch(query) {
    try {
      const searchTerms = this.extractSearchTerms(query);
      
      const products = await prisma.productSync.findMany({
        where: {
          businessId: this.businessId,
          productStatus: 'active',
          OR: [
            { productTitle: { contains: query } },
            { productDescription: { contains: query } },
            { productCategory: { contains: query } },
            { productTags: { contains: query } },
            // Search individual terms
            ...searchTerms.map(term => ({
              productTitle: { contains: term }
            })),
            ...searchTerms.map(term => ({
              productDescription: { contains: term }
            }))
          ]
        },
        take: this.maxResults * 2,
        orderBy: [
          { productTitle: 'asc' }
        ]
      });

      // Calculate keyword relevance scores
      return products.map(product => ({
        ...product,
        searchScore: this.calculateKeywordScore(product, query, searchTerms),
        searchType: 'keyword'
      }));

    } catch (error) {
      logger.error('Keyword search failed:', error);
      return [];
    }
  }

  combineSearchResults(semanticResults, keywordResults) {
    const combined = new Map();
    
    // Add semantic results
    semanticResults.forEach(product => {
      combined.set(product.id, {
        ...product,
        semanticScore: product.searchScore,
        keywordScore: 0
      });
    });
    
    // Add or enhance with keyword results
    keywordResults.forEach(product => {
      if (combined.has(product.id)) {
        const existing = combined.get(product.id);
        existing.keywordScore = product.searchScore;
        existing.combinedScore = (existing.semanticScore * 0.7) + (product.searchScore * 0.3);
      } else {
        combined.set(product.id, {
          ...product,
          semanticScore: 0,
          keywordScore: product.searchScore,
          combinedScore: product.searchScore * 0.6 // Lower weight for keyword-only results
        });
      }
    });
    
    // Convert back to array and sort by combined score
    return Array.from(combined.values()).sort((a, b) => b.combinedScore - a.combinedScore);
  }

  applyBusinessFilters(results) {
    return results.filter(product => {
      // Filter out inactive products
      if (product.productStatus !== 'active') return false;
      
      // Filter out out-of-stock items (configurable)
      // if (product.inventoryQuantity <= 0) return false;
      
      // Add more business-specific filters here
      
      return true;
    });
  }

  calculateKeywordScore(product, originalQuery, searchTerms) {
    let score = 0;
    const query = originalQuery.toLowerCase();
    
    // Exact match in title gets highest score
    if (product.productTitle.toLowerCase().includes(query)) {
      score += 1.0;
    }
    
    // Individual term matches
    searchTerms.forEach(term => {
      if (product.productTitle.toLowerCase().includes(term)) score += 0.3;
      if (product.productDescription?.toLowerCase().includes(term)) score += 0.2;
      if (product.productCategory?.toLowerCase().includes(term)) score += 0.2;
      if (product.productTags?.toLowerCase().includes(term)) score += 0.1;
    });
    
    // Boost popular/featured products
    if (product.featuredProduct) score += 0.1;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  extractSearchTerms(query) {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2) // Filter out short words
      .filter(term => !['the', 'and', 'or', 'but', 'for', 'with'].includes(term)); // Filter stop words
  }

  cleanSearchQuery(query) {
    return query
      .trim()
      .replace(/[^\w\s-]/g, ' ') // Remove special characters except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 200); // Limit length
  }

  formatSearchResults(products, query) {
    if (!products || products.length === 0) {
      return `I couldn't find any products matching "${query}". Here are some suggestions:

1. Try using different keywords or broader terms
2. Check the spelling of product names
3. Browse our categories to discover similar items
4. Contact our support team for personalized recommendations

Would you like me to help you search for something else or connect you with our support team?`;
    }

    const productList = products.map((product, index) => {
      const stockStatus = product.inventoryQuantity > 0 
        ? `✅ In Stock (${product.inventoryQuantity} available)` 
        : '❌ Out of Stock';
      
      const price = product.productPrice ? `$${product.productPrice}` : 'Price TBD';
      
      return `${index + 1}. **${product.productTitle}**
   ${price} | ${stockStatus}
   ${product.productDescription ? product.productDescription.substring(0, 100) + '...' : ''}
   ${product.productCategory ? `Category: ${product.productCategory}` : ''}`;
    }).join('\n\n');

    const searchSummary = `Found ${products.length} product${products.length === 1 ? '' : 's'} matching "${query}":

${productList}

Would you like more details about any of these products, or shall I help you search for something else?`;

    return searchSummary;
  }

  formatErrorResponse(message) {
    return `I apologize, but ${message}

In the meantime, you can:
• Try browsing our product categories
• Contact our support team for personalized assistance
• Visit our website to explore our full catalog

How else can I help you today?`;
  }

  // Tool interface for LangChain
  getTool() {
    return this.tool;
  }

  // Admin methods for monitoring
  async getSearchStats() {
    try {
      // This would typically come from a dedicated analytics table
      return {
        businessId: this.businessId,
        totalProducts: await prisma.productSync.count({
          where: { businessId: this.businessId, productStatus: 'active' }
        }),
        searchesPerformed: 0, // Would track this in production
        avgResponseTime: 0, // Would calculate from logs
        topSearchTerms: [], // Would aggregate from search logs
        successRate: 0 // Would calculate from tool usage logs
      };
    } catch (error) {
      logger.error('Failed to get search stats:', error);
      return null;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const pineconeConnected = !!this.index;
      const dbConnected = await prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        components: {
          pinecone: pineconeConnected ? 'connected' : 'disconnected',
          database: dbConnected ? 'connected' : 'disconnected',
          embeddings: 'available'
        },
        businessId: this.businessId,
        namespace: this.namespace
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        businessId: this.businessId
      };
    }
  }
}

module.exports = ProductSearchTool;