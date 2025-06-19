const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const logger = require('../utils/logger');
const OpenAI = require('openai');

class BusinessCategoryScrapingService {
  constructor(options = {}) {
    this.timeout = options.timeout || 15000;
    this.maxRetries = options.maxRetries || 3;
    this.rateLimitDelay = options.rateLimitDelay || 1000;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (compatible; AICare/1.0; +https://ai-care.com/bot)';
    
    this.httpClient = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      }
    });

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_FOR_SCRAPING
    });
  }

  /**
   * Determine business category and extract footer pages
   */
  async analyzeBusinessCategory(url) {
    logger.info('Starting business category analysis', { url });
    
    try {
      const response = await this.fetchWithRetry(url);
      const $ = cheerio.load(response.data);
      
      // Extract pages first so we can analyze navigation
      const footerPages = this.extractFooterPages($, url);
      const importantPages = this.extractImportantPages($, url);
      
      // Use OpenAI to analyze business category based on navigation
      const categoryAnalysis = await this.detectBusinessCategory($, importantPages);
      
      const analysis = {
        // Business Category Detection (OpenAI-powered)
        businessCategory: categoryAnalysis.category,
        industry: this.detectIndustry($),
        businessType: this.detectBusinessType($),
        
        // AI Agent Scope (NEW!)
        agentScope: categoryAnalysis.agent_scope,
        productsServices: categoryAnalysis.products_services,
        categoryConfidence: categoryAnalysis.confidence,
        categoryReasoning: categoryAnalysis.reasoning,
        
        // Basic Info (minimal)
        businessName: this.extractBusinessName($, url),
        description: this.extractDescription($),
        
        // Footer Pages (focus area)
        footerPages: footerPages,
        importantPages: importantPages,
        
        // Platform Detection
        platform: this.detectPlatform($),
        
        // Analysis metadata
        analyzedAt: new Date().toISOString(),
        sourceUrl: url
      };

      return {
        success: true,
        data: analysis
      };

    } catch (error) {
      logger.error('Business category analysis failed', { url, error: error.message });
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Extract all footer pages and categorize them
   */
  extractFooterPages($, baseUrl) {
    logger.info('Extracting footer pages');
    
    const footerPages = {
      policies: [],
      legal: [],
      support: [],
      company: [],
      resources: [],
      other: []
    };

    // Footer selectors
    const footerSelectors = [
      'footer',
      '.footer',
      '.site-footer',
      '.page-footer',
      '#footer',
      '.footer-content',
      '.footer-links'
    ];

    footerSelectors.forEach(selector => {
      $(selector).find('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim().toLowerCase();
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        
        if (absoluteUrl && this.isSameDomain(absoluteUrl, baseUrl)) {
          const category = this.categorizeFooterLink(text, absoluteUrl);
          
          footerPages[category].push({
            url: absoluteUrl,
            text: $(elem).text().trim(),
            category
          });
        }
      });
    });

    // Remove duplicates
    Object.keys(footerPages).forEach(category => {
      const seen = new Set();
      footerPages[category] = footerPages[category].filter(page => {
        if (seen.has(page.url)) return false;
        seen.add(page.url);
        return true;
      });
    });

    return footerPages;
  }

  /**
   * Extract other important pages (nav, etc.)
   */
  extractImportantPages($, baseUrl) {
    const importantPages = [];
    
    // Navigation links
    const navSelectors = [
      'nav a',
      '.nav a',
      '.navbar a',
      '.navigation a',
      '.main-nav a',
      'header a'
    ];

    navSelectors.forEach(selector => {
      $(selector).each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        const absoluteUrl = this.resolveUrl(href, baseUrl);
        
        if (absoluteUrl && this.isSameDomain(absoluteUrl, baseUrl) && text.length > 0) {
          importantPages.push({
            url: absoluteUrl,
            text,
            source: 'navigation'
          });
        }
      });
    });

    // Remove duplicates and limit
    const seen = new Set();
    return importantPages
      .filter(page => {
        if (seen.has(page.url)) return false;
        seen.add(page.url);
        return true;
      })
      .slice(0, 20); // Limit to 20 important pages
  }

  /**
   * Categorize footer links based on text and URL
   */
  categorizeFooterLink(text, url) {
    const path = new URL(url).pathname.toLowerCase();
    const combinedText = (text + ' ' + path).toLowerCase();

    // Policy pages
    if (/privacy|policy|terms|conditions|legal|gdpr|cookies|disclaimer/.test(combinedText)) {
      return 'policies';
    }

    // Legal pages  
    if (/legal|compliance|copyright|trademark|licensing/.test(combinedText)) {
      return 'legal';
    }

    // Support pages
    if (/support|help|faq|contact|customer|service|documentation/.test(combinedText)) {
      return 'support';
    }

    // Company pages
    if (/about|company|team|careers|jobs|history|mission|values/.test(combinedText)) {
      return 'company';
    }

    // Resources
    if (/resources|blog|news|guides|tutorials|downloads/.test(combinedText)) {
      return 'resources';
    }

    return 'other';
  }

  /**
   * Detect business category using OpenAI analysis of navigation and content
   */
  async detectBusinessCategory($, importantPages = []) {
    try {
      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';
      const businessName = this.extractBusinessName($, '');
      
      // Extract navigation menu items
      const navItems = [];
      $('nav a, .nav a, .navbar a, .menu a, header nav a').each((i, elem) => {
        const text = $(elem).text().trim();
        if (text && text.length > 0) {
          navItems.push(text);
        }
      });

      // Extract main navigation categories from important pages
      const navigationCategories = importantPages
        .filter(page => page.source === 'navigation')
        .map(page => page.text)
        .slice(0, 15); // Limit to 15 main categories

      const prompt = `Analyze this business and determine the most accurate category:

Business Name: ${businessName}
Website Title: ${title}
Meta Description: ${description}

Navigation Menu Items: ${navItems.slice(0, 20).join(', ')}
Main Categories: ${navigationCategories.join(', ')}

Available Categories:
- Jewelry & Accessories
- Fashion & Clothing
- Electronics & Technology 
- Home & Garden
- Beauty & Personal Care
- Sports & Fitness
- Food & Beverage
- Health & Medical
- Automotive
- Books & Media
- Toys & Games
- Travel & Tourism
- Professional Services
- Real Estate
- Finance & Insurance
- Education & Training
- Non-Profit
- Manufacturing

Based on the navigation structure and content, what is the most accurate business category? Also provide:
1. Main products/services they sell (for AI agent scope)
2. What the AI agent should/shouldn't answer about

Format your response as JSON:
{
  "category": "exact category name",
  "confidence": 0.95,
  "products_services": ["list of main products/services"],
  "agent_scope": {
    "should_help_with": ["specific topics the AI should handle"],
    "should_not_help_with": ["topics the AI should redirect or decline"]
  },
  "reasoning": "brief explanation"
}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a business categorization expert. Analyze navigation and content to accurately categorize businesses and define AI agent scope."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const responseText = completion.choices[0].message.content;
      const analysis = JSON.parse(responseText);
      
      logger.info('OpenAI business category analysis completed', { 
        category: analysis.category,
        confidence: analysis.confidence 
      });

      return analysis;

    } catch (error) {
      logger.warn('OpenAI category detection failed, falling back to simple detection', { error: error.message });
      return this.detectBusinessCategoryFallback($);
    }
  }

  /**
   * Fallback business category detection (simple keyword matching)
   */
  detectBusinessCategoryFallback($) {
    const pageText = $('body').text().toLowerCase();
    const title = $('title').text().toLowerCase();
    const description = $('meta[name="description"]').attr('content') || '';
    
    const combinedContent = [pageText, title, description].join(' ').toLowerCase();

    // Enhanced categories including jewelry/accessories
    const categories = {
      'Jewelry & Accessories': /jewelry|jewellery|necklace|earring|bracelet|ring|watch|accessory|pendant|chain/,
      'Fashion & Clothing': /fashion|clothing|apparel|dress|shirt|pants|shoes|style|outfit|wear/,
      'Electronics & Technology': /electronics|computer|phone|laptop|tech|gadget|software|app|digital/,
      'Food & Beverage': /restaurant|cafe|food|dining|menu|cuisine|catering|delivery|coffee|drink/,
      'Beauty & Personal Care': /beauty|cosmetic|skincare|makeup|salon|spa|hair|nail|wellness/,
      'Home & Garden': /home|furniture|decor|garden|house|interior|outdoor|lawn|kitchen/,
      'Health & Medical': /health|medical|doctor|clinic|hospital|pharmacy|dental|therapy|fitness/,
      'Professional Services': /consulting|legal|accounting|financial|advisory|professional|business/,
      'Automotive': /auto|car|vehicle|repair|dealership|automotive|garage|parts/,
      'Real Estate': /real estate|property|housing|rental|mortgage|realtor|homes/
    };

    const scores = {};
    Object.entries(categories).forEach(([category, regex]) => {
      const matches = combinedContent.match(regex);
      scores[category] = matches ? matches.length : 0;
    });

    const topCategory = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .find(([category, score]) => score > 0);

    return {
      category: topCategory ? topCategory[0] : 'General Business',
      confidence: 0.6,
      products_services: [],
      agent_scope: {
        should_help_with: ["general inquiries"],
        should_not_help_with: []
      },
      reasoning: "Fallback keyword-based detection"
    };
  }

  /**
   * Detect industry (broader classification)
   */
  detectIndustry($) {
    const category = this.detectBusinessCategory($);
    
    const industryMapping = {
      'Restaurant/Food Service': 'Food & Beverage',
      'Retail/E-commerce': 'Retail',
      'Healthcare/Medical': 'Healthcare',
      'Technology/Software': 'Technology',
      'Professional Services': 'Professional Services',
      'Education/Training': 'Education',
      'Real Estate': 'Real Estate',
      'Automotive': 'Automotive',
      'Beauty/Wellness': 'Health & Beauty',
      'Home Services': 'Services',
      'Travel/Tourism': 'Travel & Hospitality',
      'Entertainment/Events': 'Entertainment',
      'Non-Profit/Organization': 'Non-Profit',
      'Manufacturing/Industrial': 'Manufacturing',
      'Finance/Insurance': 'Financial Services'
    };

    return industryMapping[category] || 'Other';
  }

  /**
   * Detect business type (B2B vs B2C)
   */
  detectBusinessType($) {
    const content = $('body').text().toLowerCase();
    
    const b2bIndicators = /enterprise|business|corporate|wholesale|b2b|solutions|professional|commercial/;
    const b2cIndicators = /customer|consumer|individual|personal|family|home|retail|b2c/;

    const b2bScore = (content.match(b2bIndicators) || []).length;
    const b2cScore = (content.match(b2cIndicators) || []).length;

    if (b2bScore > b2cScore * 2) return 'B2B';
    if (b2cScore > b2bScore * 2) return 'B2C';
    return 'B2B/B2C';
  }

  // Helper methods (simplified versions)
  
  extractBusinessName($, url) {
    const candidates = [
      $('h1').first().text().trim(),
      $('.logo').attr('alt'),
      $('title').text().split('-')[0].trim(),
      $('meta[property="og:site_name"]').attr('content'),
    ].filter(name => name && name.length > 0 && name.length < 100);

    return candidates[0] || new URL(url).hostname.replace('www.', '');
  }

  extractDescription($) {
    const candidates = [
      $('meta[name="description"]').attr('content'),
      $('meta[property="og:description"]').attr('content'),
      $('.hero-description, .intro-text').first().text().trim()
    ].filter(desc => desc && desc.length > 20);

    return candidates[0] || '';
  }

  detectPlatform($) {
    const generators = $('meta[name="generator"]').attr('content') || '';
    const combined = generators.toLowerCase();

    if (combined.includes('shopify')) return 'Shopify';
    if (combined.includes('wordpress')) return 'WordPress';
    if (combined.includes('wix')) return 'Wix';
    if (combined.includes('squarespace')) return 'Squarespace';
    if (combined.includes('webflow')) return 'Webflow';
    
    return 'Unknown';
  }

  async fetchWithRetry(url, retries = 0) {
    try {
      if (retries > 0) {
        await this.delay(this.rateLimitDelay * retries);
      }
      return await this.httpClient.get(url);
    } catch (error) {
      if (retries < this.maxRetries && (error.code === 'ECONNRESET' || error.response?.status >= 500)) {
        logger.warn(`Retry ${retries + 1}/${this.maxRetries} for ${url}`);
        return this.fetchWithRetry(url, retries + 1);
      }
      throw error;
    }
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
}

module.exports = BusinessCategoryScrapingService;