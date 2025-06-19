const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const logger = require('../utils/logger');

class EnhancedWebScrapingService {
  constructor(options = {}) {
    this.timeout = options.timeout || 15000;
    this.maxRetries = options.maxRetries || 3;
    this.rateLimitDelay = options.rateLimitDelay || 1000;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (compatible; AICare/1.0; +https://ai-care.com/bot)';
    
    // Axios instance with common headers
    this.httpClient = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
  }

  /**
   * Enhanced business information scraping
   * Extracts comprehensive business data from websites
   */
  async scrapeBusinessInfo(url) {
    logger.info('Starting enhanced business info scraping', { url });
    
    try {
      const response = await this.fetchWithRetry(url);
      const $ = cheerio.load(response.data);
      
      // Extract comprehensive business information
      const businessInfo = {
        // Basic Info
        businessName: this.extractBusinessName($, url),
        description: this.extractDescription($),
        tagline: this.extractTagline($),
        
        // Contact Information
        phone: this.extractPhone($),
        email: this.extractEmail($),
        address: this.extractAddress($),
        
        // Business Details
        businessType: this.extractBusinessType($),
        industry: this.extractIndustry($),
        services: this.extractServices($),
        products: this.extractProducts($),
        
        // Online Presence
        socialLinks: this.extractSocialLinks($),
        logoUrl: this.extractLogo($, url),
        
        // Technical Info
        platform: this.detectPlatform($),
        hasEcommerce: this.detectEcommerce($),
        hasBooking: this.detectBooking($),
        
        // SEO Data
        title: $('title').text().trim(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        keywords: $('meta[name="keywords"]').attr('content') || '',
        
        // Structured Data
        structuredData: this.extractStructuredData($)
      };

      return {
        success: true,
        data: businessInfo,
        extractedAt: new Date().toISOString(),
        sourceUrl: url
      };

    } catch (error) {
      logger.error('Enhanced business info scraping failed', { url, error: error.message });
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Enhanced page discovery
   * Finds and categorizes website pages
   */
  async discoverPages(baseUrl) {
    logger.info('Starting enhanced page discovery', { baseUrl });
    
    try {
      const response = await this.fetchWithRetry(baseUrl);
      const $ = cheerio.load(response.data);
      const baseUrlObj = new URL(baseUrl);
      
      // Extract all links
      const allLinks = new Set();
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        if (absoluteUrl && this.isSameDomain(absoluteUrl, baseUrl)) {
          allLinks.add(absoluteUrl);
        }
      });

      // Categorize pages
      const categorizedPages = {
        about: [],
        contact: [],
        products: [],
        services: [],
        policies: [],
        blog: [],
        careers: [],
        support: [],
        other: []
      };

      // Navigation and footer links (more likely to be important)
      const importantLinks = new Set();
      $('nav a[href], .nav a[href], .navbar a[href], .menu a[href], footer a[href], .footer a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        if (absoluteUrl && this.isSameDomain(absoluteUrl, baseUrl)) {
          importantLinks.add(absoluteUrl);
        }
      });

      // Categorize all found links
      [...allLinks].forEach(url => {
        const category = this.categorizeUrl(url);
        const isImportant = importantLinks.has(url);
        
        categorizedPages[category].push({
          url,
          isImportant,
          title: this.extractLinkTitle($, url)
        });
      });

      // Sort by importance
      Object.keys(categorizedPages).forEach(category => {
        categorizedPages[category].sort((a, b) => {
          if (a.isImportant && !b.isImportant) return -1;
          if (!a.isImportant && b.isImportant) return 1;
          return 0;
        });
      });

      return {
        success: true,
        data: {
          baseUrl,
          totalPages: allLinks.size,
          importantPages: importantLinks.size,
          pages: categorizedPages,
          discoveredAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Enhanced page discovery failed', { baseUrl, error: error.message });
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Enhanced page content scraping
   */
  async scrapePage(url, expectedCategory = null) {
    logger.info('Scraping page content', { url, expectedCategory });
    
    try {
      const response = await this.fetchWithRetry(url);
      const $ = cheerio.load(response.data);
      
      const pageContent = {
        url,
        title: $('title').text().trim(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        headings: this.extractHeadings($),
        mainContent: this.extractMainContent($),
        contactInfo: this.extractContactInfo($),
        businessHours: this.extractBusinessHours($),
        pricing: this.extractPricing($),
        features: this.extractFeatures($),
        testimonials: this.extractTestimonials($),
        category: expectedCategory || this.categorizeUrl(url),
        wordCount: this.calculateWordCount($),
        images: this.extractImages($, url),
        forms: this.extractForms($),
        scrapedAt: new Date().toISOString()
      };

      return {
        success: true,
        status: 'completed',
        data: pageContent
      };

    } catch (error) {
      logger.error('Page scraping failed', { url, error: error.message });
      return {
        success: false,
        status: 'failed',
        error: error.message,
        data: null
      };
    }
  }

  // Helper Methods

  async fetchWithRetry(url, retries = 0) {
    try {
      if (retries > 0) {
        await this.delay(this.rateLimitDelay * retries);
      }
      
      const response = await this.httpClient.get(url);
      return response;
      
    } catch (error) {
      if (retries < this.maxRetries && (error.code === 'ECONNRESET' || error.response?.status >= 500)) {
        logger.warn(`Retry ${retries + 1}/${this.maxRetries} for ${url}`, { error: error.message });
        return this.fetchWithRetry(url, retries + 1);
      }
      throw error;
    }
  }

  extractBusinessName($, url) {
    // Try multiple sources for business name
    const candidates = [
      $('h1').first().text().trim(),
      $('.business-name').text().trim(),
      $('.company-name').text().trim(),
      $('.logo').attr('alt'),
      $('title').text().split('-')[0].trim(),
      $('meta[property="og:site_name"]').attr('content'),
      new URL(url).hostname.replace('www.', '').split('.')[0]
    ].filter(name => name && name.length > 0 && name.length < 100);

    return candidates[0] || '';
  }

  extractDescription($) {
    const candidates = [
      $('meta[name="description"]').attr('content'),
      $('meta[property="og:description"]').attr('content'),
      $('.hero-description').text().trim(),
      $('.intro-text').text().trim(),
      $('p').first().text().trim()
    ].filter(desc => desc && desc.length > 20);

    return candidates[0] || '';
  }

  extractTagline($) {
    const candidates = [
      $('.tagline').text().trim(),
      $('.slogan').text().trim(),
      $('.subtitle').text().trim(),
      $('h2').first().text().trim()
    ].filter(tag => tag && tag.length > 0 && tag.length < 200);

    return candidates[0] || '';
  }

  extractPhone($) {
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const text = $.text();
    const matches = text.match(phoneRegex);
    return matches ? matches[0] : '';
  }

  extractEmail($) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const text = $.text();
    const matches = text.match(emailRegex);
    return matches ? matches.filter(email => !email.includes('example.com'))[0] : '';
  }

  extractAddress($) {
    const addressSelectors = [
      '.address',
      '.location',
      '[itemtype*="PostalAddress"]',
      '.contact-address'
    ];
    
    for (const selector of addressSelectors) {
      const address = $(selector).text().trim();
      if (address && address.length > 10) {
        return address;
      }
    }
    return '';
  }

  extractServices($) {
    const services = [];
    $('.service, .services li, .offerings li, .what-we-do li').each((i, elem) => {
      const service = $(elem).text().trim();
      if (service && service.length > 0) {
        services.push(service);
      }
    });
    return services.slice(0, 10); // Limit to 10
  }

  extractProducts($) {
    const products = [];
    $('.product, .products li, .product-item').each((i, elem) => {
      const product = $(elem).text().trim();
      if (product && product.length > 0) {
        products.push(product);
      }
    });
    return products.slice(0, 10); // Limit to 10
  }

  extractSocialLinks($) {
    const socialLinks = {};
    const socialPlatforms = {
      facebook: /facebook\.com/,
      twitter: /twitter\.com|x\.com/,
      instagram: /instagram\.com/,
      linkedin: /linkedin\.com/,
      youtube: /youtube\.com/,
      tiktok: /tiktok\.com/
    };

    $('a[href*="facebook"], a[href*="twitter"], a[href*="instagram"], a[href*="linkedin"], a[href*="youtube"], a[href*="tiktok"]').each((i, elem) => {
      const href = $(elem).attr('href');
      for (const [platform, regex] of Object.entries(socialPlatforms)) {
        if (regex.test(href)) {
          socialLinks[platform] = href;
          break;
        }
      }
    });

    return socialLinks;
  }

  extractLogo($, baseUrl) {
    const logoSelectors = [
      '.logo img',
      '.brand img',
      'img[alt*="logo"]',
      'img[src*="logo"]'
    ];

    for (const selector of logoSelectors) {
      const src = $(selector).attr('src');
      if (src) {
        return this.resolveUrl(src, baseUrl);
      }
    }
    return '';
  }

  detectPlatform($) {
    const generators = $('meta[name="generator"]').attr('content') || '';
    const poweredBy = $('.powered-by').text() || '';
    const combined = (generators + ' ' + poweredBy).toLowerCase();

    if (combined.includes('shopify')) return 'Shopify';
    if (combined.includes('wordpress')) return 'WordPress';
    if (combined.includes('wix')) return 'Wix';
    if (combined.includes('squarespace')) return 'Squarespace';
    if (combined.includes('webflow')) return 'Webflow';
    
    return 'Unknown';
  }

  detectEcommerce($) {
    const ecommerceIndicators = [
      '.cart', '.add-to-cart', '.shop-now', '.buy-now',
      '.product-price', '.checkout', '.shopping-cart'
    ];

    return ecommerceIndicators.some(selector => $(selector).length > 0);
  }

  extractStructuredData($) {
    const structuredData = [];
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        structuredData.push(data);
      } catch (e) {
        // Ignore invalid JSON
      }
    });
    return structuredData;
  }

  categorizeUrl(url) {
    const path = new URL(url).pathname.toLowerCase();
    
    if (/about|our-story|who-we-are|company/.test(path)) return 'about';
    if (/contact|reach-us|get-in-touch/.test(path)) return 'contact';
    if (/product|shop|store|catalog/.test(path)) return 'products';
    if (/service|what-we-do|solutions/.test(path)) return 'services';
    if (/privacy|terms|policy|legal/.test(path)) return 'policies';
    if (/blog|news|article|post/.test(path)) return 'blog';
    if (/career|job|hiring|work-with-us/.test(path)) return 'careers';
    if (/support|help|faq|documentation/.test(path)) return 'support';
    
    return 'other';
  }

  resolveUrl(href, baseUrl) {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return null;
    }
  }

  isSameDomain(url1, url2) {
    try {
      return new URL(url1).hostname === new URL(url2).hostname;
    } catch {
      return false;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Additional extraction methods for page content
  extractHeadings($) {
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      headings.push({
        level: elem.tagName.toLowerCase(),
        text: $(elem).text().trim()
      });
    });
    return headings;
  }

  extractMainContent($) {
    // Remove navigation, header, footer, sidebar
    const contentSelectors = [
      'main',
      '.main-content',
      '.content',
      'article',
      '.post-content'
    ];

    for (const selector of contentSelectors) {
      const content = $(selector).text().trim();
      if (content && content.length > 100) {
        return content.substring(0, 2000); // Limit content
      }
    }

    // Fallback: get body text excluding nav/header/footer
    $('nav, header, footer, .nav, .header, .footer, .sidebar').remove();
    return $('body').text().trim().substring(0, 2000);
  }

  calculateWordCount($) {
    const text = $.text();
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  extractImages($, baseUrl) {
    const images = [];
    $('img').each((i, elem) => {
      const src = $(elem).attr('src');
      const alt = $(elem).attr('alt') || '';
      if (src) {
        images.push({
          src: this.resolveUrl(src, baseUrl),
          alt
        });
      }
    });
    return images.slice(0, 10); // Limit to 10 images
  }

  extractForms($) {
    const forms = [];
    $('form').each((i, elem) => {
      const action = $(elem).attr('action') || '';
      const method = $(elem).attr('method') || 'GET';
      const inputs = [];
      
      $(elem).find('input, textarea, select').each((j, input) => {
        inputs.push({
          type: $(input).attr('type') || 'text',
          name: $(input).attr('name') || '',
          placeholder: $(input).attr('placeholder') || ''
        });
      });

      forms.push({ action, method, inputs });
    });
    return forms;
  }

  extractContactInfo($) {
    return {
      phone: this.extractPhone($),
      email: this.extractEmail($),
      address: this.extractAddress($)
    };
  }

  extractBusinessHours($) {
    const hoursText = $('.hours, .business-hours, .opening-hours').text();
    return hoursText.trim() || '';
  }

  extractPricing($) {
    const prices = [];
    $('.price, .pricing, .cost').each((i, elem) => {
      const price = $(elem).text().trim();
      if (price.match(/\$[\d,]+/)) {
        prices.push(price);
      }
    });
    return prices;
  }

  extractFeatures($) {
    const features = [];
    $('.feature, .features li, .benefits li').each((i, elem) => {
      const feature = $(elem).text().trim();
      if (feature && feature.length > 0) {
        features.push(feature);
      }
    });
    return features.slice(0, 10);
  }

  extractTestimonials($) {
    const testimonials = [];
    $('.testimonial, .review, .feedback').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 20) {
        testimonials.push(text);
      }
    });
    return testimonials.slice(0, 5);
  }

  extractBusinessType($) {
    const typeIndicators = $.text().toLowerCase();
    
    if (typeIndicators.includes('restaurant') || typeIndicators.includes('cafe')) return 'Restaurant';
    if (typeIndicators.includes('retail') || typeIndicators.includes('store')) return 'Retail';
    if (typeIndicators.includes('service') || typeIndicators.includes('consulting')) return 'Service';
    if (typeIndicators.includes('healthcare') || typeIndicators.includes('medical')) return 'Healthcare';
    if (typeIndicators.includes('salon') || typeIndicators.includes('spa')) return 'Beauty & Wellness';
    
    return 'General Business';
  }

  extractIndustry($) {
    // Extract industry from meta tags, content, or structured data
    const keywords = $('meta[name="keywords"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || '';
    const combined = (keywords + ' ' + description).toLowerCase();
    
    const industries = {
      'technology': /tech|software|it|digital|app|web/,
      'healthcare': /health|medical|doctor|clinic|hospital/,
      'retail': /retail|shop|store|ecommerce|fashion/,
      'food': /restaurant|food|cafe|catering|dining/,
      'finance': /finance|bank|investment|insurance|accounting/,
      'education': /education|school|university|training|course/,
      'real estate': /real estate|property|housing|realtor/,
      'automotive': /auto|car|vehicle|repair|dealership/
    };

    for (const [industry, regex] of Object.entries(industries)) {
      if (regex.test(combined)) {
        return industry;
      }
    }

    return 'Other';
  }

  extractLinkTitle($, url) {
    const link = $(`a[href="${url}"]`).first();
    return link.text().trim() || link.attr('title') || '';
  }

  detectBooking($) {
    const bookingIndicators = [
      '.book-now', '.schedule', '.appointment', '.reservation',
      '.calendar', '.booking-form', '.book-appointment'
    ];

    return bookingIndicators.some(selector => $(selector).length > 0);
  }
}

module.exports = EnhancedWebScrapingService;