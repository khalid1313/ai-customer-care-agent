const { Pinecone } = require('@pinecone-database/pinecone');

async function quickIndexCheck() {
  const apiKey = 'pcsk_gFvtR_S3bZsori8CSs9z4zrxmnzCUi6swrdKzQz4ZgJSvuP3QXpEKzWbwHaSp6W7XuJ3U';
  const environment = 'us-east1-gcp';
  
  console.log('=== Quick Index Check ===');
  console.log(`Time: ${new Date().toLocaleTimeString()}`);
  
  try {
    const pc = new Pinecone({ 
      apiKey: apiKey,
      environment: environment
    });
    
    const indexList = await pc.listIndexes();
    const count = indexList.indexes?.length || 0;
    
    console.log(`📡 Found ${count} indexes`);
    
    if (count > 0) {
      console.log('🎉 Indexes are now available!');
      
      indexList.indexes.forEach((index, i) => {
        console.log(`   ${i + 1}. ${index.name}`);
        console.log(`      Dimensions: ${index.dimension}`);
        console.log(`      Metric: ${index.metric}`);
        console.log(`      Status: ${index.status?.state || 'unknown'}`);
        if (index.host) {
          console.log(`      Host: ${index.host}`);
        }
      });
      
      // Check if "new" index exists
      const newIndex = indexList.indexes.find(i => i.name === 'new');
      if (newIndex) {
        console.log(`\n✅ "new" index found and ready!`);
        
        // Test actual access
        const index = pc.index('new');
        const stats = await index.describeIndexStats();
        console.log(`📊 Stats: ${stats.totalVectorCount || 0} vectors, ${stats.dimension}D`);
        
        console.log('\n🚀 READY TO SYNC PRODUCTS!');
        return true;
      } else {
        console.log('\n❓ "new" index not found in the list');
      }
    } else {
      console.log('⏳ Still waiting for indexes to appear...');
      console.log('💡 Serverless indexes can take 5-15 minutes to initialize');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  return false;
}

quickIndexCheck();