const CustomerCareTools = require('./src/tools/CustomerCareTools');
const EnhancedAIAgent = require('./src/agents/EnhancedAIAgent');

async function testImprovements() {
    console.log('=== Testing Product Search Improvements ===');
    
    // Initialize tools
    const toolsProvider = new CustomerCareTools();
    const tools = toolsProvider.getAllTools();
    
    // Test product search directly
    const productSearchTool = tools.find(t => t.name === 'ProductSearchTool');
    
    console.log('\n1. Testing Sony WH-1000XM4 search:');
    const sonyResult = await productSearchTool.func('Sony WH-1000XM4');
    console.log(sonyResult);
    
    console.log('\n2. Testing Apple AirPods Pro search:');
    const airpodsResult = await productSearchTool.func('Apple AirPods Pro');
    console.log(airpodsResult);
    
    console.log('\n3. Testing Jabra Elite 4 search:');
    const jabraResult = await productSearchTool.func('Jabra Elite 4');
    console.log(jabraResult);
    
    // Test cart functionality
    const cartTool = tools.find(t => t.name === 'ShoppingCartTool');
    
    console.log('\n4. Testing cart operations:');
    console.log('Adding Sony WH-1000XM4:');
    const addResult = await cartTool.func('add Sony WH-1000XM4 to cart');
    console.log(addResult);
    
    console.log('\nViewing cart:');
    const viewResult = await cartTool.func('view cart');
    console.log(viewResult);
    
    console.log('\nAdding AirPods:');
    const addAirpodsResult = await cartTool.func('add AirPods to cart');
    console.log(addAirpodsResult);
    
    console.log('\nViewing cart again:');
    const viewResult2 = await cartTool.func('view cart');
    console.log(viewResult2);
    
    console.log('\nRemoving Sony headphones:');
    const removeResult = await cartTool.func('remove Sony headphones');
    console.log(removeResult);
    
    console.log('\nFinal cart view:');
    const finalView = await cartTool.func('view cart');
    console.log(finalView);
}

testImprovements().catch(console.error);