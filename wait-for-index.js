const { Pinecone } = require('@pinecone-database/pinecone');

async function waitForIndex() {
  const apiKey = 'pcsk_gFvtR_S3bZsori8CSs9z4zrxmnzCUi6swrdKzQz4ZgJSvuP3QXpEKzWbwHaSp6W7XuJ3U';
  const environment = 'us-east1-gcp';
  
  console.log('=== Waiting for Pinecone Index ===');
  console.log('⏳ Checking every 30 seconds for "new" index...');
  console.log('💡 Serverless indexes can take 5-15 minutes to initialize\n');
  
  let attempt = 1;
  const maxAttempts = 20; // 10 minutes max
  
  while (attempt <= maxAttempts) {
    try {
      console.log(`🔍 Attempt ${attempt}/${maxAttempts} (${new Date().toLocaleTimeString()})`);
      
      const pc = new Pinecone({ 
        apiKey: apiKey,
        environment: environment
      });
      
      const indexList = await pc.listIndexes();
      const count = indexList.indexes?.length || 0;
      
      if (count > 0) {
        console.log(`   Found ${count} index(es):`);
        
        indexList.indexes.forEach((index, i) => {
          console.log(`     ${i + 1}. ${index.name} (${index.dimension}D, ${index.metric})`);
          if (index.status) {
            console.log(`        Status: ${index.status.state || 'unknown'}`);
          }
        });
        
        const newIndex = indexList.indexes.find(i => i.name === 'new');
        if (newIndex) {
          console.log(`\n🎉 SUCCESS! "new" index is now available!`);
          console.log(`   Status: ${newIndex.status?.state || 'ready'}`);
          console.log(`   Host: ${newIndex.host || 'N/A'}`);
          
          // Test index access
          try {
            const index = pc.index('new');
            const stats = await index.describeIndexStats();
            console.log(`✅ Index access test successful!`);
            console.log(`   Dimensions: ${stats.dimension}`);
            console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
            console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).length}`);
            
            console.log('\n🚀 READY FOR PRODUCT SYNC!');
            console.log('✅ You can now test the Pinecone integration');
            
            return true;
          } catch (indexError) {
            console.log(`⚠️  Index found but not ready yet: ${indexError.message}`);
          }
        }
      } else {
        console.log(`   No indexes found yet...`);
      }
      
      if (attempt < maxAttempts) {
        console.log('   ⏳ Waiting 30 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
    } catch (error) {
      console.log(`   ❌ Connection error: ${error.message}`);
    }
    
    attempt++;
  }
  
  console.log('\n⏰ Timeout reached. Index may need more time to initialize.');
  console.log('💡 Try running this script again in a few minutes.');
  
  return false;
}

// Run immediately, then you can also call it manually
if (require.main === module) {
  waitForIndex();
}

module.exports = waitForIndex;