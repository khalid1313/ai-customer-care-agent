const ProductSyncService = require('./src/services/ProductSyncService');
const { PrismaClient } = require('@prisma/client');

async function testImageEmbedding() {
  const prisma = new PrismaClient();
  const productSyncService = new ProductSyncService();
  
  try {
    console.log('🧪 Testing NEW features: Image embeddings + Shopify-only Vector IDs...');
    
    // Find a product to test with
    const product = await prisma.productSync.findFirst({
      where: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12',
        shopifyStatus: 'synced'
      },
      skip: 2  // Skip the ones we already tested
    });
    
    if (!product) {
      console.log('No more products to test with');
      return;
    }
    
    console.log('Testing product:', product.productTitle);
    console.log('Image URL:', product.productImage);
    console.log('Expected Vector ID:', product.shopifyProductId, '(Shopify ID only)');
    
    // Reset product to test full flow
    await prisma.productSync.update({
      where: { id: product.id },
      data: { 
        pineconeStatus: 'pending',
        vectorId: null,
        lastError: null
      }
    });
    
    console.log('\n🚀 Starting combined text + image embedding...');
    
    // Get business config
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    // Test the full flow with image embedding
    await productSyncService.vectorizeAndUpsertBatch('cmbsfx1qt0001tvvj7hoemk12', [product], business);
    
    console.log('\n🎉 SUCCESS! Testing new features:');
    
    // Check the updated product
    const updatedProduct = await prisma.productSync.findUnique({
      where: { id: product.id }
    });
    
    console.log('✅ Vector ID format:', updatedProduct.vectorId);
    console.log('✅ Expected format: Shopify ID only');
    console.log('✅ Match:', updatedProduct.vectorId === product.shopifyProductId ? 'YES' : 'NO');
    console.log('✅ Status:', updatedProduct.pineconeStatus);
    
    console.log('\n🔍 What was processed:');
    console.log('• Text embedding: Product title, description, category, tags, price');
    console.log('• Image embedding: AI vision analysis of product image');
    console.log('• Combined embedding: Averaged text + image for better search');
    console.log('• Vector ID: Shopify Product ID only (cleaner format)');
    console.log('• Metadata: Includes AI-generated image description');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testImageEmbedding();