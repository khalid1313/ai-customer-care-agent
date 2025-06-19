require('dotenv').config();
const ProductSearchTool = require('./src/tools/ProductSearchTool');

async function testProductSearch() {
  console.log('🧪 Testing ProductSearchTool directly...');
  
  const tool = new ProductSearchTool('cmbsfx1qt0001tvvj7hoemk12');
  
  try {
    // Initialize the tool
    console.log('🔌 Initializing ProductSearchTool...');
    await tool.initialize();
    
    // Test the tool function directly
    console.log('🔍 Testing with "Hunter x Hunter" search...');
    const result = await tool.getTool().func('Hunter x Hunter');
    
    console.log('📋 Search Result:');
    console.log(result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔧 Stack:', error.stack);
  }
}

testProductSearch();