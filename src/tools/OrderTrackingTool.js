const { DynamicTool } = require('@langchain/core/tools');
const { PrismaClient } = require('@prisma/client');
const ShopifyService = require('../services/ShopifyService');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class OrderTrackingTool {
  constructor(businessId, options = {}) {
    this.businessId = businessId;
    this.maxResults = options.maxResults || 5;
    this.shopifyService = null;
    
    this.initializeTool();
  }

  async initialize() {
    try {
      // Get order tracking configuration
      const config = await this.getOrderTrackingConfig();
      this.orderTrackingSource = config.source;
      
      // Initialize Shopify service if needed
      if ((config.source === 'shopify' || config.source === 'both') && config.shopifyConfig) {
        this.shopifyService = new ShopifyService(config.shopifyConfig.domain, config.shopifyConfig.accessToken);
        logger.info(`OrderTrackingTool initialized with source: ${config.source}`, this.businessId);
      } else {
        logger.info(`OrderTrackingTool initialized with source: ${config.source} (local only)`, this.businessId);
      }
      return true;
    } catch (error) {
      logger.error('Failed to initialize OrderTrackingTool:', error);
      throw error;
    }
  }

  async getOrderTrackingConfig() {
    try {
      // Get business settings to determine order tracking source
      const business = await prisma.business.findUnique({
        where: { id: this.businessId }
      });

      let orderTrackingSource = 'shopify'; // default
      if (business && business.settings) {
        const settings = JSON.parse(business.settings);
        orderTrackingSource = settings.orderTrackingSource || 'shopify';
      }

      return {
        source: orderTrackingSource.toLowerCase(),
        shopifyConfig: await this.getShopifyConfig()
      };
    } catch (error) {
      logger.error('Failed to get order tracking config:', error);
      return { source: 'shopify', shopifyConfig: null };
    }
  }

  async getShopifyConfig() {
    try {
      // Fetch Shopify credentials from business integrations table
      const shopifyIntegration = await prisma.integration.findFirst({
        where: {
          businessId: this.businessId,
          type: 'shopify',
          status: 'ACTIVE'
        }
      });

      if (shopifyIntegration && shopifyIntegration.config) {
        const config = JSON.parse(shopifyIntegration.config);
        if (config.domain && config.accessToken) {
          return {
            domain: config.domain,
            accessToken: config.accessToken
          };
        }
      }

      // Fallback to environment variables for development
      const domain = process.env.SHOPIFY_DOMAIN;
      const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
      
      if (domain && accessToken) {
        return { domain, accessToken };
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get Shopify config:', error);
      return null;
    }
  }

  initializeTool() {
    this.tool = new DynamicTool({
      name: 'track_order',
      description: `Track order status, shipping information, and delivery updates. This tool can:
                   - Look up orders by order number, order ID, email, or tracking number
                   - Provide real-time order status and shipping updates
                   - Show detailed order information including items and delivery address
                   - Track packages with carrier information and delivery estimates
                   - Handle order-related inquiries and provide shipping updates
                   
                   IMPORTANT: If this business uses Shopify and a customer provides only an order number,
                   you MUST ask for their email address to complete the lookup. Shopify requires both
                   order number AND email address for order tracking.
                   
                   Use this tool when customers ask about:
                   - "Where is my order?" 
                   - "Track order #12345"
                   - "When will my package arrive?"
                   - "Shipping status for order ABC123"
                   - "I haven't received my order"
                   
                   Input format: For Shopify orders, provide as "ORDER_NUMBER|EMAIL" (e.g., "176484|john@example.com")
                   For single parameter searches, provide: order number, order ID, email address, or tracking number`,
      func: async (searchQuery) => {
        const startTime = Date.now();
        
        try {
          logger.info('Order tracking initiated:', { 
            businessId: this.businessId,
            query: searchQuery 
          });

          // Validate input
          if (!searchQuery || searchQuery.trim().length === 0) {
            return this.formatErrorResponse('Please provide an order number, email address, or tracking number to track your order.');
          }

          // Parse search query for Shopify format (ORDER_NUMBER|EMAIL)
          const { orderNumber, email, combinedQuery } = this.parseSearchQuery(searchQuery);
          
          // Check if we have Shopify configuration and need both parameters
          if (this.orderTrackingSource === 'shopify' && orderNumber && !email) {
            return this.requestEmailForShopify(orderNumber);
          }
          
          // Search for orders using multiple methods
          const orderResults = await this.searchOrders(combinedQuery, { orderNumber, email });
          
          // Format results for agent
          const formattedResponse = this.formatOrderResults(orderResults, combinedQuery);
          
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          // Log successful search
          logger.info('Order tracking completed:', {
            businessId: this.businessId,
            query: combinedQuery,
            resultsCount: orderResults.length,
            processingTime,
            success: true
          });

          return formattedResponse;

        } catch (error) {
          const endTime = Date.now();
          const processingTime = endTime - startTime;

          logger.error('Order tracking failed:', {
            businessId: this.businessId,
            query: searchQuery,
            error: error.message,
            processingTime,
            success: false
          });

          return this.formatErrorResponse(
            'I encountered an issue looking up your order. Let me connect you with our support team for assistance.'
          );
        }
      }
    });
  }

  parseSearchQuery(searchQuery) {
    const cleanQuery = this.cleanSearchQuery(searchQuery);
    
    // Check for combined format: ORDER_NUMBER|EMAIL
    if (cleanQuery.includes('|')) {
      const [orderNumber, email] = cleanQuery.split('|').map(s => s.trim());
      return {
        orderNumber: orderNumber || null,
        email: email || null,
        combinedQuery: cleanQuery
      };
    }
    
    // Check if it looks like an order number (and we're using Shopify)
    const analysis = this.analyzeQuery(cleanQuery);
    if (analysis.type === 'order_number' && this.orderTrackingSource === 'shopify') {
      return {
        orderNumber: cleanQuery,
        email: null,
        combinedQuery: cleanQuery
      };
    }
    
    // Regular single parameter
    return {
      orderNumber: null,
      email: null,
      combinedQuery: cleanQuery
    };
  }

  requestEmailForShopify(orderNumber) {
    return `I found that you're looking for order **${orderNumber}**. 

Since this business uses Shopify for order tracking, I'll need your email address to locate your order. Shopify requires both the order number and email for security.

Could you please provide the email address you used when placing this order? Once I have that, I can get you the complete order status and tracking information!

Just reply with your email address, and I'll track down order ${orderNumber} for you.`;
  }

  async searchOrders(query, params = {}) {
    const orders = [];
    
    try {
      // Search based on configured source
      switch (this.orderTrackingSource) {
        case 'local':
        case 'local database':
          const localOrders = await this.searchLocalOrders(query);
          orders.push(...localOrders);
          break;
          
        case 'shopify':
          if (this.shopifyService) {
            const shopifyOrders = await this.searchShopifyOrders(query, params);
            orders.push(...shopifyOrders);
          } else {
            logger.warn('Shopify not configured but set as order tracking source');
          }
          break;
          
        default:
          // Default to Shopify if available, otherwise local
          if (this.shopifyService) {
            const defaultShopifyOrders = await this.searchShopifyOrders(query, params);
            orders.push(...defaultShopifyOrders);
          } else {
            const defaultLocalOrders = await this.searchLocalOrders(query);
            orders.push(...defaultLocalOrders);
          }
      }
      
      // Remove duplicates and sort by most recent
      const uniqueOrders = this.deduplicateOrders(orders);
      return uniqueOrders.slice(0, this.maxResults);
      
    } catch (error) {
      logger.error('Order search failed:', error);
      return [];
    }
  }

  async searchLocalOrders(query) {
    try {
      // Parse combined query format (ORDER_NUMBER|EMAIL)
      let orderNumber = null;
      let email = null;
      let searchQuery = query;
      
      if (query.includes('|')) {
        const [orderPart, emailPart] = query.split('|').map(s => s.trim());
        orderNumber = orderPart;
        email = emailPart;
        searchQuery = orderPart; // Use order number for primary search
      }
      
      const lowerQuery = searchQuery.toLowerCase();
      const lowerEmail = email ? email.toLowerCase() : null;
      
      // Build search conditions
      const searchConditions = [
        { id: { contains: searchQuery } },
        { id: { endsWith: `-${searchQuery}` } }, // Match SHOPIFY-176484 when searching for 176484
        { customerId: { contains: searchQuery } },
        { customerName: { contains: searchQuery } },
        { customerEmail: { contains: lowerQuery } },
        { trackingNumber: { contains: searchQuery } },
        { notes: { contains: searchQuery } }
      ];
      
      // If we have an email filter, add it as additional condition
      const whereClause = {
        businessId: this.businessId,
        OR: searchConditions
      };
      
      if (lowerEmail) {
        whereClause.customerEmail = { contains: lowerEmail };
      }
      
      const orders = await prisma.order.findMany({
        where: whereClause,
        orderBy: [
          { updatedAt: 'desc' }
        ],
        take: this.maxResults
      });

      return orders.map(order => ({
        source: 'local',
        orderId: order.id,
        orderNumber: order.id, // Using ID as order number for local orders
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        total: order.total,
        items: JSON.parse(order.items || '[]'),
        shippingAddress: JSON.parse(order.shippingAddress || '{}'),
        trackingNumber: order.trackingNumber,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        trackingUrl: this.generateTrackingUrl(order.trackingNumber)
      }));
      
    } catch (error) {
      logger.error('Local order search failed:', error);
      return [];
    }
  }

  async searchShopifyOrders(query, params = {}) {
    try {
      const { orderNumber, email } = params;
      
      // If we have both order number and email, do targeted search
      if (orderNumber && email) {
        const specificOrderResult = await this.shopifyService.getOrderByNumberAndEmail(orderNumber, email);
        if (specificOrderResult.success) {
          return [this.formatShopifyOrder(specificOrderResult.order)];
        }
        // If not found with specific method, fall through to general search
      }
      
      // Try different formats for Shopify order lookup
      const searchVariants = [
        query,                    // Original query
        query.startsWith('#') ? query.substring(1) : `#${query}`,  // Toggle # prefix
        query.toString()          // Ensure string format
      ];
      
      // First try to get a specific order by ID or name
      for (const variant of searchVariants) {
        const singleOrderResult = await this.shopifyService.getOrder(variant);
        if (singleOrderResult.success) {
          // If we have an email requirement, verify it matches
          if (email && singleOrderResult.order.email && 
              singleOrderResult.order.email.toLowerCase() !== email.toLowerCase()) {
            continue; // Skip this order if email doesn't match
          }
          return [this.formatShopifyOrder(singleOrderResult.order)];
        }
      }
      
      // If not found, search through recent orders
      const ordersResult = await this.shopifyService.getOrders(50);
      if (!ordersResult.success) {
        return [];
      }
      
      const lowerQuery = query.toLowerCase();
      const numericQuery = query.replace(/[^0-9]/g, ''); // Extract just numbers
      const lowerEmail = email ? email.toLowerCase() : null;
      
      const matchingOrders = ordersResult.orders.filter(order => {
        // If email is specified, it must match
        if (lowerEmail && order.email && order.email.toLowerCase() !== lowerEmail) {
          return false;
        }
        
        return (
          order.name?.toLowerCase().includes(lowerQuery) ||
          order.name?.replace(/[^0-9]/g, '') === numericQuery ||  // Match just the numbers
          order.email?.toLowerCase().includes(lowerQuery) ||
          order.orderNumber?.toString().includes(query) ||
          order.fulfillments?.some(f => f.trackingNumber?.includes(query)) ||
          order.customer?.email?.toLowerCase().includes(lowerQuery) ||
          order.customer?.firstName?.toLowerCase().includes(lowerQuery) ||
          order.customer?.lastName?.toLowerCase().includes(lowerQuery)
        );
      });
      
      return matchingOrders.map(order => this.formatShopifyOrder(order));
      
    } catch (error) {
      logger.error('Shopify order search failed:', error);
      return [];
    }
  }

  formatShopifyOrder(shopifyOrder) {
    return {
      source: 'shopify',
      orderId: shopifyOrder.shopifyId,
      orderNumber: shopifyOrder.orderNumber || shopifyOrder.name,
      orderName: shopifyOrder.name,
      customerName: shopifyOrder.customer ? 
        `${shopifyOrder.customer.firstName} ${shopifyOrder.customer.lastName}`.trim() : 
        'N/A',
      customerEmail: shopifyOrder.email || shopifyOrder.customer?.email,
      status: this.mapShopifyStatus(shopifyOrder.financialStatus, shopifyOrder.fulfillmentStatus),
      financialStatus: shopifyOrder.financialStatus,
      fulfillmentStatus: shopifyOrder.fulfillmentStatus,
      total: shopifyOrder.totalPrice,
      currency: shopifyOrder.currency,
      items: shopifyOrder.lineItems || [],
      shippingAddress: shopifyOrder.shippingAddress,
      trackingInfo: shopifyOrder.trackingInfo || [],
      trackingNumber: shopifyOrder.trackingInfo?.[0]?.trackingNumber,
      trackingUrl: shopifyOrder.trackingInfo?.[0]?.trackingUrl,
      trackingCompany: shopifyOrder.trackingInfo?.[0]?.trackingCompany,
      createdAt: shopifyOrder.createdAt,
      updatedAt: shopifyOrder.updatedAt
    };
  }

  mapShopifyStatus(financialStatus, fulfillmentStatus) {
    // Map Shopify statuses to user-friendly status
    if (fulfillmentStatus === 'fulfilled') {
      return 'DELIVERED';
    } else if (fulfillmentStatus === 'partial') {
      return 'PARTIALLY_SHIPPED';
    } else if (fulfillmentStatus === 'shipped') {
      return 'SHIPPED';
    } else if (financialStatus === 'paid') {
      return 'PROCESSING';
    } else if (financialStatus === 'pending') {
      return 'PENDING_PAYMENT';
    } else if (financialStatus === 'authorized') {
      return 'CONFIRMED';
    } else if (financialStatus === 'refunded') {
      return 'REFUNDED';
    } else {
      return 'PENDING';
    }
  }

  deduplicateOrders(orders) {
    const seen = new Set();
    return orders.filter(order => {
      const key = order.orderNumber || order.orderId;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  generateTrackingUrl(trackingNumber) {
    if (!trackingNumber) return null;
    
    // Generate tracking URLs for common carriers
    if (trackingNumber.match(/^1Z/)) {
      return `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`;
    } else if (trackingNumber.match(/^\d{12}$/)) {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    } else if (trackingNumber.match(/^\d{10,14}$/)) {
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    }
    
    return null;
  }

  cleanSearchQuery(query) {
    return query
      .trim()
      .replace(/[^\w\s@.-|]/g, '') // Keep alphanumeric, spaces, @, ., -, and | (pipe)
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 100); // Limit length
  }

  formatOrderResults(orders, query) {
    if (!orders || orders.length === 0) {
      return this.generateIntelligentFollowUp(query);
    }

    if (orders.length === 1) {
      return this.formatSingleOrder(orders[0]);
    } else {
      return this.formatMultipleOrders(orders, query);
    }
  }

  formatSingleOrder(order) {
    const statusEmoji = this.getStatusEmoji(order.status);
    const statusText = this.getStatusText(order.status);
    
    return `📦 **Order Found!**

**${statusEmoji} Order ${order.orderName || order.orderNumber}**
**Status: ${statusText}**

👤 **Customer:** ${order.customerName}
📧 **Email:** ${order.customerEmail}
💰 **Total:** ${order.currency ? `${order.total} ${order.currency}` : `$${order.total}`}
📅 **Ordered:** ${new Date(order.createdAt).toLocaleDateString()}

📋 **Items:**
${this.formatOrderItems(order.items)}

${order.trackingNumber ? `
🚚 **Shipping Information:**
**Tracking Number:** ${order.trackingNumber}
${order.trackingCompany ? `**Carrier:** ${order.trackingCompany}` : ''}
${order.trackingUrl ? `**Track Package:** [${order.trackingNumber}](${order.trackingUrl})` : ''}` : ''}

${order.shippingAddress ? `
📍 **Shipping Address:**
${this.formatShippingAddress(order.shippingAddress)}` : ''}

${this.getStatusMessage(order.status)}

Need help with this order? I can:
- 📱 Provide detailed tracking updates
- 📧 Resend confirmation emails
- 🔄 Help with returns or exchanges
- 📞 Connect you with our shipping team

What would you like to know?`;
  }

  formatMultipleOrders(orders, query) {
    const orderList = orders.map((order, index) => {
      const statusEmoji = this.getStatusEmoji(order.status);
      const statusText = this.getStatusText(order.status);
      
      return `${index + 1}. **${statusEmoji} Order ${order.orderName || order.orderNumber}**
   ${statusText} | ${order.currency ? `${order.total} ${order.currency}` : `$${order.total}`}
   📅 ${new Date(order.createdAt).toLocaleDateString()}
   ${order.trackingNumber ? `📦 Tracking: ${order.trackingNumber}` : ''}`;
    }).join('\n\n');

    return `📦 **Found ${orders.length} Orders matching "${query}":**

${orderList}

Please let me know which order you'd like detailed information about, or I can help you with:
- 🔍 Get detailed status for a specific order
- 📱 Track a specific package
- 📧 Resend order confirmations
- 🔄 Process returns or exchanges

Which order interests you, or what would you like me to help with?`;
  }

  formatOrderItems(items) {
    if (!items || items.length === 0) {
      return 'No items listed';
    }
    
    return items.slice(0, 5).map(item => {
      const name = item.title || item.productName || item.name;
      const quantity = item.quantity || 1;
      const price = item.price;
      
      return `• ${quantity}x ${name}${price ? ` - $${price}` : ''}`;
    }).join('\n') + (items.length > 5 ? `\n• ... and ${items.length - 5} more items` : '');
  }

  formatShippingAddress(address) {
    if (!address) return 'No shipping address available';
    
    if (typeof address === 'string') {
      try {
        address = JSON.parse(address);
      } catch {
        return address;
      }
    }
    
    const parts = [];
    if (address.firstName || address.lastName) {
      parts.push(`${address.firstName || ''} ${address.lastName || ''}`.trim());
    }
    if (address.address1 || address.street) {
      parts.push(address.address1 || address.street);
    }
    if (address.address2) {
      parts.push(address.address2);
    }
    
    const cityState = [];
    if (address.city) cityState.push(address.city);
    if (address.province || address.state) cityState.push(address.province || address.state);
    if (cityState.length > 0) parts.push(cityState.join(', '));
    
    if (address.zip || address.zipCode) {
      parts.push(address.zip || address.zipCode);
    }
    if (address.country) {
      parts.push(address.country);
    }
    
    return parts.join('\n');
  }

  getStatusEmoji(status) {
    const emojiMap = {
      'PENDING': '⏳',
      'PENDING_PAYMENT': '💳',
      'CONFIRMED': '✅',
      'PROCESSING': '🏭',
      'SHIPPED': '🚛',
      'PARTIALLY_SHIPPED': '📦',
      'DELIVERED': '🎉',
      'CANCELLED': '❌',
      'REFUNDED': '💸',
      'RETURNED': '🔄'
    };
    return emojiMap[status] || '📋';
  }

  getStatusText(status) {
    const statusMap = {
      'PENDING': 'Pending',
      'PENDING_PAYMENT': 'Awaiting Payment',
      'CONFIRMED': 'Order Confirmed',
      'PROCESSING': 'Processing',
      'SHIPPED': 'Shipped',
      'PARTIALLY_SHIPPED': 'Partially Shipped',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
      'REFUNDED': 'Refunded',
      'RETURNED': 'Returned'
    };
    return statusMap[status] || status;
  }

  getStatusMessage(status) {
    const messages = {
      'PENDING': '⏳ Your order is being reviewed and will be processed soon.',
      'PENDING_PAYMENT': '💳 Waiting for payment confirmation.',
      'CONFIRMED': '✅ Your order has been confirmed and will be processed shortly.',
      'PROCESSING': '🏭 Your order is being prepared for shipment.',
      'SHIPPED': '🚛 Your order is on its way!',
      'PARTIALLY_SHIPPED': '📦 Part of your order has been shipped.',
      'DELIVERED': '🎉 Your order has been delivered!',
      'CANCELLED': '❌ This order has been cancelled.',
      'REFUNDED': '💸 This order has been refunded.',
      'RETURNED': '🔄 This order has been returned.'
    };
    return messages[status] || '';
  }

  generateIntelligentFollowUp(query) {
    const analysis = this.analyzeQuery(query);
    
    switch (analysis.type) {
      case 'order_number':
        return this.handleOrderNumberNotFound(query, analysis);
      case 'email':
        return this.handleEmailNotFound(query, analysis);
      case 'tracking_number':
        return this.handleTrackingNotFound(query, analysis);
      case 'partial_info':
        return this.handlePartialInfo(query, analysis);
      case 'vague_request':
      default:
        return this.handleVagueRequest(query);
    }
  }

  analyzeQuery(query) {
    const cleanQuery = query.toLowerCase().trim();
    
    // Email patterns (check first to avoid conflicts)
    if (/@/.test(cleanQuery)) {
      return {
        type: 'email',
        value: cleanQuery,
        confidence: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanQuery) ? 0.9 : 0.6
      };
    }
    
    // Tracking number patterns (check before order numbers)
    if (/^(trk|track|ups|fedex|1z)[a-z0-9]+$/i.test(cleanQuery) || 
        /^\d{10,20}$/.test(cleanQuery)) {
      return {
        type: 'tracking_number',
        value: cleanQuery,
        confidence: 0.8
      };
    }
    
    // Order number patterns (Shopify uses #123456 format, some systems use ORD-2024-001)
    if (/^#?\d{4,}$/.test(cleanQuery) || 
        /^(order\s*#?\s*)?[a-z]*-?\d{4,}$/i.test(cleanQuery)) {
      return {
        type: 'order_number',
        value: cleanQuery,
        confidence: /^\d{5,}$/.test(cleanQuery) || cleanQuery.includes('#') || cleanQuery.includes('ord') ? 0.9 : 0.8
      };
    }
    
    // Vague requests (check before partial info)
    if (/track.*order|order.*track|my.*order|where.*order|status/i.test(cleanQuery)) {
      return {
        type: 'vague_request',
        value: cleanQuery,
        confidence: 0.9
      };
    }
    
    // Partial info (just numbers, names, etc.)
    if (/^\d{1,3}$/.test(cleanQuery) || 
        /^[a-z\s]{2,}$/i.test(cleanQuery)) {
      return {
        type: 'partial_info',
        value: cleanQuery,
        confidence: 0.5
      };
    }
    
    return {
      type: 'vague_request',
      value: cleanQuery,
      confidence: 0.3
    };
  }

  handleOrderNumberNotFound(query, analysis) {
    if (analysis.confidence > 0.8) {
      // High confidence it's an order number
      return `I can see you're looking for order ${query}. I searched our system but couldn't locate this specific order.

To help me find your order, could you also provide the email address you used when placing the order? This will help me search across all our systems and locate your order details.

Alternatively, if you have your order confirmation email handy, that would give me all the details I need to track it down for you!`;
    } else {
      // Lower confidence - might not be complete order number
      return `I see you're looking for order ${query}. This looks like it might be a partial order number or reference.

Could you help me by providing:
- The complete order number from your confirmation email?
- Or the email address you used when ordering?

Order numbers usually look like #176484, #12345, or ORD-2024-001. If you check your email for "Order Confirmation" that should have the full details I need to track your order!`;
    }
  }

  handleEmailNotFound(query, analysis) {
    if (analysis.confidence > 0.8) {
      return `I searched for orders using the email ${query} but didn't find any matches.

A few things to double-check:
- Is this the exact email address you used when placing the order?
- Did you perhaps use a different email (work, personal, or family member's email)?
- When approximately did you place the order?

Sometimes customers use different email addresses for different purchases, or orders might be in a different system if they're older. 

Would you like to try a different email address, or do you happen to have an order number from your confirmation email?`;
    } else {
      return `I see you provided ${query} - this looks like it might be an email address, but I want to make sure I have it right.

Could you:
- Confirm the complete email address (sometimes autocorrect changes them)
- Or share an order number if you have it handy
- Check your email for order confirmations and let me know what you find

I'm here to help you track down your order!`;
    }
  }

  handleTrackingNotFound(query, analysis) {
    return `I searched for tracking number ${query} but couldn't locate it in our system.

Let me help you track your package:

First, let's verify the tracking number:
- Is this the complete tracking number? They're usually 10-20 characters long
- Double-check for any missing letters or numbers

If you're not sure, check your shipping confirmation email - it should have the full tracking number and might even be clickable.

Alternatively, I can look up your order using:
- Your order number (like #12345 or ORD-2024-001)
- The email address you used when ordering
- Approximate date when you placed the order

What would be easiest for you to provide?`;
  }

  handlePartialInfo(query, analysis) {
    return `I see you're looking for information about "${query}".

To help me find your order, could you provide a bit more detail? For example:
- Is this part of an order number? (I can search for the complete number)
- Part of your name or email address?
- Something else from your order?

The most helpful information would be:
- Your complete email address used for the order
- Full order number from your confirmation email
- Or just tell me more about what you're looking for

What additional details can you share?`;
  }

  handleVagueRequest(query) {
    return `I'd love to help you track your order!

To find your order quickly, I'll need one of these:
- Email address you used when ordering
- Order number (like #176484, #12345, or ORD-2024-001)
- Tracking number from your shipping notification

Or you can just tell me what you're looking for, like:
- "I need to track my recent order"
- "I'm looking for an order I placed last week"
- "I haven't received my package yet"

The fastest way is usually your order confirmation email - it has all the details I need!

What information do you have available?`;
  }

  formatErrorResponse(message) {
    return `I apologize, but ${message}

To track your order, you can provide:
📧 **Email address** used for the order
🔢 **Order number** from your confirmation email
📦 **Tracking number** from shipping notification
🆔 **Order ID** from your account

You can also:
• Check your email for order confirmations
• Log into your account to view order history
• Contact our support team for personalized assistance

How else can I help you today?`;
  }

  // Tool interface for LangChain
  getTool() {
    return this.tool;
  }

  // Health check
  async healthCheck() {
    try {
      const dbConnected = await prisma.$queryRaw`SELECT 1`;
      const shopifyConnected = this.shopifyService ? 
        (await this.shopifyService.testConnection()).success : 
        false;
      
      return {
        status: 'healthy',
        components: {
          database: dbConnected ? 'connected' : 'disconnected',
          shopify: shopifyConnected ? 'connected' : 'not_configured',
          local_orders: 'available'
        },
        businessId: this.businessId
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

module.exports = OrderTrackingTool;