const { Pinecone } = require('@pinecone-database/pinecone');

async function testServerlessEnvironments() {
  const apiKey = 'pcsk_gFvtR_S3bZsori8CSs9z4zrxmnzCUi6swrdKzQz4ZgJSvuP3QXpEKzWbwHaSp6W7XuJ3U';
  
  // Try serverless-specific environments
  const serverlessEnvironments = [
    'us-east1-gcp',      // Current
    'us-east-1-aws',     // Serverless AWS format
    'aws-us-east-1',     // Alternative AWS format  
    'serverless',        // Generic serverless
    'gcp-starter',       // Starter environment
    'us-central1-gcp',   // Alternative GCP
    'us-west4-gcp'       // Alternative GCP
  ];
  
  console.log('=== Testing Serverless Environments ===');
  console.log('Looking for the "new" index...\n');
  
  for (const env of serverlessEnvironments) {
    try {
      console.log(`🧪 Testing: ${env}`);
      
      const pc = new Pinecone({ 
        apiKey: apiKey,
        environment: env
      });
      
      const indexList = await pc.listIndexes();
      const count = indexList.indexes?.length || 0;
      console.log(`   Connection: ✅ (${count} indexes)`);
      
      if (indexList.indexes && indexList.indexes.length > 0) {
        console.log('   Indexes found:');
        indexList.indexes.forEach((index, i) => {
          console.log(`     ${i + 1}. ${index.name} (${index.dimension}D)`);
        });
        
        const hasNewIndex = indexList.indexes.some(i => i.name === 'new');
        if (hasNewIndex) {
          console.log(`\n🎉 SUCCESS! Found "new" index in environment: ${env}`);
          
          // Test index access
          const index = pc.index('new');
          const stats = await index.describeIndexStats();
          console.log(`✅ Index stats: ${stats.totalVectorCount || 0} vectors`);
          
          return env;
        }
      }
      
    } catch (error) {
      console.log(`   Connection: ❌ ${error.message.substring(0, 50)}...`);
    }
  }
  
  console.log('\n⏳ Index not found in any environment.');
  console.log('💡 Possible reasons:');
  console.log('   1. Index still initializing (can take 5-10 minutes)');
  console.log('   2. Different Pinecone project/account');
  console.log('   3. API key permissions issue');
  
  return null;
}

testServerlessEnvironments();