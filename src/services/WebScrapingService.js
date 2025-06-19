const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const logger = require('../utils/logger');

class WebScrapingService {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 3;
    this.rateLimitDelay = options.rateLimitDelay || 2000; // 2 seconds between requests
    this.userAgent = options.userAgent || 'AI Customer Care Agent Scraper 1.0';
  }

  /**
   * Discover pages from a website
   * @param {string} baseUrl - The website URL to discover pages from
   * @returns {Promise<Object>} Discovery results
   */
  async discoverPages(baseUrl) {
    try {
      logger.info('Starting page discovery', { baseUrl });
      
      const discoveredPages = new Set();
      const sitemapPages = await this.findSitemapPages(baseUrl);
      const navigationPages = await this.findNavigationPages(baseUrl);
      const patternPages = await this.findPatternPages(baseUrl);

      // Combine all discovered pages
      [...sitemapPages, ...navigationPages, ...patternPages].forEach(page => {
        if (page && this.isValidUrl(page, baseUrl)) {
          discoveredPages.add(page);
        }
      });

      const pages = Array.from(discoveredPages);
      const categorizedPages = this.categorizePages(pages, baseUrl);

      logger.info('Page discovery completed', {
        baseUrl,
        totalPages: pages.length,
        sitemapPages: sitemapPages.length,
        navigationPages: navigationPages.length,
        patternPages: patternPages.length
      });

      return {
        totalPages: pages.length,
        pages: categorizedPages,
        discoveryMethods: {
          sitemap: sitemapPages.length,
          navigation: navigationPages.length,
          patterns: patternPages.length
        }
      };

    } catch (error) {
      logger.error('Page discovery failed', { baseUrl, error: error.message });
      throw new Error(`Page discovery failed: ${error.message}`);
    }
  }

  /**
   * Find pages from sitemap.xml
   */
  async findSitemapPages(baseUrl) {
    try {
      const sitemapUrls = [
        `${baseUrl}/sitemap.xml`,
        `${baseUrl}/sitemap_index.xml`,
        `${baseUrl}/robots.txt` // Check robots.txt for sitemap references
      ];

      const pages = [];

      for (const sitemapUrl of sitemapUrls) {
        try {
          const response = await this.makeRequest(sitemapUrl);
          
          if (sitemapUrl.endsWith('robots.txt')) {
            // Extract sitemap URLs from robots.txt
            const sitemapLines = response.data.split('\n')
              .filter(line => line.toLowerCase().startsWith('sitemap:'))
              .map(line => line.split(':', 2)[1].trim());
            
            for (const sitemap of sitemapLines) {
              const sitemapPages = await this.parseSitemap(sitemap);
              pages.push(...sitemapPages);
            }
          } else {
            const sitemapPages = await this.parseSitemap(sitemapUrl, response.data);
            pages.push(...sitemapPages);
          }
        } catch (error) {
          // Continue to next sitemap if one fails
          logger.debug('Sitemap not found or inaccessible', { url: sitemapUrl });
        }
      }

      return [...new Set(pages)]; // Remove duplicates

    } catch (error) {
      logger.debug('Sitemap discovery failed', { error: error.message });
      return [];
    }
  }

  /**
   * Parse sitemap XML
   */
  async parseSitemap(sitemapUrl, xmlData = null) {
    try {
      if (!xmlData) {
        const response = await this.makeRequest(sitemapUrl);
        xmlData = response.data;
      }

      const $ = cheerio.load(xmlData, { xmlMode: true });
      const urls = [];

      // Handle sitemap index files
      $('sitemap > loc').each((i, elem) => {
        const sitemapUrl = $(elem).text().trim();
        urls.push(sitemapUrl);
      });

      // Handle regular sitemap files
      $('url > loc').each((i, elem) => {
        const url = $(elem).text().trim();
        urls.push(url);
      });

      // If this was a sitemap index, recursively fetch the individual sitemaps
      if (urls.length > 0 && urls[0].includes('sitemap')) {
        const allPages = [];
        for (const url of urls.slice(0, 10)) { // Limit to 10 sitemaps to avoid going crazy
          try {
            const pages = await this.parseSitemap(url);
            allPages.push(...pages);
          } catch (error) {
            logger.debug('Failed to parse sitemap', { url, error: error.message });
          }
        }
        return allPages;
      }

      return urls;

    } catch (error) {
      logger.debug('Sitemap parsing failed', { sitemapUrl, error: error.message });
      return [];
    }
  }

  /**
   * Find pages from navigation menus
   */
  async findNavigationPages(baseUrl) {
    try {
      const response = await this.makeRequest(baseUrl);
      const $ = cheerio.load(response.data);
      const pages = new Set();

      // Common navigation selectors
      const navSelectors = [
        'nav a',
        '.navigation a',
        '.menu a',
        '.navbar a',
        'header a',
        '.header a',
        'footer a',
        '.footer a',
        '.main-menu a',
        '.primary-menu a'
      ];

      navSelectors.forEach(selector => {
        $(selector).each((i, elem) => {
          const href = $(elem).attr('href');
          if (href) {
            const fullUrl = this.resolveUrl(href, baseUrl);
            if (fullUrl && this.isValidUrl(fullUrl, baseUrl)) {
              pages.add(fullUrl);
            }
          }
        });
      });

      return Array.from(pages);

    } catch (error) {
      logger.debug('Navigation discovery failed', { error: error.message });
      return [];
    }
  }

  /**
   * Find pages using common URL patterns
   */
  async findPatternPages(baseUrl) {
    const commonPatterns = [
      '/about',
      '/about-us',
      '/company',
      '/who-we-are',
      '/contact',
      '/contact-us',
      '/reach-us',
      '/get-in-touch',
      '/services',
      '/what-we-do',
      '/offerings',
      '/products',
      '/shop',
      '/store',
      '/catalog',
      '/privacy',
      '/privacy-policy',
      '/terms',
      '/terms-of-service',
      '/legal',
      '/returns',
      '/return-policy',
      '/refund',
      '/shipping',
      '/delivery',
      '/faq',
      '/help',
      '/support',
      '/team',
      '/leadership',
      '/careers',
      '/jobs',
      '/blog',
      '/news',
      '/press'
    ];

    const pages = [];

    for (const pattern of commonPatterns) {
      const testUrl = `${baseUrl}${pattern}`;
      try {
        const response = await this.makeRequest(testUrl, { method: 'HEAD' });
        if (response.status === 200) {
          pages.push(testUrl);
        }
      } catch (error) {
        // Page doesn't exist, continue
      }
      
      // Rate limiting
      await this.delay(100);
    }

    return pages;
  }

  /**
   * Categorize discovered pages by type
   */
  categorizePages(pages, baseUrl) {
    const categorized = {
      homepage: [],
      about: [],
      contact: [],
      products: [],
      services: [],
      policies: [],
      faq: [],
      blog: [],
      other: []
    };

    pages.forEach(page => {
      const url = page.toLowerCase();
      const category = this.categorizePage(url, baseUrl);
      if (categorized[category]) {
        categorized[category].push(page);
      } else {
        categorized.other.push(page);
      }
    });

    return categorized;
  }

  /**
   * Categorize a single page
   */
  categorizePage(url, baseUrl) {
    const path = url.replace(baseUrl.toLowerCase(), '').replace(/\/$/, '');
    
    if (path === '' || path === '/') return 'homepage';
    if (path.includes('about') || path.includes('company') || path.includes('who-we-are')) return 'about';
    if (path.includes('contact') || path.includes('reach-us') || path.includes('get-in-touch')) return 'contact';
    if (path.includes('product') || path.includes('shop') || path.includes('store') || path.includes('catalog')) return 'products';
    if (path.includes('service') || path.includes('what-we-do') || path.includes('offering')) return 'services';
    if (path.includes('privacy') || path.includes('terms') || path.includes('legal') || path.includes('policy') || path.includes('return') || path.includes('refund') || path.includes('shipping')) return 'policies';
    if (path.includes('faq') || path.includes('help') || path.includes('support')) return 'faq';
    if (path.includes('blog') || path.includes('news') || path.includes('press') || path.includes('article')) return 'blog';
    
    return 'other';
  }

  /**
   * Scrape content from a specific page
   */
  async scrapePage(url, pageType = 'unknown') {
    try {
      logger.info('Scraping page', { url, pageType });
      
      const startTime = Date.now();
      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, noscript').remove();
      
      const extractedData = {
        url,
        pageType,
        title: $('title').text().trim(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        h1: $('h1').first().text().trim(),
        headings: this.extractHeadings($),
        content: this.extractContent($, pageType),
        images: this.extractImages($, url),
        links: this.extractLinks($, url),
        contactInfo: this.extractContactInfo($),
        structuredData: this.extractStructuredData($)
      };

      const processingTime = Date.now() - startTime;
      const contentQuality = this.assessContentQuality(extractedData);

      logger.info('Page scraped successfully', {
        url,
        processingTime,
        contentQuality,
        contentLength: extractedData.content.text?.length || 0
      });

      return {
        extractedData,
        extractedText: this.generateCleanText(extractedData),
        contentQuality,
        processingTime,
        status: 'completed'
      };

    } catch (error) {
      logger.error('Page scraping failed', { url, error: error.message });
      return {
        extractedData: null,
        extractedText: null,
        contentQuality: 0,
        processingTime: 0,
        status: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Extract headings from page
   */
  extractHeadings($) {
    const headings = {};
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
      headings[tag] = [];
      $(tag).each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) headings[tag].push(text);
      });
    });
    return headings;
  }

  /**
   * Extract main content based on page type
   */
  extractContent($, pageType) {
    const content = {
      text: '',
      sections: [],
      lists: [],
      tables: []
    };

    // Try to find main content area
    const contentSelectors = [
      'main',
      '.main-content',
      '.content',
      '.page-content',
      'article',
      '.post-content',
      '.entry-content',
      '#content'
    ];

    let $contentArea = $('body');
    for (const selector of contentSelectors) {
      if ($(selector).length > 0) {
        $contentArea = $(selector).first();
        break;
      }
    }

    // Extract text content
    content.text = $contentArea.text().replace(/\s+/g, ' ').trim();

    // Extract sections with headings
    $contentArea.find('h1, h2, h3').each((i, elem) => {
      const $heading = $(elem);
      const title = $heading.text().trim();
      const $nextElements = $heading.nextUntil('h1, h2, h3');
      const sectionText = $nextElements.text().replace(/\s+/g, ' ').trim();
      
      if (title && sectionText) {
        content.sections.push({ title, content: sectionText });
      }
    });

    // Extract lists
    $contentArea.find('ul, ol').each((i, elem) => {
      const items = [];
      $(elem).find('li').each((j, li) => {
        const text = $(li).text().trim();
        if (text) items.push(text);
      });
      if (items.length > 0) {
        content.lists.push(items);
      }
    });

    return content;
  }

  /**
   * Extract images with metadata
   */
  extractImages($, baseUrl) {
    const images = [];
    $('img').each((i, elem) => {
      const $img = $(elem);
      const src = $img.attr('src');
      if (src) {
        images.push({
          src: this.resolveUrl(src, baseUrl),
          alt: $img.attr('alt') || '',
          title: $img.attr('title') || '',
          width: $img.attr('width'),
          height: $img.attr('height')
        });
      }
    });
    return images;
  }

  /**
   * Extract links
   */
  extractLinks($, baseUrl) {
    const links = [];
    $('a[href]').each((i, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      const text = $link.text().trim();
      if (href && text) {
        links.push({
          url: this.resolveUrl(href, baseUrl),
          text,
          title: $link.attr('title') || ''
        });
      }
    });
    return links;
  }

  /**
   * Extract contact information
   */
  extractContactInfo($) {
    const contact = {
      emails: [],
      phones: [],
      addresses: []
    };

    // Email patterns
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const pageText = $('body').text();
    const emails = pageText.match(emailRegex) || [];
    contact.emails = [...new Set(emails)];

    // Phone patterns (basic)
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const phones = pageText.match(phoneRegex) || [];
    contact.phones = [...new Set(phones)];

    // Look for address elements
    $('address, .address, .location').each((i, elem) => {
      const addressText = $(elem).text().trim();
      if (addressText) {
        contact.addresses.push(addressText);
      }
    });

    return contact;
  }

  /**
   * Extract structured data (JSON-LD, microdata, etc.)
   */
  extractStructuredData($) {
    const structuredData = [];

    // JSON-LD
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        structuredData.push(data);
      } catch (error) {
        // Invalid JSON-LD, skip
      }
    });

    return structuredData;
  }

  /**
   * Assess content quality
   */
  assessContentQuality(extractedData) {
    let score = 0;
    
    // Title exists and reasonable length
    if (extractedData.title && extractedData.title.length > 10) score += 0.2;
    
    // Meta description exists
    if (extractedData.metaDescription && extractedData.metaDescription.length > 20) score += 0.1;
    
    // H1 exists
    if (extractedData.h1 && extractedData.h1.length > 5) score += 0.1;
    
    // Reasonable amount of content
    if (extractedData.content.text && extractedData.content.text.length > 100) score += 0.3;
    if (extractedData.content.text && extractedData.content.text.length > 500) score += 0.2;
    
    // Has images
    if (extractedData.images && extractedData.images.length > 0) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate clean text summary
   */
  generateCleanText(extractedData) {
    const sections = [];
    
    if (extractedData.title) sections.push(`Title: ${extractedData.title}`);
    if (extractedData.h1 && extractedData.h1 !== extractedData.title) sections.push(`Heading: ${extractedData.h1}`);
    if (extractedData.metaDescription) sections.push(`Description: ${extractedData.metaDescription}`);
    if (extractedData.content.text) sections.push(`Content: ${extractedData.content.text.substring(0, 1000)}`);
    
    return sections.join('\n\n');
  }

  /**
   * Utility methods
   */
  async makeRequest(url, options = {}) {
    const config = {
      url,
      method: options.method || 'GET',
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        ...options.headers
      },
      maxRedirects: 5,
      ...options
    };

    const response = await axios(config);
    return response;
  }

  resolveUrl(href, baseUrl) {
    try {
      return new URL(href, baseUrl).href;
    } catch (error) {
      return null;
    }
  }

  isValidUrl(url, baseUrl) {
    try {
      const urlObj = new URL(url);
      const baseObj = new URL(baseUrl);
      
      // Only include pages from the same domain
      if (urlObj.hostname !== baseObj.hostname) return false;
      
      // Skip certain file types
      const skipExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.zip', '.tar', '.gz'];
      const pathname = urlObj.pathname.toLowerCase();
      if (skipExtensions.some(ext => pathname.endsWith(ext))) return false;
      
      // Skip certain paths
      const skipPaths = ['/admin', '/wp-admin', '/login', '/dashboard', '/api/', '/ajax/', '/assets/', '/static/'];
      if (skipPaths.some(path => pathname.startsWith(path))) return false;
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = WebScrapingService;