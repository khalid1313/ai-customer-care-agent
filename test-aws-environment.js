const { Pinecone } = require('@pinecone-database/pinecone');

async function testAwsEnvironment() {
  const apiKey = 'pcsk_gFvtR_S3bZsori8CSs9z4zrxmnzCUi6swrdKzQz4ZgJSvuP3QXpEKzWbwHaSp6W7XuJ3U';
  
  console.log('=== Testing AWS-based Environment ===\n');
  console.log('🔍 Your screenshot shows:');
  console.log('   Cloud: AWS');
  console.log('   Region: us-east-1');
  console.log('   Type: Serverless');
  console.log('   Host: new-wf22zac.svc.aped-4627-b74a.pinecone.io\n');
  
  // For serverless indexes on AWS, the environment might be different
  const awsEnvironments = [
    'us-east1-gcp',     // Current setting
    'us-east-1',        // Direct region
    'aws-us-east-1',    // AWS prefix
    'us-east-1-aws',    // AWS suffix
    'serverless',       // Generic
    'default'           // Default
  ];
  
  for (const env of awsEnvironments) {
    try {
      console.log(`🧪 Testing environment: ${env}`);
      
      const pc = new Pinecone({ 
        apiKey: apiKey,
        environment: env
      });
      
      const indexList = await pc.listIndexes();
      const count = indexList.indexes?.length || 0;
      console.log(`   Connection: ✅ (${count} indexes)`);
      
      if (count > 0) {
        console.log('   📋 Found indexes:');
        indexList.indexes.forEach((index, i) => {
          console.log(`     ${i + 1}. ${index.name}`);
          console.log(`        Status: ${index.status?.state || 'unknown'}`);
          console.log(`        Host: ${index.host || 'N/A'}`);
        });
        
        const newIndex = indexList.indexes.find(i => i.name === 'new');
        if (newIndex) {
          console.log(`\n🎯 FOUND "new" INDEX!`);
          console.log(`   ✅ Correct environment: ${env}`);
          console.log(`   Status: ${newIndex.status?.state}`);
          console.log(`   Host: ${newIndex.host}`);
          
          // Test index access
          try {
            const index = pc.index('new');
            const stats = await index.describeIndexStats();
            console.log(`   ✅ Index access successful!`);
            console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
            console.log(`   Dimensions: ${stats.dimension}`);
            
            console.log(`\n🚀 READY TO UPDATE CONFIGURATION!`);
            console.log(`   Update pineconeEnvironment to: "${env}"`);
            
            return env;
            
          } catch (accessError) {
            console.log(`   ❌ Index access failed: ${accessError.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`   Connection: ❌ ${error.message.substring(0, 50)}...`);
    }
    
    console.log('');
  }
  
  console.log('❓ Index not found in any tested environment.');
  console.log('💡 The index might still be propagating across Pinecone\'s infrastructure.');
  
  return null;
}

testAwsEnvironment();