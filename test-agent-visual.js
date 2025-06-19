require('dotenv').config();
const CoreAIAgent = require('./src/agents/CoreAIAgent');

async function testAgentVisualSearch() {
  console.log('🤖 Testing CoreAIAgent with Visual Search...');
  
  const agent = new CoreAIAgent('cmbsfx1qt0001tvvj7hoemk12');
  
  try {
    console.log('🔌 Initializing agent...');
    await agent.initialize();
    
    console.log('📊 Agent stats:', agent.getStats());
    
    // Test 1: Regular text search
    console.log('\n🔍 Test 1: Regular text search');
    const textResult = await agent.chat('Show me Hunter x Hunter products');
    console.log('Response:', textResult.response.substring(0, 200) + '...');
    console.log('Tools used:', textResult.toolsUsed?.map(t => t.tool) || []);
    
    // Test 2: Visual search simulation
    console.log('\n🖼️ Test 2: Visual search simulation');
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const visualResult = await agent.chat('What product is in this image?', { image: testImageBase64 });
    console.log('Response:', visualResult.response.substring(0, 200) + '...');
    console.log('Tools used:', visualResult.toolsUsed?.map(t => t.tool) || []);
    console.log('Reasoning:', visualResult.reasoning);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔧 Stack:', error.stack);
  }
}

testAgentVisualSearch();