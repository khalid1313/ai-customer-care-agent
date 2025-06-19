const axios = require('axios');
const logger = require('../utils/logger');

class ShopifyService {
  constructor(domain, accessToken) {
    this.domain = domain;
    this.accessToken = accessToken;
    this.baseUrl = `https://${domain}/admin/api/2023-10`;
    this.headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Test connection to Shopify store
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/shop.json`, {
        headers: this.headers
      });
      
      return {
        success: true,
        shop: response.data.shop
      };
    } catch (error) {
      logger.error('Shopify connection test failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  /**
   * Fetch products from Shopify
   */
  async getProducts(limit = 50, since_id = null) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        status: 'active'
      });
      
      if (since_id) {
        params.append('since_id', since_id);
      }

      const response = await axios.get(`${this.baseUrl}/products.json?${params}`, {
        headers: this.headers
      });

      // Return raw Shopify products for ProductSyncService compatibility
      const products = response.data.products;

      return products;
    } catch (error) {
      logger.error('Error fetching Shopify products:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message,
        products: []
      };
    }
  }

  /**
   * Fetch orders from Shopify
   */
  async getOrders(limit = 50, since_id = null, status = 'any') {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        status: status
      });
      
      if (since_id) {
        params.append('since_id', since_id);
      }

      const response = await axios.get(`${this.baseUrl}/orders.json?${params}`, {
        headers: this.headers
      });

      const orders = response.data.orders.map(order => ({
        shopifyId: order.id,
        orderNumber: order.order_number,
        name: order.name, // e.g., "#1001"
        email: order.email,
        phone: order.phone,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        totalPrice: parseFloat(order.total_price),
        subtotalPrice: parseFloat(order.subtotal_price),
        totalTax: parseFloat(order.total_tax),
        currency: order.currency,
        customer: order.customer ? {
          shopifyId: order.customer.id,
          email: order.customer.email,
          firstName: order.customer.first_name,
          lastName: order.customer.last_name,
          phone: order.customer.phone
        } : null,
        shippingAddress: order.shipping_address ? {
          firstName: order.shipping_address.first_name,
          lastName: order.shipping_address.last_name,
          address1: order.shipping_address.address1,
          address2: order.shipping_address.address2,
          city: order.shipping_address.city,
          province: order.shipping_address.province,
          country: order.shipping_address.country,
          zip: order.shipping_address.zip,
          phone: order.shipping_address.phone
        } : null,
        lineItems: order.line_items?.map(item => ({
          shopifyId: item.id,
          productId: item.product_id,
          variantId: item.variant_id,
          title: item.title,
          name: item.name,
          quantity: item.quantity,
          price: parseFloat(item.price),
          sku: item.sku,
          vendor: item.vendor,
          fulfillmentStatus: item.fulfillment_status
        })) || [],
        fulfillments: order.fulfillments?.map(fulfillment => ({
          shopifyId: fulfillment.id,
          status: fulfillment.status,
          trackingCompany: fulfillment.tracking_company,
          trackingNumber: fulfillment.tracking_number,
          trackingUrl: fulfillment.tracking_url,
          createdAt: fulfillment.created_at
        })) || [],
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        processedAt: order.processed_at
      }));

      return {
        success: true,
        orders,
        hasMore: response.data.orders.length === limit
      };
    } catch (error) {
      logger.error('Error fetching Shopify orders:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message,
        orders: []
      };
    }
  }

  /**
   * Get single product by ID
   */
  async getProduct(productId) {
    try {
      const response = await axios.get(`${this.baseUrl}/products/${productId}.json`, {
        headers: this.headers
      });

      const product = response.data.product;
      return {
        success: true,
        product: {
          shopifyId: product.id,
          name: product.title,
          description: product.body_html?.replace(/<[^>]*>/g, '') || '',
          vendor: product.vendor,
          productType: product.product_type,
          tags: product.tags?.split(',') || [],
          status: product.status,
          variants: product.variants?.map(variant => ({
            shopifyId: variant.id,
            title: variant.title,
            price: parseFloat(variant.price),
            inventoryQuantity: variant.inventory_quantity,
            sku: variant.sku,
            available: variant.available
          })) || []
        }
      };
    } catch (error) {
      logger.error('Error fetching Shopify product:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  /**
   * Search products by title, vendor, or tags
   */
  async searchProducts(query, limit = 20) {
    try {
      // Shopify doesn't have a direct search API, so we'll fetch products and filter
      const result = await this.getProducts(250); // Get more products for better search
      
      if (!result.success) {
        return result;
      }

      const searchTerms = query.toLowerCase().split(' ');
      const filteredProducts = result.products.filter(product => {
        const searchableText = [
          product.name,
          product.description,
          product.vendor,
          product.productType,
          ...(product.tags || [])
        ].join(' ').toLowerCase();

        return searchTerms.some(term => searchableText.includes(term));
      });

      return {
        success: true,
        products: filteredProducts.slice(0, limit),
        totalFound: filteredProducts.length
      };
    } catch (error) {
      logger.error('Error searching Shopify products:', error);
      return {
        success: false,
        error: error.message,
        products: []
      };
    }
  }

  /**
   * Get order by order number or ID
   */
  async getOrder(orderIdentifier) {
    try {
      let response;
      
      // Remove # prefix if present
      const cleanIdentifier = orderIdentifier.replace(/^#/, '');
      
      // Try searching by order name first (this is more reliable for order numbers like 176484)
      try {
        const searchResponse = await axios.get(`${this.baseUrl}/orders.json?name=${encodeURIComponent(cleanIdentifier)}&limit=1`, {
          headers: this.headers
        });
        
        if (searchResponse.data.orders.length > 0) {
          response = { data: { order: searchResponse.data.orders[0] } };
        }
      } catch (searchError) {
        // If name search fails, try direct ID lookup
        if (/^\d+$/.test(cleanIdentifier)) {
          response = await axios.get(`${this.baseUrl}/orders/${cleanIdentifier}.json`, {
            headers: this.headers
          });
        } else {
          throw searchError;
        }
      }
      
      if (!response) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      const order = response.data.order;
      return {
        success: true,
        order: {
          shopifyId: order.id,
          orderNumber: order.order_number,
          name: order.name,
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          totalPrice: parseFloat(order.total_price),
          currency: order.currency,
          customer: order.customer ? {
            email: order.customer.email,
            firstName: order.customer.first_name,
            lastName: order.customer.last_name
          } : null,
          lineItems: order.line_items?.map(item => ({
            title: item.title,
            quantity: item.quantity,
            price: parseFloat(item.price),
            fulfillmentStatus: item.fulfillment_status
          })) || [],
          trackingInfo: order.fulfillments?.map(f => ({
            trackingCompany: f.tracking_company,
            trackingNumber: f.tracking_number,
            trackingUrl: f.tracking_url
          })) || [],
          createdAt: order.created_at
        }
      };
    } catch (error) {
      logger.error('Error fetching Shopify order:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.status === 404 ? 'Order not found' : (error.response?.data?.errors || error.message)
      };
    }
  }

  /**
   * Get store information
   */
  async getShop() {
    try {
      const response = await axios.get(`${this.baseUrl}/shop.json`, {
        headers: this.headers
      });

      const shop = response.data.shop;
      return {
        success: true,
        shop: {
          id: shop.id,
          name: shop.name,
          email: shop.email,
          domain: shop.domain,
          currency: shop.currency,
          timezone: shop.iana_timezone,
          country: shop.country_name,
          planName: shop.plan_name
        }
      };
    } catch (error) {
      logger.error('Error fetching Shopify shop:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  /**
   * Get order by order number and email (more secure method)
   */
  async getOrderByNumberAndEmail(orderNumber, email) {
    try {
      const cleanOrderNumber = orderNumber.replace(/^#/, '');
      
      // Try multiple search approaches since Shopify's search can be unreliable
      let matchingOrder = null;
      
      // Approach 1: Search by name parameter
      try {
        const nameResponse = await axios.get(`${this.baseUrl}/orders.json?name=${encodeURIComponent(cleanOrderNumber)}&limit=50`, {
          headers: this.headers
        });
        
        matchingOrder = nameResponse.data.orders.find(order => 
          order.email && order.email.toLowerCase() === email.toLowerCase() &&
          (order.name === cleanOrderNumber || order.name === `#${cleanOrderNumber}`)
        );
      } catch (nameSearchError) {
        logger.warn('Name search failed, trying other methods:', nameSearchError.message);
      }
      
      // Approach 2: If not found, search recent orders and filter
      if (!matchingOrder) {
        try {
          const recentResponse = await axios.get(`${this.baseUrl}/orders.json?limit=250&status=any`, {
            headers: this.headers
          });
          
          matchingOrder = recentResponse.data.orders.find(order => 
            order.email && order.email.toLowerCase() === email.toLowerCase() &&
            (order.name === cleanOrderNumber || order.name === `#${cleanOrderNumber}`)
          );
        } catch (recentSearchError) {
          logger.warn('Recent orders search failed:', recentSearchError.message);
        }
      }
      
      // Approach 3: Search by date range if we still haven't found it
      if (!matchingOrder) {
        try {
          // Search the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const dateResponse = await axios.get(`${this.baseUrl}/orders.json?created_at_min=${thirtyDaysAgo.toISOString()}&limit=250&status=any`, {
            headers: this.headers
          });
          
          matchingOrder = dateResponse.data.orders.find(order => 
            order.email && order.email.toLowerCase() === email.toLowerCase() &&
            (order.name === cleanOrderNumber || order.name === `#${cleanOrderNumber}`)
          );
        } catch (dateSearchError) {
          logger.warn('Date range search failed:', dateSearchError.message);
        }
      }
      
      if (!matchingOrder) {
        return {
          success: false,
          error: 'Order not found for the provided email address'
        };
      }
      
      return {
        success: true,
        order: {
          shopifyId: matchingOrder.id,
          orderNumber: matchingOrder.order_number,
          name: matchingOrder.name,
          email: matchingOrder.email,
          financialStatus: matchingOrder.financial_status,
          fulfillmentStatus: matchingOrder.fulfillment_status,
          totalPrice: parseFloat(matchingOrder.total_price),
          currency: matchingOrder.currency,
          customer: matchingOrder.customer ? {
            email: matchingOrder.customer.email,
            firstName: matchingOrder.customer.first_name,
            lastName: matchingOrder.customer.last_name
          } : null,
          shippingAddress: matchingOrder.shipping_address,
          lineItems: matchingOrder.line_items?.map(item => ({
            title: item.title,
            quantity: item.quantity,
            price: parseFloat(item.price),
            fulfillmentStatus: item.fulfillment_status
          })) || [],
          trackingInfo: matchingOrder.fulfillments?.map(f => ({
            trackingCompany: f.tracking_company,
            trackingNumber: f.tracking_number,
            trackingUrl: f.tracking_url
          })) || [],
          createdAt: matchingOrder.created_at,
          updatedAt: matchingOrder.updated_at
        }
      };
    } catch (error) {
      logger.error('Error fetching Shopify order by number and email:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  /**
   * Create webhook for real-time updates
   */
  async createWebhook(topic, address) {
    try {
      const webhook = {
        topic: topic,
        address: address,
        format: 'json'
      };

      const response = await axios.post(`${this.baseUrl}/webhooks.json`, {
        webhook
      }, {
        headers: this.headers
      });

      return {
        success: true,
        webhook: response.data.webhook
      };
    } catch (error) {
      logger.error('Error creating Shopify webhook:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  /**
   * List existing webhooks
   */
  async getWebhooks() {
    try {
      const response = await axios.get(`${this.baseUrl}/webhooks.json`, {
        headers: this.headers
      });

      return {
        success: true,
        webhooks: response.data.webhooks
      };
    } catch (error) {
      logger.error('Error fetching Shopify webhooks:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message,
        webhooks: []
      };
    }
  }
}

module.exports = ShopifyService;