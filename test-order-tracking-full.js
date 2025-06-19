require('dotenv').config();
const OrderTrackingTool = require('./src/tools/OrderTrackingTool');

async function testOrderTrackingFull() {
  console.log('📦 Testing Order Tracking Tool with Real Data...');
  
  const tool = new OrderTrackingTool('cmbsfx1qt0001tvvj7hoemk12');
  
  try {
    // Initialize the tool
    console.log('🔌 Initializing OrderTrackingTool...');
    await tool.initialize();
    
    // Test health check
    const health = await tool.healthCheck();
    console.log('🏥 Health Check:', health);
    
    // Test with loaded local orders
    console.log('\n🔍 Testing Local Orders:');
    const localTestScenarios = [
      'ORD-2024-001',           // Exact local order ID
      'john.smith@email.com',   // Customer email from local data
      'TRK123456789',          // Tracking number from local data
      'John Smith'              // Customer name
    ];
    
    for (const scenario of localTestScenarios) {
      console.log(`\n📋 Testing: "${scenario}"`);
      
      try {
        const result = await tool.getTool().func(scenario);
        console.log('✅ Found Orders:', result.includes('Order Found') ? 'YES' : 'NO');
        if (result.includes('Order Found')) {
          console.log('📄 Result Preview:', result.substring(0, 300) + '...');
        } else {
          console.log('❌ No orders found');
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    }
    
    // Test with Shopify order info you provided
    console.log('\n\n🛒 Testing Shopify Integration Scenarios:');
    const shopifyTestScenarios = [
      '176484',                    // Shopify order ID you mentioned
      'missdowntoearthkm@gmail.com'  // Email you provided
    ];
    
    for (const scenario of shopifyTestScenarios) {
      console.log(`\n🔍 Testing Shopify: "${scenario}"`);
      
      try {
        const result = await tool.getTool().func(scenario);
        console.log('✅ Found Orders:', result.includes('Order Found') ? 'YES' : 'NO');
        console.log('📄 Result Preview:', result.substring(0, 200) + '...');
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    }
    
    console.log('\n✅ All order tracking tests completed!');
    
    // Show configuration
    console.log('\n🔧 Tool Configuration:');
    console.log('- Tool Name:', tool.getTool().name);
    console.log('- Business ID:', tool.businessId);
    console.log('- Shopify Available:', !!tool.shopifyService);
    console.log('- SHOPIFY_DOMAIN:', process.env.SHOPIFY_DOMAIN || 'Not configured');
    console.log('- SHOPIFY_ACCESS_TOKEN:', process.env.SHOPIFY_ACCESS_TOKEN ? 'Configured' : 'Not configured');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔧 Stack:', error.stack);
  }
}

testOrderTrackingFull();