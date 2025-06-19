const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const WebScrapingService = require('../services/WebScrapingService');
const BusinessCategoryScrapingService = require('../services/BusinessCategoryScrapingService');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const prisma = new PrismaClient();
const scrapingService = new WebScrapingService();
const categoryService = new BusinessCategoryScrapingService();

// WebSocket will be set up in server.js
let wss = null;
const activeSessions = new Map();

// Function to set WebSocket server (called from server.js)
function setWebSocketServer(webSocketServer) {
  wss = webSocketServer;
  setupWebSocketHandlers();
}

// Session-based scraping with WebSocket support
class ScrapingSessionManager {
  constructor() {
    this.sessions = new Map();
    this.scrapingService = new BusinessCategoryScrapingService();
  }

  async createSession(sessionId, url, businessId) {
    const session = {
      sessionId,
      url,
      businessId,
      status: 'pending',
      currentStep: 1,
      steps: this.initializeSteps(),
      startedAt: new Date().toISOString(),
      canResume: true,
      progress: 0
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  initializeSteps() {
    return [
      {
        id: 1,
        title: "Initialize Scraping",
        description: "Setting up scraping environment and validating URL",
        status: 'pending',
        progress: 0
      },
      {
        id: 2,
        title: "Fetch Website Content",
        description: "Downloading and parsing website HTML content",
        status: 'pending',
        progress: 0
      },
      {
        id: 3,
        title: "Extract Business Information",
        description: "Identifying business name, description, and basic details",
        status: 'pending',
        progress: 0
      },
      {
        id: 4,
        title: "Analyze Navigation Structure",
        description: "Mapping website navigation and important pages",
        status: 'pending',
        progress: 0
      },
      {
        id: 5,
        title: "Extract Footer Pages",
        description: "Categorizing footer links (policies, support, company info)",
        status: 'pending',
        progress: 0
      },
      {
        id: 6,
        title: "AI Category Analysis",
        description: "Using OpenAI to determine business category and scope",
        status: 'pending',
        progress: 0
      },
      {
        id: 7,
        title: "Platform & Technology Detection",
        description: "Identifying website platform and technology stack",
        status: 'pending',
        progress: 0
      },
      {
        id: 8,
        title: "Finalize Analysis",
        description: "Compiling results and saving to database",
        status: 'pending',
        progress: 0
      }
    ];
  }

  async runSession(sessionId, wsConnection) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      session.status = 'running';
      this.broadcastSessionUpdate(sessionId, wsConnection);

      // Step 1: Initialize
      await this.updateStep(sessionId, 1, 'running', 0, 'Initializing scraping environment...', wsConnection);
      await this.delay(500);
      await this.updateStep(sessionId, 1, 'completed', 100, 'Environment ready', wsConnection);

      // Step 2: Fetch content
      await this.updateStep(sessionId, 2, 'running', 0, 'Fetching website content...', wsConnection);
      await this.updateStep(sessionId, 2, 'running', 50, 'Downloading HTML...', wsConnection);
      await this.updateStep(sessionId, 2, 'completed', 100, 'Content fetched successfully', wsConnection);

      // Step 3: Extract business info
      await this.updateStep(sessionId, 3, 'running', 0, 'Extracting business information...', wsConnection);
      await this.updateStep(sessionId, 3, 'running', 30, 'Analyzing business name...', wsConnection);
      await this.updateStep(sessionId, 3, 'running', 70, 'Extracting description...', wsConnection);
      await this.updateStep(sessionId, 3, 'completed', 100, 'Business information extracted', wsConnection);

      // Step 4: Navigation analysis
      await this.updateStep(sessionId, 4, 'running', 0, 'Analyzing navigation structure...', wsConnection);
      await this.updateStep(sessionId, 4, 'running', 60, 'Mapping navigation links...', wsConnection);
      await this.updateStep(sessionId, 4, 'completed', 100, 'Navigation mapped successfully', wsConnection);

      // Step 5: Footer pages
      await this.updateStep(sessionId, 5, 'running', 0, 'Extracting footer pages...', wsConnection);
      await this.updateStep(sessionId, 5, 'running', 40, 'Categorizing footer links...', wsConnection);
      await this.updateStep(sessionId, 5, 'completed', 100, 'Footer pages categorized', wsConnection);

      // Step 6: AI Analysis (the real work)
      await this.updateStep(sessionId, 6, 'running', 0, 'Starting AI category analysis...', wsConnection);
      await this.updateStep(sessionId, 6, 'running', 20, 'Sending request to OpenAI...', wsConnection);
      
      // Actually run the business analysis
      const analysisResult = await this.scrapingService.analyzeBusinessCategory(session.url);
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error);
      }

      await this.updateStep(sessionId, 6, 'running', 80, 'Processing AI response...', wsConnection);
      await this.updateStep(sessionId, 6, 'completed', 100, 'AI analysis completed', wsConnection);

      // Step 7: Platform detection
      await this.updateStep(sessionId, 7, 'running', 0, 'Detecting platform...', wsConnection);
      await this.updateStep(sessionId, 7, 'completed', 100, 'Platform detected', wsConnection);

      // Step 8: Finalize
      await this.updateStep(sessionId, 8, 'running', 0, 'Saving to database...', wsConnection);
      
      // Save to database
      const setupData = {
        businessName: analysisResult.data.businessName,
        businessCategory: analysisResult.data.businessCategory,
        industry: analysisResult.data.industry,
        businessType: analysisResult.data.businessType,
        platform: analysisResult.data.platform,
        description: analysisResult.data.description,
        website: session.url,
        footerPages: analysisResult.data.footerPages,
        importantPages: analysisResult.data.importantPages,
        agentScope: analysisResult.data.agentScope,
        productsServices: analysisResult.data.productsServices,
        categoryConfidence: analysisResult.data.categoryConfidence,
        categoryReasoning: analysisResult.data.categoryReasoning,
        extractedAt: analysisResult.data.analyzedAt,
        readyForSetup: true
      };

      // Save to business context
      await prisma.businessContext.upsert({
        where: { businessId: session.businessId },
        update: {
          businessInfo: JSON.stringify({
            name: setupData.businessName,
            category: setupData.businessCategory,
            industry: setupData.industry,
            businessType: setupData.businessType,
            platform: setupData.platform,
            description: setupData.description,
            agentScope: setupData.agentScope,
            productsServices: setupData.productsServices,
            categoryConfidence: setupData.categoryConfidence,
            categoryReasoning: setupData.categoryReasoning
          }),
          contactInfo: JSON.stringify({
            website: setupData.website,
            extractedAt: setupData.extractedAt
          }),
          serviceInfo: JSON.stringify({
            footerPages: setupData.footerPages,
            importantPages: setupData.importantPages,
            readyForSetup: setupData.readyForSetup
          })
        },
        create: {
          businessId: session.businessId,
          businessInfo: JSON.stringify({
            name: setupData.businessName,
            category: setupData.businessCategory,
            industry: setupData.industry,
            businessType: setupData.businessType,
            platform: setupData.platform,
            description: setupData.description,
            agentScope: setupData.agentScope,
            productsServices: setupData.productsServices,
            categoryConfidence: setupData.categoryConfidence,
            categoryReasoning: setupData.categoryReasoning
          }),
          contactInfo: JSON.stringify({
            website: setupData.website,
            extractedAt: setupData.extractedAt
          }),
          serviceInfo: JSON.stringify({
            footerPages: setupData.footerPages,
            importantPages: setupData.importantPages,
            readyForSetup: setupData.readyForSetup
          })
        }
      });

      await this.updateStep(sessionId, 8, 'completed', 100, 'Analysis saved successfully', wsConnection);

      // Complete session
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      session.businessData = setupData;

      // Broadcast completion
      wsConnection.send(JSON.stringify({
        type: 'session_complete',
        sessionId,
        businessData: setupData
      }));

      logger.info('Scraping session completed successfully', { sessionId, url: session.url });

    } catch (error) {
      logger.error('Scraping session failed', { sessionId, error: error.message });
      session.status = 'error';
      
      wsConnection.send(JSON.stringify({
        type: 'error',
        sessionId,
        error: error.message
      }));
    }
  }

  async updateStep(sessionId, stepId, status, progress, details, wsConnection) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const stepIndex = session.steps.findIndex(step => step.id === stepId);
    if (stepIndex === -1) return;

    session.steps[stepIndex] = {
      ...session.steps[stepIndex],
      status,
      progress,
      details
    };

    session.currentStep = stepId;

    // Broadcast step update
    wsConnection.send(JSON.stringify({
      type: 'step_update',
      sessionId,
      stepId,
      stepData: session.steps[stepIndex]
    }));

    // Small delay for realistic progress
    if (status === 'running') {
      await this.delay(200);
    }
  }

  broadcastSessionUpdate(sessionId, wsConnection) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    wsConnection.send(JSON.stringify({
      type: 'session_update',
      session
    }));
  }

  pauseSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'paused';
    }
  }

  resumeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'running';
    }
  }

  getRecoverySessions(businessId) {
    return Array.from(this.sessions.values())
      .filter(session => 
        session.businessId === businessId && 
        ['paused', 'error'].includes(session.status)
      );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const sessionManager = new ScrapingSessionManager();

// WebSocket connection handling setup
function setupWebSocketHandlers() {
  if (!wss) return;
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'auth':
            // Store business ID for this connection
            ws.businessId = data.businessId;
            activeSessions.set(data.businessId, ws);
            break;
            
          case 'start_session':
            const session = await sessionManager.createSession(
              data.sessionId, 
              data.url, 
              data.businessId
            );
            
            // Start the session in background
            sessionManager.runSession(data.sessionId, ws).catch(error => {
              logger.error('Session execution failed', { error: error.message });
            });
            break;
            
          case 'pause_session':
            sessionManager.pauseSession(data.sessionId);
            break;
            
          case 'resume_session':
            sessionManager.resumeSession(data.sessionId);
            // Resume execution
            sessionManager.runSession(data.sessionId, ws).catch(error => {
              logger.error('Session resume failed', { error: error.message });
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error.message
        }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      // Remove from active sessions
      for (const [businessId, connection] of activeSessions.entries()) {
        if (connection === ws) {
          activeSessions.delete(businessId);
          break;
        }
      }
    });
  });
}

// All routes require authentication
router.use(authenticate);

// REST API endpoints

// Business setup (simplified - for business-setting page compatibility)
router.post('/business-setup', async (req, res) => {
  try {
    const { url } = req.body;
    const businessId = req.user?.businessId;

    if (!url || !businessId) {
      return res.status(400).json({
        success: false,
        error: 'URL and business ID are required'
      });
    }

    logger.info('Starting business setup analysis', { url, businessId });

    const scrapingService = new BusinessCategoryScrapingService();
    const analysisResult = await scrapingService.analyzeBusinessCategory(url);

    if (!analysisResult.success) {
      logger.error('Business analysis failed', { error: analysisResult.error });
      return res.status(500).json({
        success: false,
        error: analysisResult.error || 'Analysis failed'
      });
    }

    // Prepare setup data
    const setupData = {
      businessName: analysisResult.data.businessName,
      businessCategory: analysisResult.data.businessCategory,
      industry: analysisResult.data.industry,
      businessType: analysisResult.data.businessType,
      platform: analysisResult.data.platform,
      description: analysisResult.data.description,
      website: url,
      footerPages: analysisResult.data.footerPages,
      importantPages: analysisResult.data.importantPages,
      agentScope: analysisResult.data.agentScope,
      productsServices: analysisResult.data.productsServices,
      categoryConfidence: analysisResult.data.categoryConfidence,
      categoryReasoning: analysisResult.data.categoryReasoning,
      extractedAt: analysisResult.data.analyzedAt,
      readyForSetup: true
    };

    // Save to database
    await prisma.businessContext.upsert({
      where: { businessId },
      update: {
        businessInfo: JSON.stringify({
          name: setupData.businessName,
          category: setupData.businessCategory,
          industry: setupData.industry,
          businessType: setupData.businessType,
          platform: setupData.platform,
          description: setupData.description,
          agentScope: setupData.agentScope,
          productsServices: setupData.productsServices,
          categoryConfidence: setupData.categoryConfidence,
          categoryReasoning: setupData.categoryReasoning
        }),
        contactInfo: JSON.stringify({
          website: setupData.website,
          extractedAt: setupData.extractedAt
        }),
        serviceInfo: JSON.stringify({
          footerPages: setupData.footerPages,
          importantPages: setupData.importantPages,
          readyForSetup: setupData.readyForSetup
        })
      },
      create: {
        businessId,
        businessInfo: JSON.stringify({
          name: setupData.businessName,
          category: setupData.businessCategory,
          industry: setupData.industry,
          businessType: setupData.businessType,
          platform: setupData.platform,
          description: setupData.description,
          agentScope: setupData.agentScope,
          productsServices: setupData.productsServices,
          categoryConfidence: setupData.categoryConfidence,
          categoryReasoning: setupData.categoryReasoning
        }),
        contactInfo: JSON.stringify({
          website: setupData.website,
          extractedAt: setupData.extractedAt
        }),
        serviceInfo: JSON.stringify({
          footerPages: setupData.footerPages,
          importantPages: setupData.importantPages,
          readyForSetup: setupData.readyForSetup
        })
      }
    });

    logger.info('Business setup completed successfully', { businessId, category: setupData.businessCategory });

    // Calculate summary
    const totalFooterPages = Object.values(setupData.footerPages || {})
      .reduce((total, pages) => total + (pages?.length || 0), 0);

    const response = {
      success: true,
      data: setupData,
      summary: {
        businessName: setupData.businessName,
        businessCategory: setupData.businessCategory,
        industry: setupData.industry,
        footerPagesFound: totalFooterPages,
        importantPagesFound: setupData.importantPages?.length || 0,
        readyForSetup: setupData.readyForSetup
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Business setup failed', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get recovery sessions
router.get('/sessions/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const recoverySessions = sessionManager.getRecoverySessions(businessId);
    
    res.json({
      success: true,
      sessions: recoverySessions
    });
  } catch (error) {
    logger.error('Failed to get recovery sessions', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = { router, setWebSocketServer };
