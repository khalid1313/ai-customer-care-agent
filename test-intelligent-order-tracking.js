require('dotenv').config();
const OrderTrackingTool = require('./src/tools/OrderTrackingTool');

async function testIntelligentOrderTracking() {
  console.log('🧠 Testing Intelligent Order Tracking...');
  
  const tool = new OrderTrackingTool('cmbsfx1qt0001tvvj7hoemk12');
  await tool.initialize();
  
  // Test different scenarios to see intelligent responses
  const testScenarios = [
    {
      name: 'Shopify Order Number (not found)',
      query: '176484',
      expectation: 'Should detect as order number and ask for email/date'
    },
    {
      name: 'Partial Email',
      query: 'missdowntoearthkm',
      expectation: 'Should recognize incomplete email and ask for full email'
    },
    {
      name: 'Complete Email (not found)',
      query: 'missdowntoearthkm@gmail.com',
      expectation: 'Should recognize email and ask to verify or provide alternatives'
    },
    {
      name: 'Vague Request',
      query: 'track my order',
      expectation: 'Should ask for specific information'
    },
    {
      name: 'Short Number',
      query: '123',
      expectation: 'Should recognize as partial info and ask for clarification'
    },
    {
      name: 'Tracking Number Format',
      query: 'TRK999999999',
      expectation: 'Should recognize as tracking number and provide tracking-specific help'
    }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\n🔍 Testing: ${scenario.name}`);
    console.log(`📝 Query: "${scenario.query}"`);
    console.log(`🎯 Expected: ${scenario.expectation}`);
    console.log('---');
    
    try {
      const result = await tool.getTool().func(scenario.query);
      console.log('📋 Response:');
      console.log(result);
      console.log('\n' + '='.repeat(80));
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

testIntelligentOrderTracking();