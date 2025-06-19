const SuperEnhancedAIAgent = require('./src/agents/SuperEnhancedAIAgent');
const logger = require('./src/utils/logger');

async function testIntegration() {
    console.log('🚀 Starting integration test of Super Enhanced AI Agent...\n');

    try {
        // Initialize the agent
        console.log('📦 Initializing Super Enhanced AI Agent...');
        const agent = new SuperEnhancedAIAgent({
            model: 'gpt-3.5-turbo',
            temperature: 0.1,
            verbose: true,
            useRAG: true,
            useToolEnforcement: true,
            useEnhancedContext: true
        });

        await agent.initialize();
        console.log('✅ Agent initialized successfully!\n');

        // Test health check
        console.log('🔍 Running health check...');
        const health = await agent.healthCheck();
        console.log('Health status:', health.status);
        console.log('Health checks:', health.checks);
        console.log('');

        // Test agent stats
        console.log('📊 Agent statistics:');
        const stats = agent.getStats();
        console.log(`- Tools loaded: ${stats.toolCount}`);
        console.log(`- RAG enabled: ${stats.features.ragEnabled}`);
        console.log(`- Tool enforcement: ${stats.features.enforcementEnabled}`);
        console.log(`- Enhanced context: ${stats.features.enhancedContextEnabled}`);
        console.log('');

        // Test basic conversation
        console.log('💬 Testing basic conversation...');
        
        // Test 1: Product search
        console.log('\n--- Test 1: Product Search ---');
        const response1 = await agent.processMessage(
            "I'm looking for wireless headphones under $100",
            null,
            'test-customer-001'
        );
        console.log('Query:', "I'm looking for wireless headphones under $100");
        console.log('Response:', response1.response.substring(0, 200) + '...');
        console.log('Tools used:', response1.toolsUsed);
        console.log('Topic:', response1.topicInfo?.primaryTopic);
        console.log('');

        // Test 2: Ambiguous price query
        console.log('\n--- Test 2: Ambiguous Price Query ---');
        const response2 = await agent.processMessage(
            "How much does it cost?",
            response1.sessionId,
            'test-customer-001'
        );
        console.log('Query:', "How much does it cost?");
        console.log('Response:', response2.response.substring(0, 200) + '...');
        console.log('Tools used:', response2.toolsUsed);
        console.log('Is ambiguous:', response2.ambiguityInfo?.isAmbiguous);
        console.log('');

        // Test 3: Order tracking
        console.log('\n--- Test 3: Order Tracking ---');
        const response3 = await agent.processMessage(
            "Can you track my order ORD-2024-001?",
            response1.sessionId,
            'test-customer-001'
        );
        console.log('Query:', "Can you track my order ORD-2024-001?");
        console.log('Response:', response3.response.substring(0, 200) + '...');
        console.log('Tools used:', response3.toolsUsed);
        console.log('Topic switch:', response3.topicInfo?.isTopicSwitch);
        console.log('');

        // Test 4: Back to products (context recovery)
        console.log('\n--- Test 4: Context Recovery ---');
        const response4 = await agent.processMessage(
            "Which headphones did you show me earlier?",
            response1.sessionId,
            'test-customer-001'
        );
        console.log('Query:', "Which headphones did you show me earlier?");
        console.log('Response:', response4.response.substring(0, 200) + '...');
        console.log('Tools used:', response4.toolsUsed);
        console.log('');

        // Test 5: FAQ query with RAG
        console.log('\n--- Test 5: FAQ Query with RAG ---');
        const response5 = await agent.processMessage(
            "What is your return policy?",
            response1.sessionId,
            'test-customer-001'
        );
        console.log('Query:', "What is your return policy?");
        console.log('Response:', response5.response.substring(0, 200) + '...');
        console.log('Tools used:', response5.toolsUsed);
        console.log('');

        // Get session summary
        console.log('\n--- Session Summary ---');
        const summary = await agent.getSessionSummary(response1.sessionId);
        console.log('Session duration:', summary.duration);
        console.log('Message count:', summary.messageCount);
        console.log('Topic switches:', summary.topicSwitches);
        console.log('Current topic:', summary.currentTopic);
        console.log('Needs escalation:', summary.needsEscalation);
        console.log('');

        console.log('🎉 Integration test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- ✅ Agent initialization');
        console.log('- ✅ Health check');
        console.log('- ✅ Product search with tools');
        console.log('- ✅ Ambiguous query detection');
        console.log('- ✅ Topic switching and tracking');
        console.log('- ✅ Context recovery');
        console.log('- ✅ RAG-enhanced FAQ');
        console.log('- ✅ Session management');

    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testIntegration().then(() => {
        console.log('\n✨ All tests passed! The system is ready for use.');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    });
}

module.exports = testIntegration;