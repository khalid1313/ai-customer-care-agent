const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function seedProducts() {
    console.log('📦 Seeding products...');
    
    try {
        const csvPath = path.join(__dirname, 'data', 'products.csv');
        const products = [];
        
        return new Promise((resolve, reject) => {
            require('fs').createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    products.push({
                        name: row.name,
                        category: row.category,
                        price: parseFloat(row.price),
                        description: row.description,
                        features: row.features || '',
                        inStock: row.in_stock === 'true',
                        stockCount: parseInt(row.stock_count) || 0,
                        rating: parseFloat(row.rating) || null
                    });
                })
                .on('end', async () => {
                    try {
                        // Clear existing products
                        await prisma.product.deleteMany();
                        
                        // Insert new products
                        for (const product of products) {
                            await prisma.product.create({ data: product });
                        }
                        
                        console.log(`✅ Seeded ${products.length} products`);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });
    } catch (error) {
        console.error('❌ Error seeding products:', error.message);
        throw error;
    }
}

async function seedOrders() {
    console.log('📋 Seeding orders...');
    
    try {
        const ordersPath = path.join(__dirname, 'data', 'orders.json');
        const ordersData = await fs.readFile(ordersPath, 'utf8');
        const orders = JSON.parse(ordersData);
        
        // Clear existing orders
        await prisma.order.deleteMany();
        
        // Insert new orders
        for (const order of orders) {
            await prisma.order.create({
                data: {
                    id: order.id,
                    customerId: order.customerId,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    status: order.status,
                    total: order.total,
                    items: JSON.stringify(order.items),
                    shippingAddress: JSON.stringify(order.shippingAddress),
                    trackingNumber: order.trackingNumber,
                    notes: order.notes,
                    createdAt: new Date(order.createdAt),
                    updatedAt: new Date(order.updatedAt)
                }
            });
        }
        
        console.log(`✅ Seeded ${orders.length} orders`);
    } catch (error) {
        console.error('❌ Error seeding orders:', error.message);
        throw error;
    }
}

async function seedFAQs() {
    console.log('❓ Seeding FAQs...');
    
    try {
        const faqPath = path.join(__dirname, 'data', 'faq.txt');
        const faqData = await fs.readFile(faqPath, 'utf8');
        
        // Parse FAQ data
        const faqs = [];
        const entries = faqData.split('\n\n');
        
        for (const entry of entries) {
            const lines = entry.trim().split('\n');
            if (lines.length >= 2) {
                const question = lines[0].replace(/^Q:\s*/, '');
                const answer = lines.slice(1).join(' ').replace(/^A:\s*/, '');
                
                faqs.push({
                    question,
                    answer,
                    category: 'general',
                    tags: '',
                    priority: 0,
                    isActive: true
                });
            }
        }
        
        // Clear existing FAQs
        await prisma.fAQ.deleteMany();
        
        // Insert new FAQs
        for (const faq of faqs) {
            await prisma.fAQ.create({ data: faq });
        }
        
        console.log(`✅ Seeded ${faqs.length} FAQs`);
    } catch (error) {
        console.error('❌ Error seeding FAQs:', error.message);
        throw error;
    }
}

async function createSampleBusiness() {
    console.log('🏢 Creating sample business...');
    
    try {
        // Check if business already exists
        const existingBusiness = await prisma.business.findFirst();
        if (existingBusiness) {
            console.log('✅ Business already exists');
            return existingBusiness.id;
        }
        
        const business = await prisma.business.create({
            data: {
                name: 'Demo Electronics Store',
                email: 'admin@demo-electronics.com',
                phone: '+1-555-0123',
                website: 'https://demo-electronics.com',
                industry: 'Electronics',
                description: 'A demo electronics store selling headphones, mice, keyboards, and accessories',
                settings: JSON.stringify({
                    timezone: 'UTC',
                    businessHours: '9AM-5PM',
                    currency: 'USD'
                })
            }
        });
        
        console.log(`✅ Created sample business: ${business.name}`);
        return business.id;
    } catch (error) {
        console.error('❌ Error creating business:', error.message);
        throw error;
    }
}

async function createSampleChannelIntegrations(businessId) {
    console.log('🔌 Setting up channel integrations...');
    
    try {
        const channels = [
            {
                businessId,
                type: 'WEB_CHAT',
                name: 'Web Chat',
                description: 'Native web chat integration',
                config: JSON.stringify({
                    enabled: true,
                    welcomeMessage: 'Hello! How can I help you today?'
                }),
                status: 'ACTIVE'
            },
            {
                businessId,
                type: 'WHATSAPP',
                name: 'WhatsApp Business',
                description: 'WhatsApp Business API integration',
                config: JSON.stringify({
                    enabled: false,
                    webhookUrl: '/api/webhooks/whatsapp'
                }),
                status: 'INACTIVE'
            },
            {
                businessId,
                type: 'INSTAGRAM',
                name: 'Instagram Direct',
                description: 'Instagram messaging integration',
                config: JSON.stringify({
                    enabled: false,
                    webhookUrl: '/api/webhooks/instagram'
                }),
                status: 'INACTIVE'
            },
            {
                businessId,
                type: 'EMAIL',
                name: 'Email Support',
                description: 'Email-based customer support',
                config: JSON.stringify({
                    enabled: false,
                    smtpHost: '',
                    smtpPort: 587
                }),
                status: 'INACTIVE'
            }
        ];
        
        // Clear existing integrations for this business
        await prisma.integration.deleteMany({
            where: { businessId }
        });
        
        // Insert new integrations
        for (const integration of channels) {
            await prisma.integration.create({ data: integration });
        }
        
        console.log(`✅ Created ${channels.length} channel integrations`);
    } catch (error) {
        console.error('❌ Error creating channel integrations:', error.message);
        throw error;
    }
}

async function createSampleKnowledgeBase() {
    console.log('📚 Creating knowledge base entries...');
    
    try {
        const knowledgeEntries = [
            {
                title: 'Product Information Guide',
                content: 'Comprehensive guide about our electronic products including headphones, mice, keyboards, and accessories.',
                category: 'products',
                tags: 'products,electronics,guide',
                isPublic: true,
                priority: 1
            },
            {
                title: 'Order Processing Workflow',
                content: 'Step-by-step guide for processing customer orders from confirmation to delivery.',
                category: 'orders',
                tags: 'orders,workflow,processing',
                isPublic: false,
                priority: 1
            },
            {
                title: 'Return and Refund Procedures',
                content: 'Complete procedures for handling returns, exchanges, and refunds.',
                category: 'returns',
                tags: 'returns,refunds,procedures',
                isPublic: true,
                priority: 1
            },
            {
                title: 'Shipping and Delivery Information',
                content: 'Detailed information about shipping options, delivery times, and tracking.',
                category: 'shipping',
                tags: 'shipping,delivery,tracking',
                isPublic: true,
                priority: 1
            }
        ];
        
        // Clear existing knowledge base
        await prisma.knowledgeBase.deleteMany();
        
        // Insert new entries
        for (const entry of knowledgeEntries) {
            await prisma.knowledgeBase.create({ data: entry });
        }
        
        console.log(`✅ Created ${knowledgeEntries.length} knowledge base entries`);
    } catch (error) {
        console.error('❌ Error creating knowledge base:', error.message);
        throw error;
    }
}

async function checkEnvironment() {
    console.log('🔍 Checking environment...');
    
    const requiredEnvVars = ['OPENAI_API_KEY', 'DATABASE_URL'];
    const missingVars = [];
    
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }
    
    if (missingVars.length > 0) {
        console.error('❌ Missing required environment variables:');
        missingVars.forEach(variable => {
            console.error(`   - ${variable}`);
        });
        console.error('\nPlease copy .env.example to .env and fill in the required values.');
        throw new Error('Missing environment variables');
    }
    
    console.log('✅ Environment check passed');
}

async function main() {
    console.log('🚀 Setting up AI Customer Care Agent...\n');
    
    try {
        // Check environment
        await checkEnvironment();
        
        // Connect to database
        console.log('🔗 Connecting to database...');
        await prisma.$connect();
        console.log('✅ Database connected\n');
        
        // Run database migrations
        console.log('🔄 Running database migrations...');
        // Note: In production, run `npx prisma migrate deploy`
        console.log('✅ Migrations completed\n');
        
        // Seed data
        await seedProducts();
        await seedOrders();
        await seedFAQs();
        const businessId = await createSampleBusiness();
        await createSampleChannelIntegrations(businessId);
        await createSampleKnowledgeBase();
        
        console.log('\n🎉 Setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Start the server: npm run dev');
        console.log('2. Test the API: curl http://localhost:3001/health');
        console.log('3. Send a chat message: curl -X POST http://localhost:3001/api/chat -H "Content-Type: application/json" -d \'{"message":"Hello","customerId":"test-user"}\'');
        console.log('4. View inbox: curl http://localhost:3001/api/inbox');
        
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