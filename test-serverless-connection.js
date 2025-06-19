const { Pinecone } = require('@pinecone-database/pinecone');

async function testServerlessConnection() {
  const apiKey = 'pcsk_gFvtR_S3bZsori8CSs9z4zrxmnzCUi6swrdKzQz4ZgJSvuP3QXpEKzWbwHaSp6W7XuJ3U';
  
  console.log('=== Testing Serverless Connection ===');
  console.log(`API Key: ${apiKey.substring(0, 12)}...`);
  
  try {
    console.log('\n🧪 Method 1: Without environment (newer SDK style)');
    const pc1 = new Pinecone({ apiKey });
    const indexList1 = await pc1.listIndexes();
    console.log(`   Found ${indexList1.indexes?.length || 0} indexes`);
    
    if (indexList1.indexes && indexList1.indexes.length > 0) {
      indexList1.indexes.forEach((index, i) => {
        console.log(`   ${i + 1}. ${index.name} (${index.dimension}D, ${index.metric})`);
        console.log(`      Host: ${index.host || 'N/A'}`);
      });
      
      const newIndex = indexList1.indexes.find(i => i.name === 'new');
      if (newIndex) {
        console.log(`\n🎯 Found "new" index!`);
        console.log(`   Status: ${newIndex.status?.state || 'Unknown'}`);
        console.log(`   Host: ${newIndex.host}`);
        
        // Test actual connection to the index
        console.log('\n🔍 Testing index access...');
        const index = pc1.index('new');
        const stats = await index.describeIndexStats();
        console.log('✅ Index access successful!');
        console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
        console.log(`   Dimensions: ${stats.dimension}`);
        
        return true;
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Method 1 failed: ${error.message}`);
  }
  
  try {
    console.log('\n🧪 Method 2: With environment');
    const pc2 = new Pinecone({ 
      apiKey,
      environment: 'us-east1-gcp'
    });
    const indexList2 = await pc2.listIndexes();
    console.log(`   Found ${indexList2.indexes?.length || 0} indexes`);
    
  } catch (error) {
    console.log(`   ❌ Method 2 failed: ${error.message}`);
  }
  
  console.log('\n⏳ If no indexes found, the serverless index might still be initializing.');
  console.log('💡 Serverless indexes can take 5-10 minutes to become available.');
  
  return false;
}

testServerlessConnection();