const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:3001/api/ai-chat';

async function printContextDetails(sessionId, step) {
    const session = await prisma.session.findUnique({
        where: { id: sessionId }
    });
    
    if (!session) {
        console.log('❌ Session not found!');
        return;
    }
    
    const context = JSON.parse(session.context);
    
    console.log(`\n📊 CONTEXT AT STEP ${step}:`);
    console.log('━'.repeat(60));
    
    // Topic Information
    console.log('🎯 Topics:');
    console.log(`  Current: ${context.current_topic || 'null'}`);
    console.log(`  Previous: ${context.previous_topic || 'null'}`);
    console.log(`  Context Switches: ${context.context_switches || 0}`);
    
    // Products
    console.log('\n📦 Mentioned Products:');
    if (context.mentioned_products && context.mentioned_products.length > 0) {
        context.mentioned_products.forEach((product, i) => {
            console.log(`  ${i + 1}. ${product.name || product} (ID: ${product.id || 'N/A'})`);
        });
    } else {
        console.log('  None');
    }
    
    // Cart
    console.log('\n🛒 Cart Items:');
    if (context.cart_items && context.cart_items.length > 0) {
        context.cart_items.forEach((item, i) => {
            console.log(`  ${i + 1}. ${item.name || item.product} x${item.quantity} - $${item.price}`);
        });
        const total = context.cart_items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log(`  Total: $${total}`);
    } else {
        console.log('  Empty');
    }
    
    // Conversation History
    console.log('\n💬 Conversation History:');
    if (context.conversation_history && context.conversation_history.length > 0) {
        console.log(`  Total Messages: ${context.conversation_history.length}`);
        const lastEntry = context.conversation_history[context.conversation_history.length - 1];
        console.log(`  Last Input: "${lastEntry.input.substring(0, 50)}..."`);
        console.log(`  Last Output: "${lastEntry.output.substring(0, 50)}..."`);
        console.log(`  Tools Used: ${lastEntry.tools_used.join(', ') || 'None'}`);
    } else {
        console.log('  No history');
    }
    
    // Orders
    if (context.mentioned_orders && context.mentioned_orders.length > 0) {
        console.log('\n📋 Mentioned Orders:');
        context.mentioned_orders.forEach((order, i) => {
            console.log(`  ${i + 1}. ${order.id} (${order.timestamp})`);
        });
    }
    
    console.log('\n' + '━'.repeat(60));
}

async function sendMessage(message, sessionId) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: message,
            sessionId: sessionId,
            agentType: 'enhanced-sales-agent'
        })
    });
    
    const data = await response.json();
    return data;
}

async function runFullContextTest() {
    const sessionId = `test-full-context-${Date.now()}`;
    console.log('🚀 FULL SESSION CONTEXT TRACKING TEST');
    console.log(`📍 Session ID: ${sessionId}\n`);
    
    try {
        // Test 1: Initial greeting
        console.log('\n🔸 Test 1: Initial Greeting');
        let result = await sendMessage("Hello", sessionId);
        console.log(`Response: ${result.response.substring(0, 80)}...`);
        console.log(`Tools: ${result.metrics.toolsCalled.length}`);
        await printContextDetails(sessionId, 1);
        
        // Test 2: Product search
        console.log('\n\n🔸 Test 2: Product Search');
        result = await sendMessage("Show me Sony headphones", sessionId);
        console.log(`Response: ${result.response.substring(0, 80)}...`);
        console.log(`Tools: ${result.metrics.toolsCalled}`);
        console.log(`Debug - Products Tracked: ${result.debugFlags.mentioned_products_count}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await printContextDetails(sessionId, 2);
        
        // Test 3: Reference resolution
        console.log('\n\n🔸 Test 3: Reference Resolution');
        result = await sendMessage("What's the price of those headphones?", sessionId);
        console.log(`Response: ${result.response.substring(0, 80)}...`);
        console.log(`Reference Resolved: ${result.debugFlags.used_reference_resolution}`);
        if (result.debugFlags.resolved_references) {
            console.log(`  Original: "${result.debugFlags.resolved_references[0]}"`);
            console.log(`  Resolved: "${result.debugFlags.resolved_references[1]}"`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        await printContextDetails(sessionId, 3);
        
        // Test 4: Cart operation
        console.log('\n\n🔸 Test 4: Cart Operation');
        result = await sendMessage("Add the Sony WH-1000XM4 to my cart", sessionId);
        console.log(`Response: ${result.response.substring(0, 80)}...`);
        console.log(`Tools: ${result.metrics.toolsCalled}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await printContextDetails(sessionId, 4);
        
        // Test 5: Topic switch to orders
        console.log('\n\n🔸 Test 5: Topic Switch - Orders');
        result = await sendMessage("Track order ORD001", sessionId);
        console.log(`Response: ${result.response.substring(0, 80)}...`);
        console.log(`Tools: ${result.metrics.toolsCalled}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await printContextDetails(sessionId, 5);
        
        // Test 6: Back to products
        console.log('\n\n🔸 Test 6: Topic Switch - Back to Products');
        result = await sendMessage("Show me Apple AirPods too", sessionId);
        console.log(`Response: ${result.response.substring(0, 80)}...`);
        console.log(`Tools: ${result.metrics.toolsCalled}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await printContextDetails(sessionId, 6);
        
        // Final Summary
        console.log('\n\n' + '═'.repeat(60));
        console.log('📋 FINAL SESSION SUMMARY');
        console.log('═'.repeat(60));
        
        const finalSession = await prisma.session.findUnique({
            where: { id: sessionId }
        });
        const finalContext = JSON.parse(finalSession.context);
        
        console.log(`\n✅ Session successfully tracked ${finalContext.conversation_history.length} messages`);
        console.log(`✅ Tracked ${finalContext.mentioned_products.length} unique products`);
        console.log(`✅ Cart has ${finalContext.cart_items.length} items`);
        console.log(`✅ Made ${finalContext.context_switches} topic switches`);
        console.log(`✅ Current topic: ${finalContext.current_topic}`);
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runFullContextTest().catch(console.error);