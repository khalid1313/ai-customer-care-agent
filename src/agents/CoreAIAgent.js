const { ChatOpenAI } = require('@langchain/openai');
const { BufferMemory } = require('langchain/memory');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const { DynamicTool } = require('@langchain/core/tools');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class CoreAIAgent {
  constructor(businessId) {
    this.businessId = businessId;
    this.conversationLogs = [];
    
    // Simple LangChain setup
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1000,
      openAIApiKey: process.env.OPENAI_API_KEY
    });

    // Simple memory for conversation
    this.memory = new BufferMemory({
      memoryKey: 'chat_history',
      returnMessages: true,
      inputKey: 'input',
      outputKey: 'output'
    });

    // Initialize ProductSearchTool, VisualSearchTool, OrderTrackingTool, and CreateTicketTool
    const ProductSearchTool = require('../tools/ProductSearchTool');
    const VisualSearchTool = require('../tools/VisualSearchTool');
    const OrderTrackingTool = require('../tools/OrderTrackingTool');
    const CreateTicketTool = require('../tools/CreateTicketTool');
    this.productSearchTool = new ProductSearchTool(businessId);
    this.visualSearchTool = new VisualSearchTool(businessId);
    this.orderTrackingTool = new OrderTrackingTool(businessId);
    this.createTicketTool = new CreateTicketTool(businessId);

    // Create tools
    this.tools = this.createTools();
    this.agent = null;
  }

  createTools() {
    return [
      // Tool 1: Search Products using ProductSearchTool
      this.productSearchTool.getTool(),
      
      // Tool 2: Visual Analysis using VisualSearchTool (intelligent image analysis)
      this.visualSearchTool.getTool(),
      
      // Tool 3: Order Tracking using OrderTrackingTool
      this.orderTrackingTool.getTool(),
      
      // Tool 4: Create Support Ticket using CreateTicketTool
      this.createTicketTool.getTool(),

      // Tool 5: Check Product Availability  
      new DynamicTool({
        name: 'checkStock',
        description: 'Check if a specific product is in stock. Use when user asks about availability.',
        func: async (productName) => {
          try {
            const product = await this.getProductByName(productName);
            if (!product) return `Product "${productName}" not found.`;
            
            return `${product.productTitle}: ${
              product.inventoryQuantity > 0 
                ? `In stock (${product.inventoryQuantity} available)` 
                : 'Out of stock'
            }`;
          } catch (error) {
            logger.error('Stock check error:', error);
            return 'Sorry, I could not check stock availability.';
          }
        }
      }),

      // Tool 5: Get Support/FAQ
      new DynamicTool({
        name: 'getSupport',
        description: 'Answer FAQ and support questions about shipping, returns, policies, etc.',
        func: async (query) => {
          try {
            const answer = await this.getSupport(query);
            return answer;
          } catch (error) {
            logger.error('Support query error:', error);
            return 'Please contact our support team at support@company.com for assistance.';
          }
        }
      })
    ];
  }

  async initialize() {
    try {
      // Initialize ProductSearchTool, VisualSearchTool, and OrderTrackingTool
      await this.productSearchTool.initialize();
      await this.visualSearchTool.initialize();
      await this.orderTrackingTool.initialize();

      // Get order tracking configuration to customize instructions
      const orderConfig = await this.orderTrackingTool.getOrderTrackingConfig();

      // Core system prompt
      const systemPrompt = `You are SARAH, a helpful e-commerce assistant for business ID: ${this.businessId}. 
      Help customers find products, track orders, and answer questions.
      Be friendly, concise, and helpful.
      
      🚨 URGENT: If customer mentions "refund" in ANY way, you MUST use the create_ticket tool immediately. Do NOT give generic support responses.
      
      IMPORTANT: Always use the provided tools to get accurate information:
      - When customers ask about products or search text, use the product_search tool
      - When customers upload ANY type of image, use the visual_analysis tool (it's intelligent and handles all image types)
      - When customers ask about orders, tracking, or shipping, use the track_order tool
      - The visual_analysis tool can handle: product images, order screenshots, website screenshots, damaged items, receipts, etc.
      - Use tools based on the user's input and needs
      
      CRITICAL TICKET CREATION RULES:
      You MUST ALWAYS create a support ticket using the create_ticket tool when customers say ANY of these words or phrases:
      - "refund", "refund me", "money back", "want my money back", "return my money"
      - "return", "return this", "send back", "don't want this", "want to return"
      - "broken", "defective", "not working", "damaged", "faulty"
      - "delayed", "late", "lost package", "missing order", "shipping problem"
      - "billing issue", "charged wrong", "payment problem"
      - "manager", "supervisor", "escalate", "this is unacceptable"
      
      EXAMPLE: If customer says "refund me pls" or "I want refund" or "give me my money back" - you MUST use create_ticket tool immediately.
      
      Ticket creation format - use create_ticket tool with JSON like:
      priority: high, category: refund, title: Refund Request - [description], 
      description: Customer requesting refund. Details: [message and context],
      customerImpact: Customer wants money back, suggestedAction: Process refund request
      
      NEVER tell customers to "contact support team" for refunds/returns - CREATE A TICKET INSTEAD.
      After creating ticket, say: "I've created support ticket [TICKET_NUMBER] for your refund request. Our team will process this and contact you within [timeframe]."
      
      ${orderConfig.source === 'shopify' ? `
      SHOPIFY ORDER TRACKING SPECIAL INSTRUCTIONS:
      - This business uses Shopify for order tracking
      - When a customer provides ONLY an order number (like "176484" or "#176484"), you MUST ask for their email address
      - Shopify requires BOTH order number AND email address for security
      - Once you have both, use the track_order tool with format: "ORDER_NUMBER|EMAIL" (e.g., "176484|user@email.com")
      - Do NOT attempt to track with just an order number when using Shopify
      - Always explain that email is needed for security when asking for it
      ` : ''}
      
      If a product is not found, suggest alternatives or ask for clarification.
      
      Available tools: ${this.tools.map(t => t.name).join(', ')}`;

      // Initialize LangChain agent
      this.agent = await initializeAgentExecutorWithOptions(
        this.tools,
        this.llm,
        {
          agentType: 'chat-conversational-react-description',
          memory: this.memory,
          verbose: true, // Enable for debugging
          maxIterations: 5,
          agentArgs: {
            systemMessage: systemPrompt
          }
        }
      );

      logger.info('Core AI Agent initialized', { 
        businessId: this.businessId,
        toolsCount: this.tools.length,
        tools: this.tools.map(t => t.name)
      });
      return true;
    } catch (error) {
      logger.error('Failed to initialize agent:', error);
      throw error;
    }
  }

  async chat(message, options = {}) {
    const startTime = Date.now();
    let toolsUsed = [];
    let reasoning = ['Received user message: ' + message.substring(0, 100)];
    
    try {
      // Set conversation context for CreateTicket tool
      if (options.senderId || options.conversationId) {
        this.createTicketTool.setConversationContext({
          conversationId: options.conversationId,
          customerId: options.senderId,
          customerName: options.customerName || null,
          customerEmail: options.customerEmail || null
        });
      }

      // EXPLICIT TICKET DETECTION - Force ticket creation for support requests
      const messageText = typeof message === 'string' ? message.toLowerCase() : '';
      
      // Define ticket trigger keywords by category
      const ticketKeywords = {
        refund: ['refund', 'money back', 'return my money', 'want my money', 'give me money'],
        return: ['return this', 'send back', 'want to return', 'return item', 'return product'],
        defective: ['broken', 'defective', 'not working', 'damaged', 'faulty', 'malfunctioning'],
        shipping: ['delayed', 'late', 'lost package', 'missing order', 'shipping problem', 'delivery issue'],
        billing: ['billing issue', 'charged wrong', 'payment problem', 'wrong charge', 'billing error'],
        escalation: ['manager', 'supervisor', 'escalate', 'this is unacceptable', 'speak to manager']
      };
      
      // Check for any ticket-worthy keywords
      let ticketCategory = null;
      let ticketPriority = 'normal';
      
      for (const [category, keywords] of Object.entries(ticketKeywords)) {
        if (keywords.some(keyword => messageText.includes(keyword))) {
          ticketCategory = category;
          // Set priority based on category
          ticketPriority = ['refund', 'defective', 'escalation'].includes(category) ? 'high' : 'normal';
          break;
        }
      }
      
      if (ticketCategory) {
        reasoning.push(`🚨 ${ticketCategory.toUpperCase()} REQUEST DETECTED - Creating ticket immediately`);
        
        try {
          // Map categories to valid ticket categories
          const categoryMapping = {
            'defective': 'product_issue',
            'escalation': 'general'
          };
          
          const validCategory = categoryMapping[ticketCategory] || ticketCategory;
          
          const ticketData = {
            priority: ticketPriority,
            category: validCategory,
            title: `${ticketCategory.charAt(0).toUpperCase() + ticketCategory.slice(1)} Request - ${message.substring(0, 50)}`,
            description: `Customer requesting ${ticketCategory}. Original message: "${message}". Conversation ID: ${options.conversationId || 'unknown'}`,
            customerImpact: this.getCustomerImpact(ticketCategory),
            suggestedAction: this.getSuggestedAction(ticketCategory)
          };
          
          const ticketResult = await this.createTicketTool.getTool().func(JSON.stringify(ticketData));
          reasoning.push('✅ Ticket created successfully');
          
          // Return the ticket creation response directly
          return {
            response: ticketResult,
            success: true,
            metrics: {
              processingTime: (Date.now() - startTime) / 1000,
              toolsCalled: ['create_ticket'],
              confidence: 1.0,
              escalated: true
            },
            reasoning,
            toolsUsed: [{ tool: 'create_ticket', input: JSON.stringify(ticketData), output: ticketResult }]
          };
        } catch (ticketError) {
          reasoning.push('❌ Ticket creation failed: ' + ticketError.message);
          logger.error('Manual ticket creation failed:', ticketError);
          // Fall through to normal LangChain processing
        }
      }
      // Handle multi-modal input
      let input = message;
      
      if (options.image) {
        // Process image directly through visual analysis tool first
        reasoning.push('Image upload detected - processing with visual analysis tool');
        
        try {
          const visualAnalysisResult = await this.visualSearchTool.getTool().func(options.image);
          
          // Now use the analysis result instead of raw image data
          input = `User uploaded an image and said: "${message}". I analyzed the image and found: ${visualAnalysisResult}`;
          reasoning.push('Image processed successfully - continuing with text-based conversation');
          
          // Set a flag to indicate we already processed the image
          this.imageAlreadyProcessed = true;
          
        } catch (imageError) {
          logger.error('Image processing failed:', imageError);
          input = `User uploaded an image and said: "${message}". However, I had trouble processing the image. Please help the user with their request as best you can.`;
          reasoning.push('Image processing failed - using fallback approach');
        }
      }

      reasoning.push('Processing with LangChain agent');

      // Let LangChain handle the conversation
      const response = await this.agent.call({ input });
      
      // Extract tool usage information
      if (response.intermediateSteps && response.intermediateSteps.length > 0) {
        toolsUsed = response.intermediateSteps.map(step => ({
          tool: step.action?.tool || 'unknown',
          input: step.action?.toolInput || '',
          output: step.observation || ''
        }));
        reasoning.push(`Used ${toolsUsed.length} tool(s): ${toolsUsed.map(t => t.tool).join(', ')}`);
      } else {
        reasoning.push('No tools were used for this response');
      }

      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;

      // Calculate confidence based on tool usage and response
      const confidence = this.calculateConfidence(response, toolsUsed);
      reasoning.push(`Calculated confidence: ${(confidence * 100).toFixed(1)}%`);

      // Log the interaction
      const logEntry = {
        timestamp: new Date().toISOString(),
        user_message: message,
        agent_response: response.output,
        tools_used: toolsUsed,
        processing_time: processingTime,
        confidence: confidence,
        reasoning: reasoning
      };
      this.conversationLogs.push(logEntry);

      logger.info('Chat processed', {
        businessId: this.businessId,
        toolsUsed: toolsUsed.length,
        processingTime,
        confidence
      });

      return {
        response: response.output,
        success: true,
        metrics: {
          processingTime,
          toolsCalled: toolsUsed.map(t => t.tool),
          confidence,
          escalated: confidence < 0.7
        },
        reasoning,
        toolsUsed,
        debugFlags: {
          used_langchain: true,
          used_memory: true,
          tools_available: this.tools.length,
          confidence_score: confidence,
          escalation_triggered: confidence < 0.7
        }
      };
    } catch (error) {
      const endTime = Date.now();
      const processingTime = (endTime - startTime) / 1000;
      
      logger.error('Chat error:', error);
      reasoning.push('Error occurred: ' + error.message);
      
      return {
        response: 'I apologize, but I encountered an error. Please try again.',
        success: false,
        error: error.message,
        metrics: {
          processingTime,
          toolsCalled: [],
          confidence: 0,
          escalated: true
        },
        reasoning,
        toolsUsed: []
      };
    }
  }

  calculateConfidence(response, toolsUsed) {
    let confidence = 0.8; // Base confidence

    // Increase confidence if tools were used successfully
    if (toolsUsed.length > 0) {
      const successfulTools = toolsUsed.filter(t => !t.output.includes('error'));
      confidence += (successfulTools.length / toolsUsed.length) * 0.15;
    }

    // Decrease confidence if response is too short
    if (response.output && response.output.length < 50) {
      confidence -= 0.2;
    }

    // Decrease confidence if response contains uncertainty phrases
    const uncertaintyPhrases = ['not sure', 'maybe', 'might be', 'probably'];
    const hasUncertainty = uncertaintyPhrases.some(phrase => 
      response.output.toLowerCase().includes(phrase)
    );
    if (hasUncertainty) {
      confidence -= 0.15;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Simple tool implementations using real data
  async searchProducts(query) {
    const products = await prisma.productSync.findMany({
      where: {
        businessId: this.businessId,
        productStatus: 'active',
        OR: [
          { productTitle: { contains: query } },
          { productDescription: { contains: query } },
          { productCategory: { contains: query } }
        ]
      },
      take: 5,
      orderBy: { productTitle: 'asc' }
    });

    return products;
  }

  async getProductByName(productName) {
    return await prisma.productSync.findFirst({
      where: {
        businessId: this.businessId,
        productStatus: 'active',
        productTitle: { contains: productName }
      }
    });
  }

  async getOrder(orderId) {
    return await prisma.order.findFirst({
      where: {
        businessId: this.businessId,
        id: orderId
      }
    });
  }

  async getSupport(query) {
    // First try to find in FAQ
    const faq = await prisma.fAQ.findFirst({
      where: {
        businessId: this.businessId,
        isActive: true,
        OR: [
          { question: { contains: query } },
          { answer: { contains: query } }
        ]
      }
    });

    if (faq) {
      return `${faq.question}\n\n${faq.answer}`;
    }

    // Default responses for common queries
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('shipping')) {
      return 'We offer free shipping on orders over $50. Standard shipping takes 5-7 business days.';
    }
    
    if (queryLower.includes('return')) {
      return 'We have a 30-day return policy. Items must be unused and in original packaging.';
    }
    
    if (queryLower.includes('payment')) {
      return 'We accept all major credit cards, PayPal, and Apple Pay.';
    }

    return 'For specific questions, please contact our support team at support@company.com or call 1-800-SUPPORT.';
  }

  async searchByImage(imageData) {
    // TODO: Implement image search using Pinecone vector search
    // For now, return a placeholder
    logger.info('Visual search requested for business:', this.businessId);
    
    // This would query Pinecone using image embeddings
    // For demo, return some products
    return await prisma.productSync.findMany({
      where: {
        businessId: this.businessId,
        productStatus: 'active'
      },
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
  }

  formatProducts(products) {
    if (!products || products.length === 0) {
      return 'No products found matching your search.';
    }

    return products.map(p => 
      `• ${p.productTitle} - $${p.productPrice} ${
        p.inventoryQuantity > 0 ? '✅ In Stock' : '❌ Out of Stock'
      }`
    ).join('\n');
  }

  formatOrder(order) {
    if (!order) {
      return 'Order not found. Please check your order ID.';
    }

    return `Order #${order.id}
Status: ${order.status}
Total: $${order.total}
Created: ${new Date(order.createdAt).toLocaleDateString()}
${order.trackingNumber ? `Tracking: ${order.trackingNumber}` : ''}`;
  }

  // Get customer impact description for ticket categories
  getCustomerImpact(category) {
    const impacts = {
      refund: 'Customer wants money back for their purchase',
      return: 'Customer wants to return purchased item',
      defective: 'Customer received defective/broken product',
      shipping: 'Customer has shipping or delivery issues',
      billing: 'Customer has billing or payment concerns',
      escalation: 'Customer is frustrated and needs management attention'
    };
    return impacts[category] || 'Customer needs assistance';
  }

  // Get suggested action for ticket categories
  getSuggestedAction(category) {
    const actions = {
      refund: 'Process refund request and verify return policy compliance',
      return: 'Initiate return process and provide shipping labels',
      defective: 'Investigate product issue and arrange replacement or refund',
      shipping: 'Track shipment and resolve delivery issues',
      billing: 'Review billing details and correct any errors',
      escalation: 'Escalate to manager for immediate attention'
    };
    return actions[category] || 'Review and address customer concern';
  }

  // Get agent statistics
  getStats() {
    return {
      businessId: this.businessId,
      toolCount: this.tools.length,
      model: 'gpt-4',
      initialized: !!this.agent
    };
  }
}

module.exports = CoreAIAgent;