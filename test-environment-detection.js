const { Pinecone } = require('@pinecone-database/pinecone');

async function testEnvironments() {
  const apiKey = 'pcsk_gFvtR_S3bZsori8CSs9z4zrxmnzCUi6swrdKzQz4ZgJSvuP3QXpEKzWbwHaSp6W7XuJ3U';
  
  // Different environment formats to try
  const environments = [
    'us-east1-gcp',  // Current setting
    'us-east-1',     // From screenshot
    'gcp-starter',   // Common free tier
    'us-central1-gcp',
    'us-west1-gcp'
  ];
  
  console.log('=== Testing Different Environments ===');
  console.log(`API Key: ${apiKey.substring(0, 12)}...`);
  
  for (const env of environments) {
    try {
      console.log(`\n🧪 Testing environment: ${env}`);
      
      const pc = new Pinecone({ 
        apiKey: apiKey,
        environment: env
      });
      
      const indexList = await pc.listIndexes();
      console.log(`   ✅ Success! Found ${indexList.indexes?.length || 0} indexes`);
      
      if (indexList.indexes && indexList.indexes.length > 0) {
        indexList.indexes.forEach((index, i) => {
          console.log(`   ${i + 1}. ${index.name} (${index.dimension}D, ${index.metric})`);
        });
        
        // If we found the "new" index, this is the correct environment
        const hasNewIndex = indexList.indexes.some(i => i.name === 'new');
        if (hasNewIndex) {
          console.log(`   🎯 FOUND "new" index! Correct environment: ${env}`);
          return env;
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n❓ None of the common environments worked. The index might still be initializing.');
  return null;
}

testEnvironments().then(correctEnv => {
  if (correctEnv) {
    console.log(`\n✅ Use this environment: ${correctEnv}`);
  } else {
    console.log('\n⏳ Index might still be initializing. Try again in a few minutes.');
  }
});