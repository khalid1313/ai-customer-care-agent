const { chromium } = require('playwright');
const { PlaywrightWebBaseLoader } = require('langchain/document_loaders/web/playwright');
const logger = require('../utils/logger');

class PlaywrightScrapingService {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.headless = options.headless !== false; // Default to headless
    this.maxRetries = options.maxRetries || 3;
    this.rateLimitDelay = options.rateLimitDelay || 2000;
  }

  /**
   * Scrape business information from a website
   * @param {string} url - Website URL to scrape
   * @returns {Promise<Object>} Business information
   */
  async scrapeBusinessInfo(url) {
    try {
      logger.info('Starting business info scraping with Playwright', { url });

      const browser = await chromium.launch({ 
        headless: this.headless,
        timeout: this.timeout 
      });
      
      const page = await browser.newPage();
      
      // Navigate to the website
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: this.timeout 
      });

      // Extract business information
      const businessInfo = await page.evaluate(() => {
        const extractText = (selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent.trim() : null;
        };

        const extractAllText = (selector) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent.trim()).filter(Boolean);
        };

        return {
          // Basic business info
          title: document.title,
          description: extractText('meta[name="description"]') || 
                      extractText('meta[property="og:description"]'),
          
          // Business name variations
          businessName: extractText('h1') || 
                       extractText('.business-name') ||
                       extractText('.company-name') ||
                       extractText('[class*="name"]'),

          // Contact information
          phone: extractText('a[href^="tel:"]') ||
                extractText('[class*="phone"]') ||
                extractText('[class*="contact"]'),
                
          email: extractText('a[href^="mailto:"]') ||
                extractText('[class*="email"]'),

          address: extractText('[class*="address"]') ||
                  extractText('[class*="location"]'),

          // Business hours
          hours: extractAllText('[class*="hours"]') ||
                extractAllText('[class*="open"]'),

          // Social media
          socialMedia: {
            facebook: document.querySelector('a[href*="facebook.com"]')?.href,
            instagram: document.querySelector('a[href*="instagram.com"]')?.href,
            twitter: document.querySelector('a[href*="twitter.com"]')?.href,
            linkedin: document.querySelector('a[href*="linkedin.com"]')?.href
          },

          // Navigation links
          navigationLinks: Array.from(document.querySelectorAll('nav a, .nav a, .menu a'))
            .map(link => ({
              text: link.textContent.trim(),
              href: link.href
            }))
            .filter(link => link.text && link.href),

          // About information
          aboutText: extractText('[class*="about"]') ||
                    extractText('[id*="about"]'),

          // Services/Products mentioned
          services: extractAllText('[class*="service"]') ||
                   extractAllText('[class*="product"]'),

          // Key features or highlights
          features: extractAllText('[class*="feature"]') ||
                   extractAllText('[class*="highlight"]')
        };
      });

      await browser.close();

      logger.info('Business info scraped successfully', { 
        url, 
        hasBusinessName: !!businessInfo.businessName,
        hasContact: !!(businessInfo.phone || businessInfo.email),
        navigationLinks: businessInfo.navigationLinks.length
      });

      return {
        success: true,
        url,
        scrapedAt: new Date().toISOString(),
        data: businessInfo
      };

    } catch (error) {
      logger.error('Business info scraping failed', { url, error: error.message });
      throw new Error(`Failed to scrape business info: ${error.message}`);
    }
  }

  /**
   * Discover and categorize pages on a website
   * @param {string} baseUrl - Base website URL
   * @returns {Promise<Object>} Discovered pages categorized
   */
  async discoverPages(baseUrl) {
    try {
      logger.info('Starting page discovery with Playwright', { baseUrl });

      const browser = await chromium.launch({ headless: this.headless });
      const page = await browser.newPage();
      
      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      // Extract all internal links
      const links = await page.evaluate((baseUrl) => {
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        const baseHost = new URL(baseUrl).host;
        
        return allLinks
          .map(link => link.href)
          .filter(href => {
            try {
              const url = new URL(href);
              return url.host === baseHost; // Only internal links
            } catch {
              return false;
            }
          })
          .filter((href, index, array) => array.indexOf(href) === index); // Remove duplicates
      }, baseUrl);

      await browser.close();

      // Categorize pages
      const categorizedPages = this.categorizePages(links, baseUrl);

      logger.info('Page discovery completed', { 
        baseUrl, 
        totalPages: links.length,
        categories: Object.keys(categorizedPages)
      });

      return {
        totalPages: links.length,
        pages: categorizedPages,
        discoveryMethod: 'playwright'
      };

    } catch (error) {
      logger.error('Page discovery failed', { baseUrl, error: error.message });
      throw new Error(`Page discovery failed: ${error.message}`);
    }
  }

  /**
   * Categorize pages based on URL patterns and content
   * @param {Array} pages - Array of page URLs
   * @param {string} baseUrl - Base URL for context
   * @returns {Object} Categorized pages
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
      
      if (url === baseUrl || url.endsWith('/') || url.includes('home')) {
        categories.home.push(page);
      } else if (url.includes('about') || url.includes('story') || url.includes('team')) {
        categories.about.push(page);
      } else if (url.includes('product') || url.includes('shop') || url.includes('store') || url.includes('catalog')) {
        categories.products.push(page);
      } else if (url.includes('service') || url.includes('solution')) {
        categories.services.push(page);
      } else if (url.includes('contact') || url.includes('reach') || url.includes('location')) {
        categories.contact.push(page);
      } else if (url.includes('blog') || url.includes('news') || url.includes('article')) {
        categories.blog.push(page);
      } else if (url.includes('support') || url.includes('help') || url.includes('faq')) {
        categories.support.push(page);
      } else if (url.includes('policy') || url.includes('terms') || url.includes('privacy') || url.includes('return')) {
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
   * @param {string} url - Page URL to scrape
   * @param {string} category - Page category for optimized extraction
   * @returns {Promise<Object>} Scraped content
   */
  async scrapePage(url, category = 'other') {
    try {
      logger.info('Scraping page content', { url, category });

      // Use LangChain's PlaywrightWebBaseLoader for content extraction
      const loader = new PlaywrightWebBaseLoader(url, {
        launchOptions: { headless: this.headless },
        gotoOptions: { waitUntil: 'networkidle' }
      });

      const docs = await loader.load();
      const content = docs[0]?.pageContent || '';

      // Process content based on category
      const processedContent = this.processContentByCategory(content, category);

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
   * Process content based on page category
   * @param {string} content - Raw page content
   * @param {string} category - Page category
   * @returns {Object} Processed content
   */
  processContentByCategory(content, category) {
    const baseData = {
      fullText: content,
      wordCount: content.split(/\s+/).length,
      category
    };

    switch (category) {
      case 'about':
        return {
          ...baseData,
          type: 'business_info',
          summary: this.extractSummary(content, 200)
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
          contactData: this.extractContactInfo(content)
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
          summary: this.extractSummary(content, 150)
        };
    }
  }

  /**
   * Extract summary from content
   * @param {string} content - Content to summarize
   * @param {number} maxLength - Maximum summary length
   * @returns {string} Summary
   */
  extractSummary(content, maxLength = 200) {
    // Simple extraction of first meaningful sentences
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

  /**
   * Extract list items from content
   * @param {string} content - Content to extract from
   * @returns {Array} Extracted items
   */
  extractListItems(content) {
    // Simple extraction of list-like items
    const lines = content.split('\n');
    return lines
      .filter(line => line.trim().length > 10 && line.trim().length < 100)
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 20); // Limit to 20 items
  }

  /**
   * Extract contact information from content
   * @param {string} content - Content to extract from
   * @returns {Object} Contact information
   */
  extractContactInfo(content) {
    const phoneRegex = /(\+?\d{1,4}[\s-]?\(?\d{1,3}\)?[\s-]?\d{3,4}[\s-]?\d{3,4})/g;
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    
    return {
      phones: content.match(phoneRegex) || [],
      emails: content.match(emailRegex) || []
    };
  }

  /**
   * Identify policy type from content
   * @param {string} content - Policy content
   * @returns {string} Policy type
   */
  identifyPolicyType(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('privacy')) return 'privacy';
    if (lowerContent.includes('return') || lowerContent.includes('refund')) return 'returns';
    if (lowerContent.includes('shipping') || lowerContent.includes('delivery')) return 'shipping';
    if (lowerContent.includes('terms') || lowerContent.includes('conditions')) return 'terms';
    
    return 'general';
  }
}

module.exports = PlaywrightScrapingService;