const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const API_URL = 'http://localhost:3001/api/ai-chat';

async function testReturnQuestions() {
    console.log('🧪 Testing Return Questions Tool Enforcement\n');
    
    const testQuestions = [
        "What's your return policy?",
        "Can I return order ORD005?", 
        "I want to return my purchase",
        "How do I return a product?"
    ];
    
    for (let i = 0; i < testQuestions.length; i++) {
        const sessionId = `test-return-q${i + 1}-${Date.now()}`;
        const question = testQuestions[i];
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔸 Test ${i + 1}: "${question}"`);
        console.log(`📍 Session: ${sessionId}`);
        console.log(`${'='.repeat(60)}`);
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: question,
                    sessionId: sessionId,
                    agentType: 'enhanced-sales-agent'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                console.log('✅ Response:', data.response.substring(0, 70) + '...');
                console.log('🔧 Tools Used:', data.metrics.toolsCalled);
                console.log('🏷️ Tools Available:', data.debugFlags?.tools_available || 'N/A');
                console.log('⚙️ Tool Enforcement:', data.debugFlags?.used_tool_enforcement ? '✅' : '❌');
                console.log('🎯 Expected Tools: ReturnTool/FAQTool');
                
                // Check if tools were used
                const toolsUsed = data.metrics.toolsCalled;
                const hasExpectedTools = toolsUsed.includes('ReturnTool') || 
                                       toolsUsed.includes('FAQTool') || 
                                       toolsUsed.includes('CustomerSupportTool');
                
                if (toolsUsed.length > 0 && hasExpectedTools) {
                    console.log('✅ PASS: Tools correctly used');
                } else if (toolsUsed.length === 0) {
                    console.log('❌ FAIL: No tools used');
                } else {
                    console.log('⚠️ PARTIAL: Tools used but not expected ones');
                }
                
            } else {
                console.log('❌ Request failed:', response.status);
            }
            
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '✅'.repeat(20));
    console.log('RETURN QUESTIONS TEST COMPLETE');
    console.log('✅'.repeat(20));
}

testReturnQuestions().catch(console.error);