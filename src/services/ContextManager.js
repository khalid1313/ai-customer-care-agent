const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class ContextManager {
    constructor() {
        this.prisma = new PrismaClient();
        this.sessions = new Map();
    }

    /**
     * Create a new session
     * @param {string} customerId - Customer ID
     * @param {string} customerName - Customer name
     * @returns {Promise<string>} Session ID
     */
    async createSession(customerId, customerName) {
        try {
            const session = await this.prisma.session.create({
                data: {
                    customerId,
                    customerName: customerName || 'Guest',
                    isActive: true,
                    lastActivity: new Date(),
                    context: {
                        customer_info: {
                            id: customerId,
                            name: customerName
                        },
                        session_start: new Date().toISOString(),
                        current_topic: null,
                        previous_topic: null,
                        mentioned_products: [],
                        conversation_flow: [],
                        context_switches: 0
                    }
                }
            });

            // Store in memory cache
            this.sessions.set(session.id, {
                id: session.id,
                customerId,
                context: session.context,
                lastActivity: new Date()
            });

            logger.info('Session created', { sessionId: session.id, customerId });
            return session.id;
        } catch (error) {
            logger.error('Error creating session', error);
            throw error;
        }
    }

    /**
     * Get session context
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Session context
     */
    async getContext(sessionId) {
        try {
            // Check memory cache first
            if (this.sessions.has(sessionId)) {
                return this.sessions.get(sessionId).context;
            }

            // Fallback to database
            const session = await this.prisma.session.findUnique({
                where: { id: sessionId }
            });

            if (!session) {
                logger.warn('Session not found', { sessionId });
                return {};
            }

            // Update cache
            this.sessions.set(sessionId, {
                id: session.id,
                customerId: session.customerId,
                context: session.context,
                lastActivity: session.lastActivity
            });

            return session.context || {};
        } catch (error) {
            logger.error('Error getting context', { sessionId, error });
            return {};
        }
    }

    /**
     * Update session context
     * @param {string} sessionId - Session ID
     * @param {Object} context - New context data
     * @returns {Promise<void>}
     */
    async updateContext(sessionId, context) {
        try {
            // Update database
            await this.prisma.session.update({
                where: { id: sessionId },
                data: {
                    context,
                    lastActivity: new Date()
                }
            });

            // Update cache
            if (this.sessions.has(sessionId)) {
                const session = this.sessions.get(sessionId);
                session.context = context;
                session.lastActivity = new Date();
            }

            logger.debug('Context updated', { sessionId });
        } catch (error) {
            logger.error('Error updating context', { sessionId, error });
            throw error;
        }
    }

    /**
     * Save session (close session)
     * @param {string} sessionId - Session ID
     * @param {Object} finalData - Final session data
     * @returns {Promise<void>}
     */
    async saveSession(sessionId, finalData = {}) {
        try {
            const context = await this.getContext(sessionId);
            const updatedContext = {
                ...context,
                ...finalData,
                session_end: new Date().toISOString()
            };

            // Generate summary
            const summary = this.generateSessionSummary(updatedContext);

            // Update database
            await this.prisma.session.update({
                where: { id: sessionId },
                data: {
                    isActive: false,
                    context: updatedContext,
                    summary,
                    lastActivity: new Date()
                }
            });

            // Remove from cache
            this.sessions.delete(sessionId);

            logger.info('Session saved and closed', { sessionId });
        } catch (error) {
            logger.error('Error saving session', { sessionId, error });
            throw error;
        }
    }

    /**
     * Get session summary/analytics
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Session summary
     */
    async getSummary(sessionId) {
        try {
            const session = await this.prisma.session.findUnique({
                where: { id: sessionId }
            });

            if (!session) {
                return null;
            }

            const context = session.context || {};
            const duration = this.calculateSessionDuration(
                context.session_start,
                context.session_end || new Date().toISOString()
            );

            return {
                sessionId: session.id,
                customerId: session.customerId,
                customerName: session.customerName,
                isActive: session.isActive,
                duration,
                topicsDiscussed: this.extractTopics(context),
                productsViewed: context.mentioned_products || [],
                contextSwitches: context.context_switches || 0,
                conversationFlow: context.conversation_flow || [],
                summary: session.summary || this.generateSessionSummary(context)
            };
        } catch (error) {
            logger.error('Error getting summary', { sessionId, error });
            return null;
        }
    }

    /**
     * Generate session summary from context
     * @param {Object} context - Session context
     * @returns {string} Summary text
     */
    generateSessionSummary(context) {
        const topics = this.extractTopics(context);
        const products = context.mentioned_products || [];
        const switches = context.context_switches || 0;

        let summary = 'Customer session';
        
        if (topics.length > 0) {
            summary += ` discussed: ${topics.join(', ')}`;
        }
        
        if (products.length > 0) {
            summary += `. Viewed ${products.length} product(s)`;
        }
        
        if (switches > 0) {
            summary += `. Changed topics ${switches} time(s)`;
        }

        return summary;
    }

    /**
     * Extract topics from context
     * @param {Object} context - Session context
     * @returns {Array} List of topics
     */
    extractTopics(context) {
        const topics = [];
        
        if (context.current_topic) {
            topics.push(context.current_topic);
        }
        
        if (context.previous_topic && context.previous_topic !== context.current_topic) {
            topics.push(context.previous_topic);
        }
        
        // Extract from conversation flow
        if (context.conversation_flow && Array.isArray(context.conversation_flow)) {
            context.conversation_flow.forEach(flow => {
                if (flow.topic && !topics.includes(flow.topic)) {
                    topics.push(flow.topic);
                }
            });
        }

        return topics;
    }

    /**
     * Calculate session duration
     * @param {string} start - Start time
     * @param {string} end - End time
     * @returns {Object} Duration object
     */
    calculateSessionDuration(start, end) {
        if (!start) return { minutes: 0, seconds: 0, formatted: '0m 0s' };

        const startTime = new Date(start);
        const endTime = new Date(end);
        const durationMs = endTime - startTime;
        
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);

        return {
            minutes,
            seconds,
            formatted: `${minutes}m ${seconds}s`
        };
    }

    /**
     * Clean up inactive sessions from memory
     * @param {number} maxAge - Maximum age in milliseconds
     */
    cleanupInactiveSessions(maxAge = 3600000) { // 1 hour default
        const now = new Date();
        const toDelete = [];

        this.sessions.forEach((session, sessionId) => {
            const age = now - session.lastActivity;
            if (age > maxAge) {
                toDelete.push(sessionId);
            }
        });

        toDelete.forEach(sessionId => {
            this.sessions.delete(sessionId);
            logger.debug('Removed inactive session from cache', { sessionId });
        });
    }
}

module.exports = ContextManager;