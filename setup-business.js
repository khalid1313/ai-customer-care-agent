const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function createSampleBusiness() {
    console.log('🏢 Creating sample business...');
    
    try {
        // Generate API key
        const apiKey = `sk_${uuidv4().replace(/-/g, '')}`;
        
        // Create sample business
        const business = await prisma.business.create({
            data: {
                name: 'Demo Business',
                email: 'admin@example.com',
                phone: '+1-555-0123',
                website: 'https://acme-electronics.com',
                industry: 'Electronics Retail',
                description: 'Leading electronics retailer specializing in consumer electronics and accessories',
                timezone: 'America/New_York',
                settings: JSON.stringify({
                    apiKey: apiKey,
                    allowRegistration: false,
                    requireEmailVerification: false,
                    defaultTimezone: 'America/New_York',
                    businessHours: {
                        enabled: true,
                        timezone: 'America/New_York',
                        schedule: {
                            monday: { enabled: true, start: '09:00', end: '18:00' },
                            tuesday: { enabled: true, start: '09:00', end: '18:00' },
                            wednesday: { enabled: true, start: '09:00', end: '18:00' },
                            thursday: { enabled: true, start: '09:00', end: '18:00' },
                            friday: { enabled: true, start: '09:00', end: '18:00' },
                            saturday: { enabled: true, start: '10:00', end: '17:00' },
                            sunday: { enabled: false, start: '10:00', end: '16:00' }
                        }
                    },
                    notifications: {
                        email: true,
                        slack: false,
                        webhook: false
                    },
                    autoAssignment: true,
                    aiResponseApproval: false
                })
            }
        });

        console.log(`✅ Business created: ${business.name} (ID: ${business.id})`);
        console.log(`🔑 API Key: ${apiKey}`);
        
        return business;
    } catch (error) {
        console.error('❌ Error creating business:', error.message);
        throw error;
    }
}

async function createBusinessOwner(businessId) {
    console.log('👤 Creating business owner...');
    
    try {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        
        const owner = await prisma.user.create({
            data: {
                businessId: businessId,
                email: 'admin@example.com',
                password: hashedPassword,
                firstName: 'John',
                lastName: 'Admin',
                role: 'owner'
            }
        });

        console.log(`✅ Owner created: ${owner.firstName} ${owner.lastName} (${owner.email})`);
        console.log(`🔐 Login: admin@example.com / admin123`);
        
        return owner;
    } catch (error) {
        console.error('❌ Error creating owner:', error.message);
        throw error;
    }
}

async function createSampleAgent(businessId) {
    console.log('🤖 Creating AI agent...');
    
    try {
        const agent = await prisma.agent.create({
            data: {
                businessId: businessId,
                name: 'AI Customer Assistant',
                description: 'Intelligent customer service assistant for Acme Electronics',
                personality: 'Friendly, knowledgeable, and professional electronics expert who loves helping customers find the perfect products.',
                instructions: 'You are a customer service representative for Acme Electronics. Always be helpful, use tools to provide accurate information, and maintain a professional yet friendly tone. Focus on understanding customer needs and providing detailed product information.',
                model: 'gpt-3.5-turbo',
                temperature: 0.1,
                maxTokens: 1000,
                tools: JSON.stringify([
                    'ProductSearchTool',
                    'ProductAvailabilityTool',
                    'OrderTrackingTool',
                    'FAQTool',
                    'ShoppingCartTool',
                    'ProductRecommendationTool',
                    'PaymentTool',
                    'ShippingTool',
                    'ReturnTool',
                    'CustomerSupportTool'
                ]),
                knowledge: JSON.stringify({
                    companyInfo: {
                        name: 'Acme Electronics',
                        founded: '2018',
                        specialties: ['Consumer Electronics', 'Audio Equipment', 'Computer Accessories'],
                        values: ['Quality', 'Customer Service', 'Innovation']
                    },
                    policies: {
                        shipping: 'Free shipping on orders over $50',
                        returns: '30-day return policy',
                        warranty: 'Manufacturer warranty included'
                    }
                })
            }
        });

        console.log(`✅ Agent created: ${agent.name} (ID: ${agent.id})`);
        return agent;
    } catch (error) {
        console.error('❌ Error creating agent:', error.message);
        throw error;
    }
}

async function seedBusinessProducts(businessId) {
    console.log('📦 Seeding business products...');
    
    try {
        const products = [
            {
                name: 'Wireless Bluetooth Headphones',
                category: 'Audio',
                price: 89.99,
                description: 'High-quality wireless headphones with noise cancellation',
                features: 'Bluetooth 5.0,Noise Cancellation,30-hour battery',
                inStock: true,
                stockCount: 45,
                rating: 4.5
            },
            {
                name: 'Gaming Mouse RGB',
                category: 'Computer Accessories',
                price: 49.99,
                description: 'High-precision gaming mouse with RGB lighting',
                features: 'RGB Lighting,12000 DPI,Programmable buttons',
                inStock: true,
                stockCount: 23,
                rating: 4.2
            },
            {
                name: 'Smartwatch Pro',
                category: 'Wearables',
                price: 299.99,
                description: 'Advanced smartwatch with health monitoring',
                features: 'Heart Rate Monitor,GPS,Waterproof,7-day battery',
                inStock: true,
                stockCount: 15,
                rating: 4.7
            },
            {
                name: 'USB-C Fast Charger',
                category: 'Accessories',
                price: 24.99,
                description: 'Fast charging USB-C charger with multiple ports',
                features: 'Fast Charging,Multiple Ports,Compact Design',
                inStock: true,
                stockCount: 67,
                rating: 4.1
            },
            {
                name: '4K Webcam',
                category: 'Computer Accessories',
                price: 89.99,
                description: 'Ultra HD webcam for streaming and video calls',
                features: '4K Resolution,Auto Focus,Built-in Microphone',
                inStock: true,
                stockCount: 28,
                rating: 4.3
            }
        ];

        for (const product of products) {
            await prisma.product.create({
                data: {
                    businessId: businessId,
                    ...product
                }
            });
        }

        console.log(`✅ Seeded ${products.length} business products`);
    } catch (error) {
        console.error('❌ Error seeding products:', error.message);
        throw error;
    }
}

async function createSamplePlaygroundScenarios(businessId, userId) {
    console.log('🎮 Creating playground scenarios...');
    
    try {
        const scenarios = [
            {
                name: 'Product Discovery Flow',
                description: 'Test how the AI handles product search and recommendations',
                scenario: JSON.stringify({
                    category: 'E-commerce',
                    difficulty: 'beginner',
                    goals: ['Product search', 'Recommendations', 'Availability check']
                }),
                messages: JSON.stringify([
                    {
                        role: 'user',
                        content: 'I\'m looking for good headphones',
                        expectedTools: ['ProductSearchTool', 'ProductRecommendationTool'],
                        expectedResponse: 'Should show available headphones with details and ask about preferences'
                    },
                    {
                        role: 'user',
                        content: 'What do you recommend for under $100?',
                        expectedTools: ['ProductSearchTool', 'ProductRecommendationTool'],
                        expectedResponse: 'Should filter products by price and show suitable options'
                    }
                ])
            },
            {
                name: 'Order Support Scenario',
                description: 'Test order tracking and customer support capabilities',
                scenario: JSON.stringify({
                    category: 'Support',
                    difficulty: 'intermediate',
                    goals: ['Order tracking', 'Support escalation', 'Problem resolution']
                }),
                messages: JSON.stringify([
                    {
                        role: 'user',
                        content: 'I have a problem with my recent order',
                        expectedTools: ['CustomerSupportTool', 'OrderTrackingTool'],
                        expectedResponse: 'Should ask for order details and offer help'
                    },
                    {
                        role: 'user',
                        content: 'My order ORD-2024-001 hasn\'t arrived yet',
                        expectedTools: ['OrderTrackingTool'],
                        expectedResponse: 'Should track the order and provide status update'
                    }
                ])
            }
        ];

        for (const scenario of scenarios) {
            await prisma.playground.create({
                data: {
                    businessId: businessId,
                    userId: userId,
                    ...scenario
                }
            });
        }

        console.log(`✅ Created ${scenarios.length} playground scenarios`);
    } catch (error) {
        console.error('❌ Error creating scenarios:', error.message);
        throw error;
    }
}

async function createSampleTickets(businessId) {
    console.log('🎫 Creating sample tickets...');
    
    try {
        const tickets = [
            {
                customerId: 'CUST-001',
                customerName: 'Sarah Johnson',
                customerEmail: 'sarah@example.com',
                title: 'Headphones not working properly',
                description: 'The headphones I purchased last week have stopped working. The right ear is not producing any sound.',
                status: 'OPEN',
                priority: 'HIGH',
                category: 'product_issue'
            },
            {
                customerId: 'CUST-002',
                customerName: 'Mike Davis',
                customerEmail: 'mike@example.com',
                title: 'Request for bulk discount',
                description: 'I\'m interested in purchasing 50+ gaming mice for our office. Can you provide a bulk discount?',
                status: 'IN_PROGRESS',
                priority: 'NORMAL',
                category: 'sales_inquiry'
            }
        ];

        for (const ticket of tickets) {
            await prisma.ticket.create({
                data: {
                    businessId: businessId,
                    ...ticket
                }
            });
        }

        console.log(`✅ Created ${tickets.length} sample tickets`);
    } catch (error) {
        console.error('❌ Error creating tickets:', error.message);
        throw error;
    }
}

async function createSampleConversations(businessId, agentId) {
    console.log('💬 Creating sample conversations...');
    
    try {
        // Create conversation
        const conversation = await prisma.conversation.create({
            data: {
                businessId: businessId,
                agentId: agentId,
                customerId: 'CUST-001',
                customerName: 'Sarah Johnson',
                customerEmail: 'sarah@example.com',
                channel: 'WEB_CHAT',
                status: 'ACTIVE',
                priority: 'NORMAL',
                sentiment: 'positive',
                intent: 'product_inquiry',
                topic: 'headphones'
            }
        });

        // Add messages
        const messages = [
            {
                content: 'Hi, I\'m looking for wireless headphones',
                sender: 'CUSTOMER',
                senderName: 'Sarah Johnson'
            },
            {
                content: 'Hello! I\'d be happy to help you find the perfect wireless headphones. We have several great options available. Are you looking for any specific features like noise cancellation, long battery life, or a particular price range?',
                sender: 'AI_AGENT',
                senderName: 'AI Assistant',
                toolsUsed: 'ProductSearchTool,ProductRecommendationTool'
            },
            {
                content: 'I need something with good noise cancellation for work',
                sender: 'CUSTOMER',
                senderName: 'Sarah Johnson'
            }
        ];

        for (const message of messages) {
            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    channel: 'WEB_CHAT',
                    messageType: 'TEXT',
                    ...message
                }
            });
        }

        // Update conversation with last message time
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() }
        });

        console.log(`✅ Created sample conversation with ${messages.length} messages`);
    } catch (error) {
        console.error('❌ Error creating conversations:', error.message);
        throw error;
    }
}

async function main() {
    console.log('🚀 Setting up Business Platform...\n');
    
    try {
        // Connect to database
        await prisma.$connect();
        console.log('✅ Database connected\n');
        
        // Create sample business
        const business = await createSampleBusiness();
        
        // Create business owner
        const owner = await createBusinessOwner(business.id);
        
        // Create AI agent
        const agent = await createSampleAgent(business.id);
        
        // Seed business-specific data
        await seedBusinessProducts(business.id);
        await createSamplePlaygroundScenarios(business.id, owner.id);
        await createSampleTickets(business.id);
        await createSampleConversations(business.id, agent.id);
        
        console.log('\n🎉 Business Platform setup completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   Business: ${business.name}`);
        console.log(`   Business ID: ${business.id}`);
        console.log(`   Owner Email: admin@acme-electronics.com`);
        console.log(`   Password: admin123`);
        console.log(`   API Key: Available in business settings`);
        
        console.log('\n🔗 Available Endpoints:');
        console.log('   Authentication: POST /api/auth/login');
        console.log('   Dashboard: GET /api/business/dashboard');
        console.log('   Agents: GET /api/agents');
        console.log('   Playground: GET /api/playground');
        console.log('   Integrations: GET /api/integrations');
        console.log('   Inbox: GET /api/inbox');
        
        console.log('\n🧪 Test the platform:');
        console.log('1. Login: curl -X POST http://localhost:3002/api/auth/login -H "Content-Type: application/json" -d \'{"email":"admin@acme-electronics.com","password":"admin123"}\'');
        console.log('2. Get dashboard: curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3002/api/business/dashboard');
        console.log('3. Test agent: curl -H "Authorization: Bearer YOUR_JWT_TOKEN" -X POST http://localhost:3002/api/agents/AGENT_ID/test -H "Content-Type: application/json" -d \'{"message":"I need headphones"}\'');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run setup if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };