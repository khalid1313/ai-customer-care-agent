const ProductSyncService = require('./src/services/ProductSyncService');
const { PrismaClient } = require('@prisma/client');

async function testHardcodedSync() {
  const prisma = new PrismaClient();
  const productSyncService = new ProductSyncService();
  
  try {
    console.log('🧪 Testing ProductSyncService with hardcoded config...');
    
    // Get a sample product
    const product = await prisma.productSync.findFirst({
      where: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12',
        shopifyStatus: 'synced'
      }
    });
    
    console.log('Found product:', product.productTitle);
    
    // Get business (won't use the credentials, but needed for structure)
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    // Try the hardcoded sync
    console.log('Attempting sync with hardcoded credentials...');
    await productSyncService.vectorizeAndUpsertBatch('cmbsfx1qt0001tvvj7hoemk12', [product], business);
    
    console.log('🎉 SUCCESS!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testHardcodedSync();