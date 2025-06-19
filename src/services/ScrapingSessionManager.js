const { PrismaClient } = require('@prisma/client');
const WebScrapingService = require('./WebScrapingService');
const logger = require('../utils/logger');

class ScrapingSessionManager {
  constructor() {
    this.prisma = new PrismaClient();
    this.scraper = new WebScrapingService();
    this.activeSessions = new Map(); // In-memory session tracking
    this.sessionTimeouts = new Map(); // Auto-save timeouts
  }

  /**
   * Start a scraping session
   */
  async startSession(sessionId, targetUrl, io = null) {
    try {
      logger.info('Starting scraping session', { sessionId, targetUrl });

      // Mark session as active
      this.activeSessions.set(sessionId, {
        status: 'discovering',
        startTime: Date.now(),
        currentStep: 1,
        io,
        targetUrl
      });

      // Update database
      await this.updateSessionProgress(sessionId, {
        status: 'discovering',
        currentStep: 1,
        stepProgress: {
          step1: { status: 'in_progress', title: 'Website Validation', startTime: new Date() }
        }
      });

      // Emit progress if WebSocket available
      this.emitProgress(sessionId, {
        step: 1,
        status: 'discovering',
        message: 'Validating website accessibility...',
        progress: 12.5
      });

      // Step 1: Validate website
      await this.validateWebsite(sessionId, targetUrl);

      // Step 2: Discover pages
      await this.discoverPages(sessionId, targetUrl);

      // Step 3: Scrape discovered pages
      await this.scrapePages(sessionId);

      // Step 4: Generate quality report
      await this.generateQualityReport(sessionId);

      return { success: true, sessionId };

    } catch (error) {
      logger.error('Scraping session failed', { sessionId, error: error.message });
      
      await this.updateSessionProgress(sessionId, {
        status: 'error',
        errors: [{ message: error.message, timestamp: new Date() }]
      });

      this.emitProgress(sessionId, {
        status: 'error',
        message: error.message,
        error: true
      });

      throw error;
    }
  }

  /**
   * Validate website accessibility
   */
  async validateWebsite(sessionId, targetUrl) {
    try {
      logger.info('Validating website', { sessionId, targetUrl });

      this.emitProgress(sessionId, {
        step: 1,
        status: 'validating',
        message: `Checking if ${targetUrl} is accessible...`,
        progress: 15
      });

      // Test if website is accessible
      const response = await this.scraper.makeRequest(targetUrl, { method: 'HEAD' });
      
      if (response.status !== 200) {
        throw new Error(`Website returned status ${response.status}`);
      }

      // Update step progress
      await this.updateSessionProgress(sessionId, {
        currentStep: 1,
        stepProgress: {
          step1: { 
            status: 'completed', 
            title: 'Website Validation',
            data: {
              status: response.status,
              accessible: true,
              responseTime: response.headers['x-response-time'] || 'unknown'
            },
            completedAt: new Date()
          }
        }
      });

      this.emitProgress(sessionId, {
        step: 1,
        status: 'completed',
        message: '✅ Website is accessible',
        progress: 25
      });

      logger.info('Website validation completed', { sessionId, status: response.status });

    } catch (error) {
      logger.error('Website validation failed', { sessionId, error: error.message });
      
      await this.updateSessionProgress(sessionId, {
        stepProgress: {
          step1: {
            status: 'failed',
            title: 'Website Validation',
            error: error.message,
            completedAt: new Date()
          }
        }
      });

      throw new Error(`Website validation failed: ${error.message}`);
    }
  }

  /**
   * Discover pages on the website
   */
  async discoverPages(sessionId, targetUrl) {
    try {
      logger.info('Starting page discovery', { sessionId, targetUrl });

      await this.updateSessionProgress(sessionId, {
        status: 'discovering',
        currentStep: 2,
        stepProgress: {
          step2: {
            status: 'in_progress',
            title: 'Page Discovery',
            startTime: new Date()
          }
        }
      });

      this.emitProgress(sessionId, {
        step: 2,
        status: 'discovering',
        message: 'Discovering pages on your website...',
        progress: 35
      });

      // Discover pages using our scraping service
      const discoveryResult = await this.scraper.discoverPages(targetUrl);

      // Save discovered pages to database
      const session = await this.prisma.scrapingSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Create ScrapedPage records for discovered pages
      const pagePromises = [];
      for (const [category, pages] of Object.entries(discoveryResult.pages)) {
        for (const pageUrl of pages) {
          pagePromises.push(
            this.prisma.scrapedPage.create({
              data: {
                scrapingSessionId: sessionId,
                url: pageUrl,
                pageType: category,
                discoveryMethod: 'automatic',
                status: 'pending'
              }
            })
          );
        }
      }

      await Promise.all(pagePromises);

      // Update session with discovery results
      await this.updateSessionProgress(sessionId, {
        discoveredPages: JSON.stringify(discoveryResult.pages),
        stepProgress: {
          step2: {
            status: 'completed',
            title: 'Page Discovery',
            data: {
              totalPages: discoveryResult.totalPages,
              discoveryMethods: discoveryResult.discoveryMethods,
              categorizedPages: discoveryResult.pages
            },
            completedAt: new Date()
          }
        }
      });

      this.emitProgress(sessionId, {
        step: 2,
        status: 'completed',
        message: `✅ Discovered ${discoveryResult.totalPages} pages`,
        progress: 50,
        data: {
          totalPages: discoveryResult.totalPages,
          categories: Object.keys(discoveryResult.pages).filter(k => discoveryResult.pages[k].length > 0)
        }
      });

      logger.info('Page discovery completed', {
        sessionId,
        totalPages: discoveryResult.totalPages
      });

      return discoveryResult;

    } catch (error) {
      logger.error('Page discovery failed', { sessionId, error: error.message });
      
      await this.updateSessionProgress(sessionId, {
        stepProgress: {
          step2: {
            status: 'failed',
            title: 'Page Discovery',
            error: error.message,
            completedAt: new Date()
          }
        }
      });

      throw error;
    }
  }

  /**
   * Scrape discovered pages
   */
  async scrapePages(sessionId) {
    try {
      logger.info('Starting page scraping', { sessionId });

      await this.updateSessionProgress(sessionId, {
        status: 'scraping',
        currentStep: 3,
        stepProgress: {
          step3: {
            status: 'in_progress',
            title: 'Content Extraction',
            startTime: new Date()
          }
        }
      });

      // Get pages to scrape
      const pages = await this.prisma.scrapedPage.findMany({
        where: {
          scrapingSessionId: sessionId,
          status: 'pending'
        },
        orderBy: [
          { pageType: 'asc' }, // Prioritize important pages
          { createdAt: 'asc' }
        ]
      });

      if (pages.length === 0) {
        throw new Error('No pages to scrape');
      }

      this.emitProgress(sessionId, {
        step: 3,
        status: 'scraping',
        message: `Extracting content from ${pages.length} pages...`,
        progress: 60
      });

      let completedPages = 0;
      const extractedData = {};

      // Scrape pages with rate limiting
      for (const page of pages) {
        try {
          logger.debug('Scraping page', { sessionId, url: page.url, pageType: page.pageType });

          this.emitProgress(sessionId, {
            step: 3,
            status: 'scraping',
            message: `Scraping ${page.pageType}: ${page.url}`,
            progress: 60 + (completedPages / pages.length) * 25,
            currentPage: {
              url: page.url,
              type: page.pageType,
              progress: completedPages + 1,
              total: pages.length
            }
          });

          // Scrape the page
          const scrapingResult = await this.scraper.scrapePage(page.url, page.pageType);

          // Update the scraped page record
          await this.prisma.scrapedPage.update({
            where: { id: page.id },
            data: {
              status: scrapingResult.status,
              extractedData: scrapingResult.extractedData ? JSON.stringify(scrapingResult.extractedData) : null,
              extractedText: scrapingResult.extractedText,
              contentQuality: scrapingResult.contentQuality,
              processingTime: scrapingResult.processingTime,
              scrapedAt: new Date(),
              lastError: scrapingResult.error || null
            }
          });

          // Store extracted data by category
          if (scrapingResult.extractedData) {
            if (!extractedData[page.pageType]) {
              extractedData[page.pageType] = [];
            }
            extractedData[page.pageType].push(scrapingResult.extractedData);
          }

          completedPages++;

          // Rate limiting - wait between requests
          await this.scraper.delay(this.scraper.rateLimitDelay);

        } catch (error) {
          logger.error('Failed to scrape page', {
            sessionId,
            url: page.url,
            error: error.message
          });

          // Mark page as failed but continue
          await this.prisma.scrapedPage.update({
            where: { id: page.id },
            data: {
              status: 'failed',
              lastError: error.message,
              scrapedAt: new Date()
            }
          });

          completedPages++;
        }
      }

      // Update session with extracted data
      await this.updateSessionProgress(sessionId, {
        extractedData: JSON.stringify(extractedData),
        stepProgress: {
          step3: {
            status: 'completed',
            title: 'Content Extraction',
            data: {
              totalPages: pages.length,
              completedPages,
              failedPages: pages.length - completedPages,
              extractedCategories: Object.keys(extractedData)
            },
            completedAt: new Date()
          }
        }
      });

      this.emitProgress(sessionId, {
        step: 3,
        status: 'completed',
        message: `✅ Extracted content from ${completedPages}/${pages.length} pages`,
        progress: 85,
        data: {
          completedPages,
          totalPages: pages.length,
          categories: Object.keys(extractedData)
        }
      });

      logger.info('Page scraping completed', {
        sessionId,
        totalPages: pages.length,
        completedPages
      });

      return extractedData;

    } catch (error) {
      logger.error('Page scraping failed', { sessionId, error: error.message });
      
      await this.updateSessionProgress(sessionId, {
        stepProgress: {
          step3: {
            status: 'failed',
            title: 'Content Extraction',
            error: error.message,
            completedAt: new Date()
          }
        }
      });

      throw error;
    }
  }

  /**
   * Generate quality report
   */
  async generateQualityReport(sessionId) {
    try {
      logger.info('Generating quality report', { sessionId });

      await this.updateSessionProgress(sessionId, {
        status: 'reviewing',
        currentStep: 4,
        stepProgress: {
          step4: {
            status: 'in_progress',
            title: 'Quality Review',
            startTime: new Date()
          }
        }
      });

      this.emitProgress(sessionId, {
        step: 4,
        status: 'analyzing',
        message: 'Analyzing content quality and completeness...',
        progress: 90
      });

      // Get all scraped pages for analysis
      const pages = await this.prisma.scrapedPage.findMany({
        where: { scrapingSessionId: sessionId }
      });

      const qualityMetrics = {
        totalPages: pages.length,
        successfulPages: pages.filter(p => p.status === 'completed').length,
        failedPages: pages.filter(p => p.status === 'failed').length,
        averageQuality: 0,
        missingData: [],
        recommendations: []
      };

      // Calculate average quality
      const completedPages = pages.filter(p => p.status === 'completed' && p.contentQuality);
      if (completedPages.length > 0) {
        qualityMetrics.averageQuality = completedPages.reduce((sum, p) => sum + p.contentQuality, 0) / completedPages.length;
      }

      // Analyze missing critical data
      const criticalPages = ['homepage', 'about', 'contact'];
      const foundPages = pages.map(p => p.pageType);
      
      criticalPages.forEach(pageType => {
        if (!foundPages.includes(pageType)) {
          qualityMetrics.missingData.push({
            type: 'missing_page',
            page: pageType,
            severity: 'high',
            message: `No ${pageType} page found`
          });
        }
      });

      // Generate recommendations
      if (qualityMetrics.averageQuality < 0.5) {
        qualityMetrics.recommendations.push({
          type: 'content_quality',
          message: 'Content quality is below average. Consider manually adding key information.',
          priority: 'high'
        });
      }

      if (qualityMetrics.failedPages > qualityMetrics.totalPages * 0.3) {
        qualityMetrics.recommendations.push({
          type: 'scraping_issues',
          message: 'Many pages failed to scrape. Website may have anti-bot protection.',
          priority: 'medium'
        });
      }

      // Update session with quality report
      await this.updateSessionProgress(sessionId, {
        qualityScore: qualityMetrics.averageQuality,
        validationResults: JSON.stringify(qualityMetrics),
        stepProgress: {
          step4: {
            status: 'completed',
            title: 'Quality Review',
            data: qualityMetrics,
            completedAt: new Date()
          }
        }
      });

      this.emitProgress(sessionId, {
        step: 4,
        status: 'completed',
        message: '✅ Quality analysis complete',
        progress: 100,
        data: qualityMetrics
      });

      logger.info('Quality report generated', {
        sessionId,
        averageQuality: qualityMetrics.averageQuality,
        missingDataCount: qualityMetrics.missingData.length
      });

      return qualityMetrics;

    } catch (error) {
      logger.error('Quality report generation failed', { sessionId, error: error.message });
      
      await this.updateSessionProgress(sessionId, {
        stepProgress: {
          step4: {
            status: 'failed',
            title: 'Quality Review',
            error: error.message,
            completedAt: new Date()
          }
        }
      });

      throw error;
    }
  }

  /**
   * Update session progress in database
   */
  async updateSessionProgress(sessionId, updates) {
    try {
      // Get current session data
      const currentSession = await this.prisma.scrapingSession.findUnique({
        where: { id: sessionId }
      });

      if (!currentSession) {
        throw new Error('Session not found');
      }

      // Merge step progress
      let mergedStepProgress = {};
      if (currentSession.stepProgress) {
        mergedStepProgress = JSON.parse(currentSession.stepProgress);
      }
      if (updates.stepProgress) {
        mergedStepProgress = { ...mergedStepProgress, ...updates.stepProgress };
      }

      const updateData = {
        ...updates,
        lastActivity: new Date()
      };

      if (Object.keys(mergedStepProgress).length > 0) {
        updateData.stepProgress = JSON.stringify(mergedStepProgress);
      }

      await this.prisma.scrapingSession.update({
        where: { id: sessionId },
        data: updateData
      });

      // Setup auto-save timeout
      this.setupAutoSave(sessionId);

    } catch (error) {
      logger.error('Failed to update session progress', { sessionId, error: error.message });
      throw error;
    }
  }

  /**
   * Setup auto-save timeout
   */
  setupAutoSave(sessionId) {
    // Clear existing timeout
    if (this.sessionTimeouts.has(sessionId)) {
      clearTimeout(this.sessionTimeouts.get(sessionId));
    }

    // Set new timeout for 30 seconds
    const timeout = setTimeout(async () => {
      try {
        await this.autoSaveSession(sessionId);
      } catch (error) {
        logger.error('Auto-save failed', { sessionId, error: error.message });
      }
    }, 30000);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  /**
   * Auto-save session checkpoint
   */
  async autoSaveSession(sessionId) {
    if (!this.activeSessions.has(sessionId)) return;

    const sessionState = this.activeSessions.get(sessionId);
    const checkpoint = {
      timestamp: new Date().toISOString(),
      status: sessionState.status,
      currentStep: sessionState.currentStep,
      memory: {
        activeSessions: this.activeSessions.size,
        uptime: Date.now() - sessionState.startTime
      }
    };

    await this.prisma.scrapingSession.update({
      where: { id: sessionId },
      data: {
        saveCheckpoint: JSON.stringify(checkpoint),
        lastActivity: new Date()
      }
    });

    logger.debug('Session auto-saved', { sessionId });
  }

  /**
   * Emit progress via WebSocket
   */
  emitProgress(sessionId, progressData) {
    const sessionState = this.activeSessions.get(sessionId);
    if (sessionState && sessionState.io) {
      sessionState.io.emit('scraping-progress', {
        sessionId,
        timestamp: new Date().toISOString(),
        ...progressData
      });
    }
  }

  /**
   * Pause session
   */
  async pauseSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      const sessionState = this.activeSessions.get(sessionId);
      sessionState.status = 'paused';
      
      await this.updateSessionProgress(sessionId, {
        status: 'paused',
        pausedAt: new Date()
      });

      this.emitProgress(sessionId, {
        status: 'paused',
        message: 'Session paused by user'
      });
    }
  }

  /**
   * Resume session
   */
  async resumeSession(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      const sessionState = this.activeSessions.get(sessionId);
      sessionState.status = 'discovering'; // Resume to appropriate state
      
      await this.updateSessionProgress(sessionId, {
        status: 'discovering',
        pausedAt: null
      });

      this.emitProgress(sessionId, {
        status: 'resumed',
        message: 'Session resumed'
      });
    }
  }

  /**
   * Cleanup session
   */
  cleanup(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      this.activeSessions.delete(sessionId);
    }
    if (this.sessionTimeouts.has(sessionId)) {
      clearTimeout(this.sessionTimeouts.get(sessionId));
      this.sessionTimeouts.delete(sessionId);
    }
  }
}

module.exports = ScrapingSessionManager;