const { DynamicTool } = require('@langchain/core/tools');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class CreateTicketTool {
    constructor(businessId, options = {}) {
        this.businessId = businessId;
        this.conversationContext = null;
        this.initializeTool();
    }
    
    setConversationContext(context) {
        this.conversationContext = context;
    }

    initializeTool() {
        this.tool = new DynamicTool({
            name: 'create_ticket',
            description: `Create support ticket for issues requiring backend team attention. Use this tool when customers need:
                         - Refunds or returns
                         - Technical support for defective products
                         - Shipping/delivery problems  
                         - Billing or payment issues
                         - Complex inquiries beyond chat support
                         - Manager escalation requests
                         
                         Input should be JSON with: priority, category, title, description, customerImpact, suggestedAction`,
            func: async (input) => {
                try {
                    logger.info('Creating support ticket:', { 
                        businessId: this.businessId,
                        input: input.substring(0, 200) + '...'
                    });

                    // Parse input
                    let ticketData;
                    try {
                        ticketData = JSON.parse(input);
                    } catch (parseError) {
                        return this.formatErrorResponse('Invalid input format. Please provide valid JSON.');
                    }

                    // Validate required fields
                    const requiredFields = ['priority', 'category', 'title', 'description'];
                    for (const field of requiredFields) {
                        if (!ticketData[field]) {
                            return this.formatErrorResponse(`Missing required field: ${field}`);
                        }
                    }

                    // Validate priority
                    const validPriorities = ['urgent', 'high', 'normal', 'low'];
                    if (!validPriorities.includes(ticketData.priority)) {
                        return this.formatErrorResponse('Priority must be: urgent, high, normal, or low');
                    }

                    // Validate category
                    const validCategories = ['refund', 'return', 'technical', 'shipping', 'billing', 'product_issue', 'general'];
                    if (!validCategories.includes(ticketData.category)) {
                        return this.formatErrorResponse('Invalid category. Must be: refund, return, technical, shipping, billing, product_issue, or general');
                    }

                    // Calculate SLA deadline based on category and priority
                    const slaHours = this.calculateSLA(ticketData.category, ticketData.priority);
                    const slaDeadline = new Date(Date.now() + (slaHours * 60 * 60 * 1000));

                    // Generate ticket ID
                    const ticketNumber = await this.generateTicketNumber();

                    // Use conversation context if available
                    const conversationId = this.conversationContext?.conversationId || ticketData.conversationId || null;
                    const customerId = this.conversationContext?.customerId || ticketData.customerId || 'unknown';
                    const customerName = this.conversationContext?.customerName || ticketData.customerName || 'Unknown Customer';
                    const customerEmail = this.conversationContext?.customerEmail || ticketData.customerEmail || null;

                    // Create ticket in database
                    const ticket = await prisma.ticket.create({
                        data: {
                            businessId: this.businessId,
                            customerId: customerId,
                            customerName: customerName,
                            customerEmail: customerEmail,
                            title: ticketData.title,
                            description: ticketData.description,
                            status: 'OPEN',
                            priority: ticketData.priority.toUpperCase(),
                            category: ticketData.category,
                            assignedTo: null, // Will be assigned by routing logic
                            tags: ticketData.category,
                            metadata: JSON.stringify({
                                customerImpact: ticketData.customerImpact || '',
                                suggestedAction: ticketData.suggestedAction || '',
                                slaHours: slaHours,
                                source: 'ai_chat',
                                conversationContext: this.conversationContext
                            }),
                            ticketNumber: ticketNumber,
                            slaDeadline: slaDeadline,
                            parentConversationId: conversationId,
                            source: 'ai_chat',
                            customerNotified: true // Customer will be notified via chat
                        }
                    });

                    // Log ticket creation
                    logger.info('Support ticket created successfully:', {
                        ticketId: ticket.id,
                        ticketNumber: ticketNumber,
                        category: ticketData.category,
                        priority: ticketData.priority,
                        slaDeadline: slaDeadline
                    });

                    // Return success response with ticket info
                    return this.formatSuccessResponse(ticket, slaHours);

                } catch (error) {
                    logger.error('Error creating support ticket:', error);
                    return this.formatErrorResponse('Failed to create support ticket. Please try again.');
                }
            }
        });
    }

    calculateSLA(category, priority) {
        // SLA matrix based on category and priority
        const slaMatrix = {
            'refund': { 'urgent': 2, 'high': 4, 'normal': 24, 'low': 48 },
            'return': { 'urgent': 4, 'high': 8, 'normal': 48, 'low': 72 },
            'technical': { 'urgent': 2, 'high': 8, 'normal': 72, 'low': 96 },
            'shipping': { 'urgent': 2, 'high': 4, 'normal': 24, 'low': 48 },
            'billing': { 'urgent': 1, 'high': 4, 'normal': 24, 'low': 48 },
            'product_issue': { 'urgent': 4, 'high': 8, 'normal': 48, 'low': 72 },
            'general': { 'urgent': 4, 'high': 8, 'normal': 48, 'low': 96 }
        };

        return slaMatrix[category]?.[priority] || 48; // Default 48 hours
    }

    async generateTicketNumber() {
        // Generate format: TK-YYYYMMDD-###
        const today = new Date();
        const dateStr = today.getFullYear().toString() + 
                       (today.getMonth() + 1).toString().padStart(2, '0') + 
                       today.getDate().toString().padStart(2, '0');
        
        // Count tickets created today
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        
        const todayTicketsCount = await prisma.ticket.count({
            where: {
                businessId: this.businessId,
                createdAt: {
                    gte: startOfDay,
                    lt: endOfDay
                }
            }
        });

        const sequenceNumber = (todayTicketsCount + 1).toString().padStart(3, '0');
        return `TK-${dateStr}-${sequenceNumber}`;
    }

    formatSuccessResponse(ticket, slaHours) {
        const responseTime = slaHours <= 4 ? `${slaHours} hours` : `${Math.round(slaHours / 24)} business days`;
        
        return `✅ **Support Ticket Created**

**Ticket ID:** ${ticket.ticketNumber}
**Priority:** ${ticket.priority}
**Category:** ${ticket.category}
**Expected Response:** Within ${responseTime}

I've created a support ticket for your ${ticket.category} request. Our specialized team will review your case and respond within ${responseTime}.

You can reference this ticket using ID: **${ticket.ticketNumber}**

If you have additional information about this issue, please share it and I'll add it to your ticket.`;
    }

    formatErrorResponse(message) {
        return `❌ **Ticket Creation Failed**

${message}

Please try again or contact our support team directly for immediate assistance.`;
    }

    // Add missing fields to existing ticket table
    async addTicketFields() {
        try {
            // This would be handled by Prisma migrations in production
            logger.info('Ticket table fields should be added via Prisma migration');
        } catch (error) {
            logger.error('Error adding ticket fields:', error);
        }
    }

    // Tool interface for LangChain
    getTool() {
        return this.tool;
    }

    // Health check
    async healthCheck() {
        try {
            const testQuery = await prisma.ticket.findMany({ take: 1 });
            return {
                status: 'healthy',
                component: 'CreateTicketTool',
                businessId: this.businessId
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                businessId: this.businessId
            };
        }
    }
}

module.exports = CreateTicketTool;