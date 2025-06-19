const CustomerCareTools = require('./src/tools/CustomerCareTools');

async function testComprehensiveData() {
    console.log('=== Testing Comprehensive Data ===');
    
    const toolsProvider = new CustomerCareTools();
    const tools = toolsProvider.getAllTools();
    
    const productSearchTool = tools.find(t => t.name === 'ProductSearchTool');
    const faqTool = tools.find(t => t.name === 'FAQTool');
    const cartTool = tools.find(t => t.name === 'ShoppingCartTool');
    
    console.log('\n✅ 1. Testing Enhanced Product Search:');
    console.log('Sony WH-1000XM4:', await productSearchTool.func('Sony WH-1000XM4'));
    console.log('\nApple AirPods Pro:', await productSearchTool.func('Apple AirPods Pro'));
    console.log('\nJabra Elite 4:', await productSearchTool.func('Jabra Elite 4'));
    console.log('\nMice products:', await productSearchTool.func('mouse'));
    console.log('\nCharging products:', await productSearchTool.func('charging'));
    
    console.log('\n✅ 2. Testing Enhanced FAQ System:');
    console.log('Return policy:', await faqTool.func('return policy'));
    console.log('\nShipping info:', await faqTool.func('shipping'));
    console.log('\nPrice matching:', await faqTool.func('price match'));
    console.log('\nStudent discount:', await faqTool.func('student discount'));
    console.log('\nGift wrapping:', await faqTool.func('gift wrapping'));
    
    console.log('\n✅ 3. Testing Product Features:');
    console.log('Noise cancelling:', await productSearchTool.func('noise cancelling'));
    console.log('\nWireless charging:', await productSearchTool.func('wireless charging'));
    console.log('\nWater resistant:', await productSearchTool.func('water resistant'));
    
    console.log('\n✅ 4. Testing Cart with New Products:');
    console.log('Add Jabra Elite 4:', await cartTool.func('add Jabra Elite 4'));
    console.log('Add Anker PowerCore:', await cartTool.func('add Anker PowerCore'));
    console.log('View cart:', await cartTool.func('view cart'));
    
    console.log('\n🎉 Comprehensive data test completed!');
}

testComprehensiveData().catch(console.error);