const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAgentContext() {
    const sessionId = `test-agent-context-${Date.now()}`;
    console.log('🧪 Testing Agent Context Updates');
    console.log('📍 Session ID:', sessionId);
    
    const messages = [
        "Show me Sony headphones",
        "Add them to my cart",
        "Show me Apple AirPods too"
    ];
    
    for (let i = 0; i < messages.length; i++) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📨 Message ${i + 1}: "${messages[i]}"`);
        console.log(`${'='.repeat(60)}`);
        
        // Send message
        const response = await fetch('http://localhost:3001/api/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: messages[i],
                sessionId: sessionId,
                agentType: 'enhanced-sales-agent'
            })
        });
        
        const data = await response.json();
        console.log('\n🤖 Response:', data.response.substring(0, 80) + '...');
        console.log('🔧 Tools Used:', data.metrics.toolsCalled);
        console.log('🏷️ Products Tracked:', data.debugFlags.mentioned_products_count);
        
        // Check database after each message
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB update
        
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });
        
        if (session) {
            const context = JSON.parse(session.context);
            console.log('\n📊 Context in Database:');
            console.log('  - Current Query:', context.current_query);
            console.log('  - Tools Used:', context.tools_used);
            console.log('  - Processing Time:', context.processing_time);
            console.log('  - Mentioned Products:', context.mentioned_products?.length || 0);
            console.log('  - Cart Items:', context.cart_items?.length || 0);
            console.log('  - Conversation History:', context.conversation_history?.length || 0);
            
            // Show raw context for debugging
            console.log('\n🔍 Raw Context Keys:', Object.keys(context));
        } else {
            console.log('❌ Session not found in database!');
        }
    }
    
    await prisma.$disconnect();
}

testAgentContext().catch(console.error);