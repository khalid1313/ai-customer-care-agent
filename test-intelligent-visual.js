require('dotenv').config();
const VisualSearchTool = require('./src/tools/VisualSearchTool');

async function testIntelligentVisualAnalysis() {
  console.log('🧠 Testing Intelligent Visual Analysis Tool...');
  
  const tool = new VisualSearchTool('cmbsfx1qt0001tvvj7hoemk12');
  
  try {
    // Initialize the tool
    console.log('🔌 Initializing VisualSearchTool...');
    await tool.initialize();
    
    // Test health check
    const health = await tool.healthCheck();
    console.log('🏥 Health Check:', health);
    
    // Test different scenarios without calling OpenAI Vision API (to save costs)
    console.log('\n📋 Testing different intent scenarios...');
    
    // Mock analysis results for different scenarios
    const testScenarios = [
      {
        name: 'Product Search',
        mockAnalysis: {
          intent: 'product_search',
          content_type: 'product',
          description: 'Hunter x Hunter anime action figure collectible showing Gon character in green outfit',
          extracted_data: {
            product_type: 'action figure',
            brand: 'Hunter x Hunter',
            character: 'Gon',
            category: 'collectible'
          },
          confidence: 0.9,
          suggested_action: 'Search for similar Hunter x Hunter products'
        }
      },
      {
        name: 'Order Tracking',
        mockAnalysis: {
          intent: 'order_tracking',
          content_type: 'order_screen',
          description: 'Screenshot of order tracking page showing order #12345 with "In Transit" status',
          extracted_data: {
            order_number: '12345',
            status: 'In Transit',
            tracking_number: 'TRK789456123'
          },
          confidence: 0.95,
          suggested_action: 'Look up order details and provide tracking information'
        }
      },
      {
        name: 'Website Screenshot',
        mockAnalysis: {
          intent: 'website_screenshot',
          content_type: 'website_ui',
          description: 'Screenshot of e-commerce checkout page with payment form visible',
          extracted_data: {
            page_type: 'checkout',
            url: 'shop.example.com/checkout',
            elements_visible: ['payment form', 'cart summary', 'shipping options']
          },
          confidence: 0.85,
          suggested_action: 'Provide checkout assistance or troubleshooting'
        }
      },
      {
        name: 'Damaged Item',
        mockAnalysis: {
          intent: 'general_inquiry',
          content_type: 'product',
          description: 'Photo of a damaged collectible figure with broken arm and missing parts',
          extracted_data: {
            issue_type: 'damaged_item',
            product_type: 'collectible figure',
            damage_description: 'broken arm, missing parts'
          },
          confidence: 0.8,
          suggested_action: 'Help with return/replacement process'
        }
      },
      {
        name: 'Unrelated Image',
        mockAnalysis: {
          intent: 'unrelated',
          content_type: 'personal_photo',
          description: 'Personal vacation photo showing beach sunset with family',
          extracted_data: {},
          confidence: 0.9,
          suggested_action: 'Politely redirect to e-commerce assistance'
        }
      }
    ];
    
    // Test each scenario
    for (const scenario of testScenarios) {
      console.log(`\n🧪 Testing: ${scenario.name}`);
      
      let response;
      switch (scenario.mockAnalysis.intent) {
        case 'product_search':
          response = await tool.handleProductSearch(scenario.mockAnalysis);
          break;
        case 'order_tracking':
          response = await tool.handleOrderTracking(scenario.mockAnalysis);
          break;
        case 'website_screenshot':
          response = await tool.handleWebsiteScreenshot(scenario.mockAnalysis);
          break;
        case 'general_inquiry':
          response = await tool.handleGeneralInquiry(scenario.mockAnalysis);
          break;
        case 'unrelated':
        default:
          response = await tool.handleUnrelatedImage(scenario.mockAnalysis);
          break;
      }
      
      console.log('📝 Intent:', scenario.mockAnalysis.intent);
      console.log('🎯 Confidence:', scenario.mockAnalysis.confidence);
      console.log('💬 Response Preview:', response.substring(0, 200) + '...');
      console.log('---');
    }
    
    console.log('\n✅ All scenarios tested successfully!');
    console.log('\n🔧 Tool Configuration:');
    console.log('- Tool Name:', tool.getTool().name);
    console.log('- Business ID:', tool.businessId);
    console.log('- Namespace:', tool.namespace);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔧 Stack:', error.stack);
  }
}

testIntelligentVisualAnalysis();