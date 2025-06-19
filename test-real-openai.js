const ProductSyncService = require('./src/services/ProductSyncService');
const { PrismaClient } = require('@prisma/client');

async function testRealOpenAI() {
  const prisma = new PrismaClient();
  const productSyncService = new ProductSyncService();
  
  try {
    console.log('🧪 Testing with real OpenAI embeddings...');
    
    // Find a different product to test with
    const products = await prisma.productSync.findMany({
      where: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12',
        shopifyStatus: 'synced'
      },
      take: 2
    });
    
    if (products.length > 1) {
      // Use the second product
      const testProduct = products[1];
      
      console.log('Testing product:', testProduct.productTitle);
      
      // Reset it to pending to test full flow
      await prisma.productSync.update({
        where: { id: testProduct.id },
        data: { 
          pineconeStatus: 'pending',
          vectorId: null,
          lastError: null
        }
      });
      
      console.log('Reset product to pending status');
      
      // Get business config
      const business = await prisma.business.findFirst({
        where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
      });
      
      console.log('Starting vectorization with real OpenAI...');
      
      // Test the full flow
      await productSyncService.vectorizeAndUpsertBatch('cmbsfx1qt0001tvvj7hoemk12', [testProduct], business);
      
      console.log('🎉 SUCCESS! Product indexed with real OpenAI embeddings');
      
      // Check the updated status
      const updatedProduct = await prisma.productSync.findUnique({
        where: { id: testProduct.id }
      });
      
      console.log('Updated status:', updatedProduct.pineconeStatus);
      console.log('Vector ID:', updatedProduct.vectorId);
      
    } else {
      console.log('Not enough products found to test');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testRealOpenAI();