const { Pinecone } = require('@pinecone-database/pinecone');

async function checkPineconeProject() {
  const apiKey = 'pcsk_gFvtR_S3bZsori8CSs9z4zrxmnzCUi6swrdKzQz4ZgJSvuP3QXpEKzWbwHaSp6W7XuJ3U';
  
  console.log('=== Comprehensive Pinecone Project Check ===\n');
  
  // Try different approaches for newer SDK versions
  const approaches = [
    { name: 'Current Config', env: 'us-east1-gcp' },
    { name: 'No Environment', env: null },
    { name: 'US East 1 AWS', env: 'us-east-1-aws' },
    { name: 'GCP Starter', env: 'gcp-starter' },
    { name: 'US Central 1', env: 'us-central1-gcp' },
    { name: 'Default/Auto', env: 'default' }
  ];
  
  for (const approach of approaches) {
    try {
      console.log(`🧪 Testing: ${approach.name}`);
      
      const config = { apiKey };
      if (approach.env) {
        config.environment = approach.env;
      }
      
      const pc = new Pinecone(config);
      
      console.log('   🔌 Connection attempt...');
      const indexList = await pc.listIndexes();
      
      const count = indexList.indexes?.length || 0;
      console.log(`   ✅ SUCCESS! Found ${count} indexes`);
      
      if (count > 0) {
        console.log('   📋 Available indexes:');
        indexList.indexes.forEach((index, i) => {
          console.log(`     ${i + 1}. ${index.name}`);
          console.log(`        Dimensions: ${index.dimension}`);
          console.log(`        Metric: ${index.metric}`);
          console.log(`        Status: ${index.status?.state || 'unknown'}`);
          if (index.host) {
            console.log(`        Host: ${index.host}`);
          }
        });
        
        // Check for our target index
        const newIndex = indexList.indexes.find(i => i.name === 'new');
        if (newIndex) {
          console.log(`\n🎯 FOUND TARGET INDEX "new"!`);
          console.log(`   Environment that works: ${approach.env || 'no environment'}`);
          console.log(`   Status: ${newIndex.status?.state}`);
          
          // Test index access
          console.log('   🔍 Testing index access...');
          const index = pc.index('new');
          const stats = await index.describeIndexStats();
          console.log(`   ✅ Index access successful!`);
          console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
          console.log(`   Dimensions: ${stats.dimension}`);
          
          return approach.env;
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message.substring(0, 60)}...`);
      console.log('');
    }
  }
  
  console.log('⏳ No indexes found in any environment.');
  console.log('💡 This suggests the serverless index is still initializing.');
  console.log('🕐 Serverless indexes can take 10-20 minutes on first creation.');
  
  // Check the Pinecone SDK version
  try {
    const packageJson = require('@pinecone-database/pinecone/package.json');
    console.log(`\n📦 Pinecone SDK Version: ${packageJson.version}`);
  } catch (e) {
    console.log('\n📦 Could not determine Pinecone SDK version');
  }
  
  return null;
}

checkPineconeProject();