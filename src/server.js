const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const logger = require('./utils/logger');
const WebSocket = require('ws');
const http = require('http');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/business');
const agentsRoutes = require('./routes/agents');
const playgroundRoutes = require('./routes/playground');
const integrationsRoutes = require('./routes/integrations');
const channelIntegrationsRoutes = require('./routes/channel-integrations');
const chatRoutes = require('./routes/chat');
const agentChatRoutes = require('./routes/agent-chat');
const sessionRoutes = require('./routes/sessions');
const adminRoutes = require('./routes/admin');
const agentCredentialsRoutes = require('./routes/agent-credentials');
const assignmentSettingsRoutes = require('./routes/assignment-settings');
const inboxRoutes = require('./routes/inbox');
const productSyncRoutes = require('./routes/product-sync');
const settingsRoutes = require('./routes/settings');
const aiChatRoutes = require('./routes/ai-chat');
const knowledgeBaseRoutes = require('./routes/knowledge-base');
const { router: scrapingRoutes, setWebSocketServer } = require('./routes/scraping');
const webhookRoutes = require('./routes/webhook');
const webhooksRoutes = require('./routes/webhooks');
const ticketsRoutes = require('./routes/tickets');
const messagesRoutes = require('./routes/messages');

// Initialize Express app
const app = express();
const prisma = new PrismaClient();

// Trust proxy for ngrok
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow localhost on any port for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Allow specific production origins
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'http://localhost:3003',
            'http://localhost:3004',
            'http://localhost:5180'
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Rate limiting - More generous for development
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000 for development
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        logger.error('Health check failed', error);
        res.status(503).json({
            status: 'unhealthy',
            error: 'Database connection failed'
        });
    }
});

// Store agents per session for the playground
const playgroundAgents = new Map();

async function getOrCreatePlaygroundAgent(sessionId) {
    if (playgroundAgents.has(sessionId)) {
        const agent = playgroundAgents.get(sessionId);
        agent.lastUsed = Date.now();
        return agent;
    }

    // Create session in database first
    try {
        await prisma.session.upsert({
            where: { id: sessionId },
            update: { 
                lastActivity: new Date(),
                isActive: true
            },
            create: {
                id: sessionId,
                customerId: 'playground-user',
                customerName: 'Playground Test',
                context: JSON.stringify({
                    current_topic: null,
                    previous_topic: null,
                    mentioned_products: [],
                    mentioned_orders: [],
                    cart_items: [],
                    conversation_history: [],
                    customer_info: {},
                    preferences: {},
                    context_switches: 0,
                    ambiguous_queries: [],
                    conversation_flow: [],
                    session_start: new Date().toISOString(),
                    last_activity: new Date().toISOString()
                }),
                isActive: true
            }
        });
        logger.info('Session created/updated in database', { sessionId });
    } catch (error) {
        logger.error('Failed to create session in database', { sessionId, error });
    }

    // Initialize AI agent with session
    const CoreAIAgent = require('./agents/CoreAIAgent');

    const aiAgent = new CoreAIAgent('cmbsfx1qt0001tvvj7hoemk12');
    await aiAgent.initialize();
    
    playgroundAgents.set(sessionId, {
        agent: aiAgent,
        lastUsed: Date.now()
    });

    return playgroundAgents.get(sessionId);
}

// Clean up old playground agents
setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, agentData] of playgroundAgents.entries()) {
        if (now - agentData.lastUsed > maxAge) {
            playgroundAgents.delete(sessionId);
            logger.info('Cleaned up old playground agent', { sessionId });
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

// Note: AI Chat endpoint is now handled by routes/ai-chat.js for proper message persistence

// Store logs in memory (for debugging - in production use proper logging service)
const sessionLogs = new Map(); // sessionId -> logs array

// Helper to capture logs for a session
function captureLogForSession(sessionId, logEntry) {
    if (!sessionLogs.has(sessionId)) {
        sessionLogs.set(sessionId, []);
    }
    const logs = sessionLogs.get(sessionId);
    logs.push(`${new Date().toISOString()} ${logEntry}`);
    // Keep only last 100 logs per session
    if (logs.length > 100) {
        logs.shift();
    }
}

// Logs endpoint
app.get('/api/logs/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const logs = sessionLogs.get(sessionId) || [];
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/integrations', channelIntegrationsRoutes); // Use channel integrations for the main integrations endpoint
app.use('/api/integrations/legacy', integrationsRoutes); // Keep legacy integrations under /legacy
app.use('/api/chat', chatRoutes);
app.use('/api/agent-chat', agentChatRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent-credentials', agentCredentialsRoutes);
app.use('/api/settings/assignment', assignmentSettingsRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/product-sync', productSyncRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/webhook', webhookRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/messages', messagesRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'AI Customer Care Agent API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            business: '/api/business',
            agents: '/api/agents',
            playground: '/api/playground',
            integrations: '/api/integrations',
            chat: '/api/chat',
            sessions: '/api/sessions',
            admin: '/api/admin',
            inbox: '/api/inbox',
            tickets: '/api/tickets'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong' 
            : err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await prisma.$disconnect();
    process.exit(0);
});

// Auto port selection function
function findAvailablePort(startPort = 3001) {
    return new Promise((resolve, reject) => {
        const net = require('net');
        const server = net.createServer();
        
        server.listen(startPort, (err) => {
            if (err) {
                // Port is busy, try next one
                server.close();
                resolve(findAvailablePort(startPort + 1));
            } else {
                // Port is available
                const port = server.address().port;
                server.close();
                resolve(port);
            }
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Port is busy, try next one
                resolve(findAvailablePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

// Start server with auto port selection
let server;
findAvailablePort(3001).then(PORT => {
    // Create HTTP server
    const httpServer = http.createServer(app);
    
    // Create WebSocket server
    const wss = new WebSocket.Server({ 
        server: httpServer,
        path: '/ws/scraping'
    });
    
    // Set up WebSocket handlers for scraping
    setWebSocketServer(wss);
    
    server = httpServer.listen(PORT, () => {
        logger.info(`AI Customer Care Agent server started on port ${PORT}`, {
            environment: process.env.NODE_ENV || 'development',
            port: PORT,
            websocket: 'enabled at /ws/scraping'
        });
        
        // Write port to file for frontend to read (skip in Docker)
        if (process.env.NODE_ENV !== 'production') {
            const fs = require('fs');
            try {
                fs.writeFileSync('backend-port.txt', PORT.toString());
                fs.writeFileSync('frontend/public/backend-port.txt', PORT.toString());
            } catch (err) {
                logger.warn('Could not write backend-port.txt (normal in Docker):', err.message);
            }
        }
    });
}).catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app };