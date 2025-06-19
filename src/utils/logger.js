const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

// Add colors to winston
winston.addColors(colors);

// Define format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}` +
        (info.stack ? `\n${info.stack}` : '') +
        (info.error ? `\n${JSON.stringify(info.error, null, 2)}` : '') +
        (Object.keys(info).length > 3 ? `\n${JSON.stringify(
            Object.fromEntries(
                Object.entries(info).filter(([key]) => 
                    !['timestamp', 'level', 'message', 'stack', 'error'].includes(key)
                )
            ), null, 2
        )}` : '')
    )
);

// Define format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create transports array
const transports = [
    // Console transport
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format: consoleFormat
    })
];

// Add file transports in production or if LOG_TO_FILE is enabled
if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    const logDir = process.env.LOG_DIR || 'logs';
    
    // Ensure log directory exists
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
        // Error log file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        
        // Combined log file
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: fileFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 10
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format: winston.format.timestamp(),
    transports,
    exitOnError: false
});

// Create stream for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

// Helper methods for structured logging
logger.logAPICall = (method, url, statusCode, responseTime, additionalData = {}) => {
    logger.info('API Call', {
        method,
        url,
        statusCode,
        responseTime: `${responseTime}ms`,
        ...additionalData
    });
};

logger.logAIInteraction = (customerId, sessionId, message, response, toolsUsed, processingTime) => {
    logger.info('AI Interaction', {
        customerId,
        sessionId,
        messageLength: message.length,
        responseLength: response.length,
        toolsUsed,
        processingTime: `${processingTime}ms`
    });
};

logger.logError = (error, context = {}) => {
    logger.error(error.message, {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        ...context
    });
};

logger.logPerformance = (operation, duration, additionalData = {}) => {
    logger.info('Performance', {
        operation,
        duration: `${duration}ms`,
        ...additionalData
    });
};

logger.logSecurity = (event, details = {}) => {
    logger.warn('Security Event', {
        event,
        ...details,
        timestamp: new Date().toISOString()
    });
};

// Add request ID tracking for better debugging
logger.addRequestId = (req, res, next) => {
    req.requestId = require('uuid').v4();
    logger.defaultMeta = { requestId: req.requestId };
    next();
};

module.exports = logger;