const { PrismaClient } = require('@prisma/client');
const ProductSyncService = require('./src/services/ProductSyncService');

async function debugSyncCrash() {
  const prisma = new PrismaClient();
  const productSyncService = new ProductSyncService();
  
  try {
    console.log('=== Debug Sync Crash ===');
    
    // Check business config
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('\n📋 Configuration Check:');
    console.log(`   API Key: ${business.pineconeApiKey ? 'Set' : 'Missing'}`);
    console.log(`   Environment: ${business.pineconeEnvironment || 'Missing'}`);
    console.log(`   Namespace: ${business.pineconeNamespace || 'Missing'}`);
    console.log(`   Index: ${business.pineconeIndexName || 'Missing'}`);
    
    // Check if all required fields are present
    const hasAllFields = !!(business.pineconeApiKey && business.pineconeEnvironment && business.pineconeNamespace && business.pineconeIndexName);
    console.log(`   Complete: ${hasAllFields ? '✅' : '❌'}`);
    
    if (!hasAllFields) {
      console.log('\n❌ Missing required Pinecone configuration fields');
      return;
    }
    
    // Check products to sync
    const products = await prisma.productSync.findMany({
      where: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12',
        shopifyStatus: 'synced',
        pineconeStatus: { 
          in: ['not_configured', 'failed', 'pending'] 
        }
      },
      take: 1 // Just test with 1 product
    });
    
    console.log(`\n📦 Products to sync: ${products.length}`);
    
    if (products.length === 0) {
      console.log('❌ No products available for sync');
      return;
    }
    
    console.log('📝 Sample product:', products[0].productTitle);
    
    // Test Pinecone connection manually
    console.log('\n🔌 Testing Pinecone connection...');
    const { Pinecone } = require('@pinecone-database/pinecone');
    
    const pc = new Pinecone({ 
      apiKey: business.pineconeApiKey,
      environment: business.pineconeEnvironment
    });
    
    const indexList = await pc.listIndexes();
    console.log(`   Available indexes: ${indexList.indexes?.length || 0}`);
    
    // Try actual sync with error handling
    console.log('\n🚀 Starting manual sync with detailed logging...');
    
    try {
      await productSyncService.manualPineconeSync('cmbsfx1qt0001tvvj7hoemk12', [products[0].id]);
      console.log('✅ Sync completed successfully');
    } catch (syncError) {
      console.log('❌ Sync failed:', syncError.message);
      console.log('📄 Full error:', syncError.stack);
      
      // Check sync status after error
      const status = productSyncService.getSyncStatus('cmbsfx1qt0001tvvj7hoemk12');
      console.log('📊 Sync status after error:', status);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('📄 Full error:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugSyncCrash();