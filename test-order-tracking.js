require('dotenv').config();
const OrderTrackingTool = require('./src/tools/OrderTrackingTool');

async function testOrderTracking() {
  console.log('📦 Testing Order Tracking Tool...');
  
  const tool = new OrderTrackingTool('cmbsfx1qt0001tvvj7hoemk12');
  
  try {
    // Initialize the tool
    console.log('🔌 Initializing OrderTrackingTool...');
    await tool.initialize();
    
    // Test health check
    const health = await tool.healthCheck();
    console.log('🏥 Health Check:', health);
    
    // Test scenarios
    const testScenarios = [
      'ORD-2024-001',           // Exact order ID
      'john.smith@email.com',   // Customer email
      'TRK123456789',          // Tracking number
      'nonexistent-order'       // Order not found
    ];
    
    for (const scenario of testScenarios) {
      console.log(`\n🔍 Testing: "${scenario}"`);
      
      try {
        const result = await tool.getTool().func(scenario);
        console.log('📋 Result Preview:', result.substring(0, 200) + '...');
        console.log('---');
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    }
    
    console.log('\n✅ Order tracking tests completed!');
    console.log('\n🔧 Tool Configuration:');
    console.log('- Tool Name:', tool.getTool().name);
    console.log('- Business ID:', tool.businessId);
    console.log('- Max Results:', tool.maxResults);
    console.log('- Shopify Available:', !!tool.shopifyService);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔧 Stack:', error.stack);
  }
}

testOrderTracking();