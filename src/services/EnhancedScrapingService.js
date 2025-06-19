const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const logger = require('../utils/logger');

class EnhancedScrapingService {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.rateLimitDelay = options.rateLimitDelay || 2000;
    this.userAgent = options.userAgent || 'AI Customer Care Business Setup Bot 1.0';
  }

  /**
   * Scrape business information from a website (Enhanced for business setup)
   * @param {string} url - Website URL to scrape
   * @returns {Promise<Object>} Business information
   */
  async scrapeBusinessInfo(url) {
    try {
      logger.info('Starting enhanced business info scraping', { url });

      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);

      // Extract comprehensive business information
      const businessInfo = {
        // Basic info
        title: $('title').text().trim(),
        description: this.extractMetaContent($, 'description') || 
                    this.extractMetaContent($, 'og:description'),
        
        // Business name (multiple strategies)
        businessName: this.extractBusinessName($),
        
        // Contact information
        phone: this.extractPhoneNumber($),
        email: this.extractEmail($),
        address: this.extractAddress($),
        
        // Business details
        hours: this.extractBusinessHours($),
        services: this.extractServices($),
        aboutText: this.extractAboutText($),
        
        // Social media
        socialMedia: this.extractSocialMedia($),
        
        // Navigation and structure
        navigationLinks: this.extractNavigationLinks($, url),
        
        // SEO and meta info
        keywords: this.extractMetaContent($, 'keywords'),
        author: this.extractMetaContent($, 'author'),
        
        // Business type indicators
        businessType: this.identifyBusinessType($),
        
        // Content analysis
        contentAnalysis: this.analyzeContent($)
      };

      logger.info('Enhanced business info scraped successfully', { 
        url, 
        hasBusinessName: !!businessInfo.businessName,
        hasContact: !!(businessInfo.phone || businessInfo.email),
        businessType: businessInfo.businessType,
        navigationLinks: businessInfo.navigationLinks.length
      });

      return {
        success: true,
        url,
        scrapedAt: new Date().toISOString(),
        data: businessInfo
      };

    } catch (error) {
      logger.error('Enhanced business info scraping failed', { url, error: error.message });
      throw new Error(`Failed to scrape business info: ${error.message}`);
    }
  }

  /**
   * Extract business name using multiple strategies
   */
  extractBusinessName($) {
    // Strategy 1: H1 tag
    let businessName = $('h1').first().text().trim();
    if (businessName && businessName.length < 100) return businessName;

    // Strategy 2: Logo alt text
    businessName = $('img[alt*="logo"], .logo img, [class*="logo"] img').attr('alt');
    if (businessName && businessName.length < 100) return businessName;

    // Strategy 3: Site title without common suffixes
    businessName = $('title').text().trim();
    if (businessName) {
      businessName = businessName.replace(/\s*[-|]\s*(Home|Welcome|Official Site|Website).*$/i, '');
      if (businessName.length < 100) return businessName;
    }

    // Strategy 4: Copyright text
    businessName = $('[class*="copyright"], footer').text();
    const copyrightMatch = businessName.match(/©\s*\d{4}\s*([^.]+)/);
    if (copyrightMatch && copyrightMatch[1].length < 100) {
      return copyrightMatch[1].trim();
    }

    // Strategy 5: Common business name selectors
    const selectors = [
      '.business-name', '.company-name', '.brand-name',
      '[class*="name"]', '[id*="name"]', '.header-title'
    ];
    
    for (const selector of selectors) {
      const name = $(selector).first().text().trim();
      if (name && name.length > 2 && name.length < 100) {
        return name;
      }
    }

    return null;
  }

  /**
   * Extract phone number from page
   */
  extractPhoneNumber($) {
    // Check tel: links first
    const telLink = $('a[href^="tel:"]').first();
    if (telLink.length) return telLink.text().trim() || telLink.attr('href').replace('tel:', '');

    // Search in common contact areas
    const contactAreas = $('[class*="contact"], [class*="phone"], [id*="contact"], [id*="phone"], footer, header');
    const phoneRegex = /(\+?\d{1,4}[\s-.]?\(?\d{1,3}\)?[\s-.]?\d{3,4}[\s-.]?\d{3,4})/;
    
    let foundPhone = null;
    contactAreas.each((i, elem) => {
      const text = $(elem).text();
      const match = text.match(phoneRegex);
      if (match && !foundPhone) {
        foundPhone = match[1].trim();
        return false; // Break loop
      }
    });

    return foundPhone;
  }

  /**
   * Extract email address from page
   */
  extractEmail($) {
    // Check mailto: links first
    const mailtoLink = $('a[href^="mailto:"]').first();
    if (mailtoLink.length) return mailtoLink.attr('href').replace('mailto:', '');

    // Search in page content
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const pageText = $('body').text();
    const match = pageText.match(emailRegex);
    
    return match ? match[1] : null;
  }

  /**
   * Extract business address
   */
  extractAddress($) {
    const addressSelectors = [
      '[class*="address"]', '[id*="address"]', '[class*="location"]', 
      '[id*="location"]', '.contact-info', 'address'
    ];

    for (const selector of addressSelectors) {
      const addressText = $(selector).text().trim();
      if (addressText && addressText.length > 10 && addressText.length < 200) {
        return addressText;
      }
    }

    return null;
  }

  /**
   * Extract business hours
   */
  extractBusinessHours($) {
    const hoursSelectors = [
      '[class*="hours"]', '[id*="hours"]', '[class*="open"]', 
      '[class*="schedule"]', '.hours-operation'
    ];

    const hours = [];
    hoursSelectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.length > 5 && text.length < 100) {
          hours.push(text);
        }
      });
    });

    return hours.length > 0 ? hours : null;
  }

  /**
   * Extract services or products mentioned
   */
  extractServices($) {
    const serviceSelectors = [
      '[class*="service"]', '[class*="product"]', '[class*="offer"]',
      '.services li', '.products li', 'nav a'
    ];

    const services = new Set();
    serviceSelectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.length > 2 && text.length < 100 && !text.includes('©')) {
          services.add(text);
        }
      });
    });

    return Array.from(services).slice(0, 20); // Limit to 20 services
  }

  /**
   * Extract about text
   */
  extractAboutText($) {
    const aboutSelectors = [
      '[class*="about"]', '[id*="about"]', '.description',
      '.intro', '.overview', 'p'
    ];

    for (const selector of aboutSelectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 50 && text.length < 500) {
        return text;
      }
    }

    return null;
  }

  /**
   * Extract social media links
   */
  extractSocialMedia($) {
    return {
      facebook: $('a[href*="facebook.com"]').attr('href') || null,
      instagram: $('a[href*="instagram.com"]').attr('href') || null,
      twitter: $('a[href*="twitter.com"], a[href*="x.com"]').attr('href') || null,
      linkedin: $('a[href*="linkedin.com"]').attr('href') || null,
      youtube: $('a[href*="youtube.com"]').attr('href') || null
    };
  }

  /**
   * Extract navigation links
   */
  extractNavigationLinks($, baseUrl) {
    const links = [];
    const baseHost = new URL(baseUrl).host;

    $('nav a, .nav a, .menu a, .navigation a').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      
      if (href && text && text.length > 1 && text.length < 50) {
        try {
          const fullUrl = new URL(href, baseUrl).href;
          const linkHost = new URL(fullUrl).host;
          
          // Only include internal links
          if (linkHost === baseHost) {
            links.push({
              text: text,
              href: fullUrl
            });
          }
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });

    return links;
  }

  /**
   * Identify business type based on content
   */
  identifyBusinessType($) {
    const pageText = $('body').text().toLowerCase();
    
    const businessTypes = {
      'ecommerce': ['shop', 'buy', 'cart', 'checkout', 'product', 'store'],
      'restaurant': ['menu', 'food', 'restaurant', 'dining', 'reservation'],
      'service': ['service', 'consultation', 'appointment', 'booking'],
      'healthcare': ['doctor', 'medical', 'health', 'clinic', 'appointment'],
      'education': ['course', 'learn', 'education', 'school', 'training'],
      'technology': ['software', 'app', 'tech', 'development', 'digital'],
      'real-estate': ['property', 'real estate', 'house', 'apartment', 'rent']
    };

    let bestMatch = 'general';
    let bestScore = 0;

    for (const [type, keywords] of Object.entries(businessTypes)) {
      let score = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = pageText.match(regex);
        if (matches) score += matches.length;
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = type;
      }
    }

    return bestMatch;
  }

  /**
   * Analyze page content
   */
  analyzeContent($) {
    const text = $('body').text();
    return {
      wordCount: text.split(/\s+/).length,
      hasContactForm: $('form[class*="contact"], form[id*="contact"]').length > 0,
      hasNewsletterSignup: $('form[class*="newsletter"], input[type="email"]').length > 0,
      hasTestimonials: $('[class*="testimonial"], [class*="review"]').length > 0,
      hasGallery: $('[class*="gallery"], [class*="portfolio"]').length > 0,
      hasBlog: $('a[href*="blog"], a[href*="news"]').length > 0
    };
  }

  /**
   * Extract meta content
   */
  extractMetaContent($, name) {
    return $(`meta[name="${name}"], meta[property="${name}"]`).attr('content');
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(url, retries = 0) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });
      return response;
    } catch (error) {
      if (retries < this.maxRetries) {
        logger.warn(`Request failed, retrying... (${retries + 1}/${this.maxRetries})`, { url });
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        return this.makeRequest(url, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Discover pages on website (enhanced)
   */
  async discoverPages(baseUrl) {
    try {
      logger.info('Starting enhanced page discovery', { baseUrl });
      
      const response = await this.makeRequest(baseUrl);
      const $ = cheerio.load(response.data);
      const baseHost = new URL(baseUrl).host;
      
      // Extract all internal links
      const links = new Set([baseUrl]); // Include home page
      
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) {
          try {
            const fullUrl = new URL(href, baseUrl).href;
            const linkHost = new URL(fullUrl).host;
            
            if (linkHost === baseHost) {
              links.add(fullUrl);
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }
      });

      const allLinks = Array.from(links);
      const categorizedPages = this.categorizePages(allLinks, baseUrl);

      logger.info('Enhanced page discovery completed', { 
        baseUrl, 
        totalPages: allLinks.length,
        categories: Object.keys(categorizedPages)
      });

      return {
        totalPages: allLinks.length,
        pages: categorizedPages,
        discoveryMethod: 'enhanced_cheerio'
      };

    } catch (error) {
      logger.error('Enhanced page discovery failed', { baseUrl, error: error.message });
      throw new Error(`Page discovery failed: ${error.message}`);
    }
  }

  /**
   * Categorize pages based on URL patterns
   */
  categorizePages(pages, baseUrl) {
    const categories = {
      home: [],
      about: [],
      products: [],
      services: [],
      contact: [],
      blog: [],
      support: [],
      policies: [],
      other: []
    };

    pages.forEach(page => {
      const url = page.toLowerCase();
      const path = new URL(page).pathname.toLowerCase();
      
      if (url === baseUrl.toLowerCase() || path === '/' || path.includes('home')) {
        categories.home.push(page);
      } else if (path.includes('about') || path.includes('story') || path.includes('team')) {
        categories.about.push(page);
      } else if (path.includes('product') || path.includes('shop') || path.includes('store') || path.includes('catalog')) {
        categories.products.push(page);
      } else if (path.includes('service') || path.includes('solution')) {
        categories.services.push(page);
      } else if (path.includes('contact') || path.includes('reach') || path.includes('location')) {
        categories.contact.push(page);
      } else if (path.includes('blog') || path.includes('news') || path.includes('article')) {
        categories.blog.push(page);
      } else if (path.includes('support') || path.includes('help') || path.includes('faq')) {
        categories.support.push(page);
      } else if (path.includes('policy') || path.includes('terms') || path.includes('privacy') || path.includes('return')) {
        categories.policies.push(page);
      } else {
        categories.other.push(page);
      }
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });

    return categories;
  }

  /**
   * Scrape specific page content
   */
  async scrapePage(url, category = 'other') {
    try {
      logger.info('Scraping page content', { url, category });

      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);
      
      // Extract clean text content
      $('script, style, nav, footer, header').remove();
      const content = $('body').text().replace(/\s+/g, ' ').trim();

      const processedContent = this.processContentByCategory(content, category, $);

      return {
        url,
        category,
        content: processedContent,
        contentLength: content.length,
        extractedAt: new Date().toISOString(),
        status: 'completed'
      };

    } catch (error) {
      logger.error('Page scraping failed', { url, category, error: error.message });
      return {
        url,
        category,
        status: 'failed',
        error: error.message,
        extractedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Process content based on category
   */
  processContentByCategory(content, category, $ = null) {
    const baseData = {
      fullText: content.substring(0, 5000), // Limit content size
      wordCount: content.split(/\s+/).length,
      category
    };

    switch (category) {
      case 'about':
        return {
          ...baseData,
          type: 'business_info',
          summary: this.extractSummary(content, 300)
        };
      
      case 'products':
      case 'services':
        return {
          ...baseData,
          type: 'offerings',
          items: this.extractListItems(content)
        };
      
      case 'contact':
        return {
          ...baseData,
          type: 'contact_info',
          contactData: this.extractContactFromText(content)
        };
      
      case 'policies':
        return {
          ...baseData,
          type: 'policy',
          policyType: this.identifyPolicyType(content)
        };
      
      default:
        return {
          ...baseData,
          type: 'general',
          summary: this.extractSummary(content, 200)
        };
    }
  }

  extractSummary(content, maxLength = 200) {
    const sentences = content.split(/[.!?]+/);
    let summary = '';
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && summary.length + trimmed.length < maxLength) {
        summary += trimmed + '. ';
      }
      if (summary.length >= maxLength * 0.8) break;
    }
    
    return summary.trim();
  }

  extractListItems(content) {
    const lines = content.split(/[\n\r]+/);
    return lines
      .map(line => line.trim())
      .filter(line => line.length > 10 && line.length < 100)
      .filter(Boolean)
      .slice(0, 15);
  }

  extractContactFromText(content) {
    const phoneRegex = /(\+?\d{1,4}[\s-.]?\(?\d{1,3}\)?[\s-.]?\d{3,4}[\s-.]?\d{3,4})/g;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    
    return {
      phones: content.match(phoneRegex) || [],
      emails: content.match(emailRegex) || []
    };
  }

  identifyPolicyType(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('privacy')) return 'privacy';
    if (lowerContent.includes('return') || lowerContent.includes('refund')) return 'returns';
    if (lowerContent.includes('shipping') || lowerContent.includes('delivery')) return 'shipping';
    if (lowerContent.includes('terms') || lowerContent.includes('conditions')) return 'terms';
    
    return 'general';
  }
}

module.exports = EnhancedScrapingService;