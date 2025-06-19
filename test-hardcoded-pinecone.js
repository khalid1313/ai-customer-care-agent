const { Pinecone } = require('@pinecone-database/pinecone');

async function testHardcodedPinecone() {
  console.log('🔧 Testing hardcoded Pinecone configuration...');
  
  // Test all possible environments with the working API key
  const environments = [
    'us-east1-gcp',
    'us-west1-gcp', 
    'us-central1-gcp',
    'us-east-1-aws',
    'us-west-2-aws',
    'eu-west1-gcp',
    'asia-northeast1-gcp',
    'gcp-starter'
  ];
  
  const apiKey = 'pcsk_5maRBX_2AyaTs6eQrsHnHbZDqVHeZgMKHU2p8GVTvM62iSiLy9F24zNiofKVrtXyynTRLh';
  
  for (const env of environments) {
    try {
      console.log(`\nTesting environment: ${env}`);
      
      const pc = new Pinecone({ 
        apiKey: apiKey,
        environment: env
      });
      
      const indexList = await pc.listIndexes();
      const count = indexList.indexes?.length || 0;
      
      if (count > 0) {
        console.log(`✅ Found ${count} indexes!`);
        
        indexList.indexes.forEach(idx => {
          console.log(`  - ${idx.name} (status: ${idx.status?.state})`);
        });
        
        const mrsfcIndex = indexList.indexes.find(i => i.name === 'mrsfc');
        if (mrsfcIndex) {
          console.log(`\n🎯 FOUND "mrsfc" INDEX!`);
          console.log(`   Environment: ${env}`);
          console.log(`   Status: ${mrsfcIndex.status?.state}`);
          console.log(`   Dimensions: ${mrsfcIndex.dimension}`);
          
          // Test index access
          const index = pc.index('mrsfc');
          const stats = await index.describeIndexStats();
          console.log(`\n✅ Index accessible!`);
          console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
          console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).length}`);
          
          if (stats.namespaces && stats.namespaces.mrsfc) {
            console.log(`   Vectors in 'mrsfc' namespace: ${stats.namespaces.mrsfc.vectorCount || 0}`);
          }
          
          console.log(`\n🚀 CORRECT ENVIRONMENT: ${env}`);
          console.log(`🚀 Ready to update ProductSyncService!`);
          
          return { env, index: mrsfcIndex, stats };
        }
      } else {
        console.log('  No indexes found');
      }
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message.substring(0, 40)}...`);
    }
  }
  
  console.log('\n❌ Index not found in any environment');
  console.log('💡 This means the API key might be from a different project');
}

testHardcodedPinecone();