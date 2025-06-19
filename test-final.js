const CustomerCareTools = require('./src/tools/CustomerCareTools');

async function testFinalImprovements() {
    console.log('=== Final Test of All Improvements ===');
    
    const toolsProvider = new CustomerCareTools();
    const tools = toolsProvider.getAllTools();
    
    const productSearchTool = tools.find(t => t.name === 'ProductSearchTool');
    const cartTool = tools.find(t => t.name === 'ShoppingCartTool');
    
    console.log('\n✅ 1. Product Search Tests:');
    console.log('Sony WH-1000XM4:', await productSearchTool.func('Sony WH-1000XM4'));
    console.log('Apple AirPods Pro:', await productSearchTool.func('Apple AirPods Pro'));
    console.log('Jabra Elite 4:', await productSearchTool.func('Jabra Elite 4'));
    
    console.log('\n✅ 2. Cart Operations Tests:');
    console.log('Add Sony:', await cartTool.func('add Sony WH-1000XM4'));
    console.log('Add AirPods:', await cartTool.func('add AirPods'));
    console.log('View cart:', await cartTool.func('view cart'));
    
    console.log('\n✅ 3. Cart Removal Tests:');
    console.log('Remove Sony headphones:', await cartTool.func('remove Sony headphones'));
    console.log('Final cart:', await cartTool.func('view cart'));
    
    console.log('\n✅ 4. Product Comparison Test:');
    console.log('Headphones search:', await productSearchTool.func('headphones'));
    
    console.log('\n✅ 5. Brand Search Test:');
    console.log('Apple products:', await productSearchTool.func('Apple'));
    
    console.log('\n🎉 All core functionality tests completed!');
}

testFinalImprovements().catch(console.error);