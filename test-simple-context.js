const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the context manager directly
const EnhancedContextManager = require('./src/services/EnhancedContextManager');
const contextManager = new EnhancedContextManager();

async function testContextPersistence() {
    const sessionId = `test-simple-${Date.now()}`;
    console.log('🧪 Testing Context Persistence');
    console.log('📍 Session ID:', sessionId);
    
    try {
        // 1. Create initial session
        console.log('\n1️⃣ Creating session in database...');
        await prisma.session.create({
            data: {
                id: sessionId,
                customerId: 'test-user',
                customerName: 'Test User',
                context: JSON.stringify({
                    current_topic: 'initial',
                    mentioned_products: [],
                    cart_items: []
                }),
                isActive: true
            }
        });
        console.log('✅ Session created');
        
        // 2. Update context using ContextManager
        console.log('\n2️⃣ Updating context via ContextManager...');
        await contextManager.updateContext(sessionId, {
            current_topic: 'products',
            mentioned_products: ['Sony WH-1000XM4'],
            cart_items: [{ name: 'Sony WH-1000XM4', quantity: 1, price: 349 }]
        });
        console.log('✅ Context updated');
        
        // 3. Check database directly
        console.log('\n3️⃣ Checking database...');
        const dbSession = await prisma.session.findUnique({
            where: { id: sessionId }
        });
        
        if (dbSession) {
            const context = JSON.parse(dbSession.context);
            console.log('📊 Database Context:');
            console.log('  - Current Topic:', context.current_topic);
            console.log('  - Mentioned Products:', context.mentioned_products);
            console.log('  - Cart Items:', context.cart_items);
        }
        
        // 4. Check in-memory cache
        console.log('\n4️⃣ Checking in-memory cache...');
        const memoryContext = await contextManager.getContext(sessionId);
        console.log('💾 Memory Context:');
        console.log('  - Current Topic:', memoryContext.current_topic);
        console.log('  - Mentioned Products:', memoryContext.mentioned_products);
        console.log('  - Cart Items:', memoryContext.cart_items);
        
        // 5. Test another update
        console.log('\n5️⃣ Adding another product...');
        await contextManager.trackMentionedProducts(sessionId, ['Apple AirPods Pro']);
        
        // 6. Final check
        console.log('\n6️⃣ Final database check...');
        const finalSession = await prisma.session.findUnique({
            where: { id: sessionId }
        });
        
        if (finalSession) {
            const finalContext = JSON.parse(finalSession.context);
            console.log('📊 Final Database Context:');
            console.log('  - Mentioned Products:', finalContext.mentioned_products);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testContextPersistence();