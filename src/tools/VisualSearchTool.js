const { DynamicTool } = require('@langchain/core/tools');
const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const OpenAI = require('openai');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class VisualSearchTool {
  constructor(businessId, options = {}) {
    this.businessId = businessId;
    this.namespace = `business_${businessId}_products`;
    
    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT || 'insig1'
    });
    this.index = null;
    
    // Initialize OpenAI for vision and embeddings
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002'
    });
    
    // Search configuration
    this.maxResults = options.maxResults || 5;
    this.similarityThreshold = options.similarityThreshold || 0.7;
    
    this.initializeTool();
  }

  async initialize() {
    try {
      this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
      logger.info('VisualSearchTool initialized for business:', this.businessId);
      return true;
    } catch (error) {
      logger.error('Failed to initialize VisualSearchTool:', error);
      throw error;
    }
  }

  initializeTool() {
    this.tool = new DynamicTool({
      name: 'visual_analysis',
      description: `Analyze any uploaded image and respond appropriately based on content. This intelligent tool can:
                   - Identify and search for products when users upload product images
                   - Extract order information from order tracking screenshots
                   - Analyze website screenshots and UI elements  
                   - Provide helpful responses for unrelated images
                   - Understand user intent from visual context
                   Use this tool whenever a user uploads ANY type of image.
                   Input should be the base64 image data.`,
      func: async (imageData) => {
        const startTime = Date.now();
        
        try {
          logger.info('Visual analysis initiated:', { 
            businessId: this.businessId,
            hasImage: !!imageData
          });

          // Validate input
          if (!imageData || typeof imageData !== 'string') {
            return this.formatErrorResponse('Please provide a valid image for analysis.');
          }

          // Step 1: Analyze image to understand intent and content
          const analysisResult = await this.analyzeImageIntelligently(imageData);
          
          // Step 2: Route based on detected intent
          let finalResponse;
          switch (analysisResult.intent) {
            case 'product_search':
              finalResponse = await this.handleProductSearch(analysisResult);
              break;
            case 'order_tracking':
              finalResponse = await this.handleOrderTracking(analysisResult);
              break;
            case 'website_screenshot':
              finalResponse = await this.handleWebsiteScreenshot(analysisResult);
              break;
            case 'general_inquiry':
              finalResponse = await this.handleGeneralInquiry(analysisResult);
              break;
            case 'unrelated':
            default:
              finalResponse = await this.handleUnrelatedImage(analysisResult);
              break;
          }
          
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          // Log successful analysis
          logger.info('Visual analysis completed:', {
            businessId: this.businessId,
            intent: analysisResult.intent,
            processingTime,
            success: true
          });

          return finalResponse;

        } catch (error) {
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          logger.error('Visual search failed:', {
            businessId: this.businessId,
            error: error.message,
            processingTime,
            success: false
          });

          return this.formatErrorResponse(
            'I encountered an issue analyzing the image. Let me connect you with our support team for assistance.'
          );
        }
      }
    });
  }

  async analyzeImageIntelligently(imageData) {
    try {
      // Check if Vision API is explicitly disabled
      if (process.env.SKIP_VISION_API === 'true') {
        logger.info('Using development mode - skipping Vision API call');
        return this.getDevelopmentMockAnalysis(imageData);
      }

      // Ensure imageData is in the correct format (base64 with data URL prefix)
      let base64Image = imageData;
      if (!imageData.startsWith('data:image/')) {
        base64Image = `data:image/jpeg;base64,${imageData}`;
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and determine the user's intent. Respond with a JSON object containing:

{
  "intent": "product_search|order_tracking|website_screenshot|general_inquiry|unrelated",
  "content_type": "product|order_screen|website_ui|receipt|personal_photo|document|other",
  "description": "detailed description of what you see",
  "extracted_data": {
    // For products: product details, brand, type, etc.
    // For orders: order number, status, tracking info, etc.
    // For websites: URL, page type, elements visible, etc.
    // For other: relevant extracted information
  },
  "confidence": 0.0-1.0,
  "suggested_action": "what the customer likely wants to do"
}

INTENT DEFINITIONS:
- product_search: Image shows a product they want to find/buy
- order_tracking: Screenshot of order status, tracking page, receipt
- website_screenshot: Screenshot of a website, app, or UI they need help with
- general_inquiry: Image related to customer service (damaged item, etc.)
- unrelated: Personal photos, random images not related to e-commerce

Analyze carefully and be precise with intent detection.`
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const analysisText = response.choices[0]?.message?.content || '';
      
      // Parse the JSON response
      let analysisResult;
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback if JSON parsing fails
        analysisResult = {
          intent: 'general_inquiry',
          content_type: 'other',
          description: analysisText,
          extracted_data: {},
          confidence: 0.5,
          suggested_action: 'Provide general assistance based on image content'
        };
      }
      
      logger.info('Intelligent image analysis completed:', {
        businessId: this.businessId,
        intent: analysisResult.intent,
        content_type: analysisResult.content_type,
        confidence: analysisResult.confidence
      });

      return analysisResult;
      
    } catch (error) {
      logger.error('Intelligent vision analysis failed:', error);
      // Return fallback analysis
      return {
        intent: 'general_inquiry',
        content_type: 'other',
        description: 'Unable to analyze image content',
        extracted_data: {},
        confidence: 0.1,
        suggested_action: 'Contact support for assistance'
      };
    }
  }

  // Development mock analysis to avoid Vision API costs
  getDevelopmentMockAnalysis(imageData) {
    logger.info('Generating mock analysis for development');
    
    // Simple heuristic: if it's a very small image, assume it's a test
    // For demo purposes, we'll assume it's a product search
    return {
      intent: 'product_search',
      content_type: 'product',
      description: 'This appears to be a product image. The image shows what looks like a collectible or toy item that the customer is interested in finding or purchasing.',
      extracted_data: {
        product_type: 'collectible',
        category: 'toys',
        likely_search_terms: ['collectible', 'figure', 'toy', 'anime']
      },
      confidence: 0.7,
      suggested_action: 'Search for similar collectible products in the catalog',
      development_mode: true
    };
  }

  // Handler for product search intent
  async handleProductSearch(analysisResult) {
    try {
      const description = analysisResult.description;
      const productData = analysisResult.extracted_data;
      
      // Search for products using the description and extracted data
      const searchResults = await this.searchByDescription(description);
      
      // Format results for product search
      return this.formatProductSearchResults(searchResults, analysisResult);
      
    } catch (error) {
      logger.error('Product search handling failed:', error);
      return this.formatErrorResponse('I had trouble searching for that product. Could you try describing it in text instead?');
    }
  }

  // Handler for order tracking intent
  async handleOrderTracking(analysisResult) {
    try {
      const extractedData = analysisResult.extracted_data;
      
      // Extract order information from the analysis
      const orderNumber = extractedData.order_number || extractedData.tracking_number;
      const orderStatus = extractedData.status;
      
      if (orderNumber) {
        // Try to find the order in our system
        const order = await this.findOrderByNumber(orderNumber);
        if (order) {
          return this.formatOrderTrackingResults(order, analysisResult);
        }
      }
      
      // If we can't find specific order info, provide helpful guidance
      return `📱 I can see you've shared what appears to be an order tracking screenshot. 

Based on the image, I can see: ${analysisResult.description}

${orderNumber ? `Order Number: **${orderNumber}**` : ''}
${orderStatus ? `Status: **${orderStatus}**` : ''}

To help you track your order, I can:
1. Look up your order if you provide the order number
2. Check the status of recent orders
3. Help you understand tracking information
4. Connect you with our shipping team if needed

Would you like me to look up a specific order number, or do you need help with something else?`;
      
    } catch (error) {
      logger.error('Order tracking handling failed:', error);
      return this.formatErrorResponse('I had trouble reading that order information. Could you please share the order number as text?');
    }
  }

  // Handler for website screenshot intent
  async handleWebsiteScreenshot(analysisResult) {
    try {
      const extractedData = analysisResult.extracted_data;
      const description = analysisResult.description;
      
      return `💻 I can see you've shared a website screenshot. 

**What I can see:** ${description}

${extractedData.url ? `**URL:** ${extractedData.url}` : ''}
${extractedData.page_type ? `**Page Type:** ${extractedData.page_type}` : ''}
${extractedData.error_message ? `**Error:** ${extractedData.error_message}` : ''}

How can I help you with this?
- 🔧 **Technical issue?** I can guide you through troubleshooting
- 🛒 **Shopping help?** I can help you find products or navigate our site
- 📞 **Account issue?** I can connect you with the right support team
- ❓ **General question?** Just let me know what you need!

What specific assistance are you looking for?`;
      
    } catch (error) {
      logger.error('Website screenshot handling failed:', error);
      return this.formatErrorResponse('I can see that\'s a website screenshot. How can I help you with it?');
    }
  }

  // Handler for general inquiry intent
  async handleGeneralInquiry(analysisResult) {
    try {
      const description = analysisResult.description;
      const extractedData = analysisResult.extracted_data;
      
      return `🤝 I can see your image shows: ${description}

Based on what I can see, here's how I can help:

${extractedData.issue_type === 'damaged_item' ? 
  '📦 **Damaged Item:** I can help you report this and arrange a replacement or refund.' : 
  extractedData.issue_type === 'wrong_item' ?
  '🔄 **Wrong Item:** I can help you return this and get the correct item sent out.' :
  extractedData.issue_type === 'size_comparison' ?
  '📏 **Size/Fit Question:** I can help you find the right size or alternative products.' :
  '💡 **General Assistance:** I\'m here to help with whatever you need!'
}

What would you like me to help you with?
- 🛒 Browse our products
- 📋 Check your orders  
- 🔄 Handle returns/exchanges
- 📞 Connect you with specialized support
- ❓ Answer any questions

Just let me know!`;
      
    } catch (error) {
      logger.error('General inquiry handling failed:', error);
      return this.formatErrorResponse('I can see your image. How can I help you today?');
    }
  }

  // Handler for unrelated images
  async handleUnrelatedImage(analysisResult) {
    const description = analysisResult.description;
    
    return `🖼️ I can see you've shared an image: ${description}

While this looks like a nice image, it doesn't seem to be related to shopping, orders, or customer service. 

Here's how I can help you instead:
- 🛒 **Shop our products** - Browse our catalog or search for specific items
- 📦 **Track orders** - Check your order status or shipping information  
- 🔄 **Returns & exchanges** - Get help with returns or product issues
- 💬 **Customer support** - Ask questions about our policies or services

Is there something specific I can help you with today?`;
  }

  // Helper method to find orders
  async findOrderByNumber(orderNumber) {
    try {
      return await prisma.order.findFirst({
        where: {
          businessId: this.businessId,
          id: orderNumber
        }
      });
    } catch (error) {
      logger.error('Order lookup failed:', error);
      return null;
    }
  }

  async searchByDescription(description) {
    try {
      if (!this.index) {
        await this.initialize();
      }

      // Create embedding for the description
      const queryEmbedding = await this.embeddings.embedQuery(description);
      
      // Search Pinecone using semantic similarity
      const searchResponse = await this.index.query({
        vector: queryEmbedding,
        topK: this.maxResults * 2,
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
                  searchType: 'visual_semantic',
                  matchReason: 'Visual similarity analysis'
                });
              }
            }
          } catch (productError) {
            logger.warn('Failed to fetch product from visual search result:', productError);
          }
        }
      }

      // Also perform keyword search as fallback
      const keywordResults = await this.performKeywordSearch(description);
      
      // Combine results, prioritizing visual matches
      const combinedResults = this.combineVisualResults(semanticResults, keywordResults);
      
      return combinedResults.slice(0, this.maxResults);
      
    } catch (error) {
      logger.error('Visual search by description failed:', error);
      // Fallback to keyword search only
      return await this.performKeywordSearch(description);
    }
  }

  async performKeywordSearch(description) {
    try {
      // Extract key terms from the description
      const searchTerms = this.extractSearchTerms(description);
      const combinedQuery = searchTerms.join(' ');
      
      const products = await prisma.productSync.findMany({
        where: {
          businessId: this.businessId,
          productStatus: 'active',
          OR: [
            { productTitle: { contains: combinedQuery } },
            { productDescription: { contains: combinedQuery } },
            { productCategory: { contains: combinedQuery } },
            { productTags: { contains: combinedQuery } },
            // Search individual terms
            ...searchTerms.map(term => ({
              productTitle: { contains: term }
            })),
            ...searchTerms.map(term => ({
              productDescription: { contains: term }
            }))
          ]
        },
        take: this.maxResults,
        orderBy: [
          { productTitle: 'asc' }
        ]
      });

      return products.map(product => ({
        ...product,
        searchScore: this.calculateKeywordScore(product, description, searchTerms),
        searchType: 'visual_keyword',
        matchReason: 'Keyword match from image description'
      }));

    } catch (error) {
      logger.error('Visual keyword search failed:', error);
      return [];
    }
  }

  combineVisualResults(semanticResults, keywordResults) {
    const combined = new Map();
    
    // Add semantic results with higher weight
    semanticResults.forEach(product => {
      combined.set(product.id, {
        ...product,
        visualScore: product.searchScore,
        keywordScore: 0,
        finalScore: product.searchScore * 0.8 // Higher weight for visual matches
      });
    });
    
    // Add or enhance with keyword results
    keywordResults.forEach(product => {
      if (combined.has(product.id)) {
        const existing = combined.get(product.id);
        existing.keywordScore = product.searchScore;
        existing.finalScore = (existing.visualScore * 0.7) + (product.searchScore * 0.3);
      } else {
        combined.set(product.id, {
          ...product,
          visualScore: 0,
          keywordScore: product.searchScore,
          finalScore: product.searchScore * 0.5 // Lower weight for keyword-only
        });
      }
    });
    
    // Convert back to array and sort by final score
    return Array.from(combined.values()).sort((a, b) => b.finalScore - a.finalScore);
  }

  extractSearchTerms(description) {
    // Extract meaningful terms from the AI-generated description
    return description
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
      .filter(term => !['the', 'and', 'or', 'but', 'for', 'with', 'this', 'that', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'can', 'could', 'would', 'should'].includes(term))
      .slice(0, 10); // Limit to top 10 terms
  }

  calculateKeywordScore(product, originalDescription, searchTerms) {
    let score = 0;
    const description = originalDescription.toLowerCase();
    const title = product.productTitle.toLowerCase();
    const desc = product.productDescription?.toLowerCase() || '';
    
    // Exact phrase matches get highest score
    if (title.includes(description.substring(0, 50))) {
      score += 1.0;
    }
    
    // Individual term matches
    searchTerms.forEach(term => {
      if (title.includes(term)) score += 0.4;
      if (desc.includes(term)) score += 0.2;
      if (product.productCategory?.toLowerCase().includes(term)) score += 0.3;
      if (product.productTags?.toLowerCase().includes(term)) score += 0.1;
    });
    
    return Math.min(score, 1.0);
  }

  formatProductSearchResults(products, analysisResult) {
    const imageDescription = analysisResult.description;
    const extractedData = analysisResult.extracted_data;
    
    if (!products || products.length === 0) {
      return `🖼️ I analyzed your product image and can see: "${imageDescription.substring(0, 100)}..."

${extractedData.product_type ? `**Product Type:** ${extractedData.product_type}` : ''}
${extractedData.brand ? `**Brand:** ${extractedData.brand}` : ''}
${extractedData.character ? `**Character:** ${extractedData.character}` : ''}

Unfortunately, I couldn't find any matching products in our catalog. Here are some suggestions:

1. Try uploading a clearer image from a different angle
2. Search using text description: "${extractedData.product_type || 'the product'}"
3. Browse our related categories
4. Contact our support team for personalized assistance

Would you like me to help you search for something specific, or shall I connect you with our support team?`;
    }

    const productList = products.map((product, index) => {
      const stockStatus = product.inventoryQuantity > 0 
        ? `✅ In Stock (${product.inventoryQuantity} available)` 
        : '❌ Out of Stock';
      
      const price = product.productPrice ? `$${product.productPrice}` : 'Price TBD';
      const matchType = product.searchType === 'visual_semantic' ? '🔍 Visual Match' : '🔤 Keyword Match';
      
      return `${index + 1}. **${product.productTitle}** ${matchType}
   ${price} | ${stockStatus}
   ${product.productDescription ? product.productDescription.substring(0, 100) + '...' : ''}
   ${product.productCategory ? `Category: ${product.productCategory}` : ''}`;
    }).join('\n\n');

    const searchSummary = `🖼️ **Product Image Analysis**: ${imageDescription.substring(0, 150)}...

${extractedData.product_type ? `**Detected:** ${extractedData.product_type}` : ''}
${extractedData.brand ? ` | **Brand:** ${extractedData.brand}` : ''}

Found ${products.length} matching product${products.length === 1 ? '' : 's'}:

${productList}

Would you like more details about any of these products, or shall I help you refine your search?`;

    return searchSummary;
  }

  formatOrderTrackingResults(order, analysisResult) {
    return `📦 **Order Found!**

Based on your screenshot, I found this order in our system:

**Order #${order.id}**
- Status: **${order.status}**
- Total: **$${order.total}**
- Order Date: **${new Date(order.createdAt).toLocaleDateString()}**
${order.trackingNumber ? `- Tracking: **${order.trackingNumber}**` : ''}

**What I saw in your image:** ${analysisResult.description}

Is this the order you were asking about? I can help you with:
- 📱 Detailed tracking information
- 📧 Resend tracking emails  
- 🚚 Shipping updates
- 📞 Contact shipping carrier
- ❓ Any other questions about this order

What would you like to know?`;
  }

  formatErrorResponse(message) {
    return `I apologize, but ${message}

In the meantime, you can:
• Try uploading a different image with better lighting
• Browse our product categories manually
• Contact our support team for personalized assistance
• Use text search to describe what you're looking for

How else can I help you today?`;
  }

  // Tool interface for LangChain
  getTool() {
    return this.tool;
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
          openai_vision: 'available',
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

module.exports = VisualSearchTool;