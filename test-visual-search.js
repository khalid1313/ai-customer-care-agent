require('dotenv').config();
const VisualSearchTool = require('./src/tools/VisualSearchTool');

async function testVisualSearch() {
  console.log('🖼️ Testing VisualSearchTool...');
  
  const tool = new VisualSearchTool('cmbsfx1qt0001tvvj7hoemk12');
  
  try {
    // Initialize the tool
    console.log('🔌 Initializing VisualSearchTool...');
    await tool.initialize();
    
    // Test with a sample base64 image (1x1 pixel PNG for testing)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    console.log('🔍 Testing visual search with sample image...');
    
    // Test the health check first
    const health = await tool.healthCheck();
    console.log('🏥 Health Check:', health);
    
    // For demo purposes, let's test the description-based search without calling Vision API
    // to avoid API costs during development
    console.log('🔍 Testing with Hunter x Hunter description...');
    const testDescription = 'Hunter x Hunter anime action figure collectible toy character Gon';
    const result = await tool.searchByDescription(testDescription);
    
    console.log('📋 Search Result:');
    console.log('Found', result.length, 'products');
    result.forEach((product, index) => {
      console.log(`${index + 1}. ${product.productTitle} - $${product.productPrice} (Score: ${product.finalScore || product.searchScore})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔧 Stack:', error.stack);
  }
}

testVisualSearch();