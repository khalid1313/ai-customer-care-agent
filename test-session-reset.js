const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:3001/api/ai-chat';

async function testSessionReset() {
    console.log('🧪 Testing Session Reset Functionality\n');
    
    try {
        // First session with unique timestamp
        const session1 = `test-reset-session-${Date.now()}-1`;
        console.log('📍 Session 1:', session1);
        
        let response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "What's your return policy?",
                sessionId: session1,
                agentType: 'enhanced-sales-agent'
            })
        });
        
        let data = await response.json();
        console.log('✅ First message response:', data.response.substring(0, 60) + '...');
        console.log('🔧 Tools used:', data.metrics.toolsCalled);
        console.log('🏷️ Debug flags:', Object.keys(data.debugFlags).filter(k => data.debugFlags[k]));
        
        // Second message in same session
        response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "How long do I have?",
                sessionId: session1,
                agentType: 'enhanced-sales-agent'
            })
        });
        
        data = await response.json();
        console.log('✅ Second message response:', data.response.substring(0, 60) + '...');
        console.log('🔧 Tools used:', data.metrics.toolsCalled);
        
        // Check session context in database
        await new Promise(resolve => setTimeout(resolve, 500));
        let session = await prisma.session.findUnique({
            where: { id: session1 }
        });
        
        if (session) {
            const context = JSON.parse(session.context);
            console.log('📊 Session 1 conversation history:', context.conversation_history?.length || 0, 'messages');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🔄 SIMULATING SESSION RESET');
        console.log('='.repeat(60));
        
        // NEW session after reset with unique timestamp
        const session2 = `test-reset-session-${Date.now()}-2`;
        console.log('📍 Session 2 (after reset):', session2);
        
        response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "What's your return policy?",
                sessionId: session2,
                agentType: 'enhanced-sales-agent'
            })
        });
        
        data = await response.json();
        console.log('✅ First message in new session:', data.response.substring(0, 60) + '...');
        console.log('🔧 Tools used:', data.metrics.toolsCalled);
        console.log('🏷️ Debug flags:', Object.keys(data.debugFlags).filter(k => data.debugFlags[k]));
        
        // Should show greeting for new session
        const hasGreeting = data.response.includes("Hello! I'm your AI shopping assistant");
        console.log('👋 Contains greeting:', hasGreeting ? '✅ YES' : '❌ NO');
        
        // Check new session context
        await new Promise(resolve => setTimeout(resolve, 500));
        session = await prisma.session.findUnique({
            where: { id: session2 }
        });
        
        if (session) {
            const context = JSON.parse(session.context);
            console.log('📊 Session 2 conversation history:', context.conversation_history?.length || 0, 'messages');
        }
        
        console.log('\n' + '✅'.repeat(20));
        console.log('SESSION RESET TEST COMPLETE');
        console.log('✅'.repeat(20));
        
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSessionReset().catch(console.error);