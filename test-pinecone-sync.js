const { PrismaClient } = require('@prisma/client');
const ProductSyncService = require('./src/services/ProductSyncService');

async function testSync() {
  const prisma = new PrismaClient();
  const productSyncService = new ProductSyncService();
  
  try {
    console.log('Testing Pinecone sync...');
    
    // Get a business
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('Business found:', !!business);
    console.log('Pinecone API Key:', business.pineconeApiKey ? 'Set' : 'Not set');
    console.log('Pinecone Namespace:', business.pineconeNamespace);
    console.log('Pinecone Index:', business.pineconeIndexName);
    
    // Get some products
    const products = await prisma.productSync.findMany({
      where: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12',
        shopifyStatus: 'synced',
        pineconeStatus: 'pending'
      },
      take: 3
    });
    
    console.log('Products found:', products.length);
    
    if (products.length > 0) {
      console.log('Sample product:', {
        title: products[0].productTitle,
        status: products[0].pineconeStatus
      });
    }
    
    // Test manual sync
    console.log('Starting manual sync...');
    await productSyncService.manualPineconeSync('cmbsfx1qt0001tvvj7hoemk12');
    console.log('Manual sync completed');
    
  } catch (error) {
    console.error('Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();