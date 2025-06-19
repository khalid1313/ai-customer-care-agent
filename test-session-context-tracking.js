const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:3002/api/ai-chat';
const SESSION_ID = `test-context-tracking-${Date.now()}`;

async function getSessionFromDB(sessionId) {
    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        });
        if (session) {
            return JSON.parse(session.context);
        }
        return null;
    } catch (error) {
        console.error('Error fetching session:', error);
        return null;
    }
}

async function sendMessage(message, step) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`STEP ${step}: Sending message: "${message}"`);
    console.log(`${'='.repeat(80)}`);
    
    // Get context before message
    const contextBefore = await getSessionFromDB(SESSION_ID);
    console.log('\n📊 CONTEXT BEFORE MESSAGE:');
    if (contextBefore) {
        console.log('  - Current Topic:', contextBefore.current_topic || 'null');
        console.log('  - Previous Topic:', contextBefore.previous_topic || 'null');
        console.log('  - Mentioned Products:', contextBefore.mentioned_products?.length || 0);
        console.log('  - Cart Items:', contextBefore.cart_items?.length || 0);
        console.log('  - Conversation History:', contextBefore.conversation_history?.length || 0);
        console.log('  - Context Switches:', contextBefore.context_switches || 0);
    } else {
        console.log('  - No context yet (new session)');
    }
    
    // Send message
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message,
            sessionId: SESSION_ID,
            agentType: 'enhanced-sales-agent'
        })
    });
    
    const data = await response.json();
    
    console.log('\n🤖 AGENT RESPONSE:');
    console.log('  - Message:', data.response.substring(0, 100) + '...');
    console.log('  - Tools Used:', data.metrics.toolsCalled);
    console.log('  - Processing Time:', data.metrics.processingTime + 'ms');
    
    console.log('\n🔍 DEBUG FLAGS:');
    const flags = data.debugFlags;
    console.log('  - Reference Resolution:', flags.used_reference_resolution);
    console.log('  - Tool Enforcement:', flags.used_tool_enforcement);
    console.log('  - Product Tracking:', flags.used_product_tracking);
    console.log('  - Mentioned Products Count:', flags.mentioned_products_count);
    if (flags.resolved_references) {
        console.log('  - Resolved:', flags.resolved_references[0], '=>', flags.resolved_references[1]);
    }
    
    // Wait a bit for context to be updated
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get context after message
    const contextAfter = await getSessionFromDB(SESSION_ID);
    console.log('\n📊 CONTEXT AFTER MESSAGE:');
    if (contextAfter) {
        console.log('  - Current Topic:', contextAfter.current_topic || 'null');
        console.log('  - Previous Topic:', contextAfter.previous_topic || 'null');
        console.log('  - Mentioned Products:', contextAfter.mentioned_products?.map(p => 
            typeof p === 'string' ? p : p.name || JSON.stringify(p)
        ).join(', ') || 'none');
        console.log('  - Cart Items:', contextAfter.cart_items?.map(item => 
            `${item.name || item.product} (qty: ${item.quantity})`
        ).join(', ') || 'none');
        console.log('  - Conversation History:', contextAfter.conversation_history?.length || 0);
        console.log('  - Context Switches:', contextAfter.context_switches || 0);
        console.log('  - Last Query:', contextAfter.current_query);
        console.log('  - Last Response:', contextAfter.last_response?.substring(0, 50) + '...');
    }
    
    // Show what changed
    console.log('\n🔄 CHANGES IN CONTEXT:');
    if (contextBefore && contextAfter) {
        if (contextBefore.current_topic !== contextAfter.current_topic) {
            console.log(`  - Topic changed: ${contextBefore.current_topic} → ${contextAfter.current_topic}`);
        }
        if (contextBefore.mentioned_products?.length !== contextAfter.mentioned_products?.length) {
            console.log(`  - Products tracked: ${contextBefore.mentioned_products?.length || 0} → ${contextAfter.mentioned_products?.length || 0}`);
        }
        if (contextBefore.cart_items?.length !== contextAfter.cart_items?.length) {
            console.log(`  - Cart items: ${contextBefore.cart_items?.length || 0} → ${contextAfter.cart_items?.length || 0}`);
        }
        if (contextBefore.context_switches !== contextAfter.context_switches) {
            console.log(`  - Context switches: ${contextBefore.context_switches || 0} → ${contextAfter.context_switches || 0}`);
        }
    }
    
    return data;
}

async function runFullTest() {
    console.log('\n🚀 STARTING SESSION CONTEXT TRACKING TEST');
    console.log(`📍 Session ID: ${SESSION_ID}`);
    
    try {
        // Test conversation flow
        const messages = [
            { text: "Hello", step: 1 },
            { text: "Show me Sony headphones", step: 2 },
            { text: "What's the price of those headphones?", step: 3 },
            { text: "Add them to my cart", step: 4 },
            { text: "Track order ORD001", step: 5 },
            { text: "Back to shopping - show me Apple AirPods", step: 6 },
            { text: "Compare their prices", step: 7 },
            { text: "What's in my cart now?", step: 8 },
            { text: "Remove the Sony headphones", step: 9 },
            { text: "What's my cart total?", step: 10 }
        ];
        
        for (const msg of messages) {
            await sendMessage(msg.text, msg.step);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between messages
        }
        
        // Final session summary
        console.log(`\n${'='.repeat(80)}`);
        console.log('📋 FINAL SESSION SUMMARY');
        console.log(`${'='.repeat(80)}`);
        
        const finalContext = await getSessionFromDB(SESSION_ID);
        if (finalContext) {
            console.log('\n🏁 Final Context State:');
            console.log('  - Total Conversation History:', finalContext.conversation_history?.length || 0);
            console.log('  - Total Context Switches:', finalContext.context_switches || 0);
            console.log('  - Final Topic:', finalContext.current_topic);
            console.log('  - Products Mentioned:', finalContext.mentioned_products?.map(p => 
                typeof p === 'string' ? p : p.name || JSON.stringify(p)
            ).join(', '));
            console.log('  - Final Cart State:', finalContext.cart_items?.map(item => 
                `${item.name || item.product} (qty: ${item.quantity})`
            ).join(', ') || 'empty');
            
            console.log('\n📜 Conversation Flow:');
            finalContext.conversation_flow?.forEach((flow, i) => {
                console.log(`  ${i + 1}. ${flow}`);
            });
        }
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
runFullTest().catch(console.error);