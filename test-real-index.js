const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

async function testRealIndex() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Testing Real Pinecone Index ===');
    
    // Get business config
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('\n📋 Configuration:');
    console.log(`   Index Name: ${business.pineconeIndexName}`);
    console.log(`   Environment: ${business.pineconeEnvironment}`);
    console.log(`   Namespace: ${business.pineconeNamespace}`);
    
    // Test connection
    console.log('\n🔌 Testing connection...');
    const pc = new Pinecone({ 
      apiKey: business.pineconeApiKey,
      environment: business.pineconeEnvironment
    });
    
    // List indexes
    const indexList = await pc.listIndexes();
    console.log(`📡 Available indexes: ${indexList.indexes?.length || 0}`);
    
    if (indexList.indexes && indexList.indexes.length > 0) {
      indexList.indexes.forEach((index, i) => {
        console.log(`   ${i + 1}. ${index.name} (${index.dimension}D, ${index.metric})`);
      });
    }
    
    // Check if our target index exists
    const targetExists = indexList.indexes?.some(i => i.name === business.pineconeIndexName);
    console.log(`\n🎯 Target index "${business.pineconeIndexName}": ${targetExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    if (targetExists) {
      console.log('\n🔍 Testing index access...');
      const index = pc.index(business.pineconeIndexName);
      const stats = await index.describeIndexStats();
      
      console.log('📊 Index stats:');
      console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
      console.log(`   Dimensions: ${stats.dimension || 'Unknown'}`);
      console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).length || 0}`);
      
      console.log('\n🚀 READY TO SYNC!');
      console.log('✅ You can now test the product sync');
      
      // Test a small upsert to verify write access
      console.log('\n🧪 Testing write access...');
      try {
        await index.namespace(business.pineconeNamespace).upsert([{
          id: 'test-vector',
          values: Array(1536).fill(0.1),
          metadata: { test: true, timestamp: new Date().toISOString() }
        }]);
        console.log('✅ Write test successful');
        
        // Clean up test vector
        await index.namespace(business.pineconeNamespace).deleteOne('test-vector');
        console.log('✅ Cleanup successful');
        
      } catch (writeError) {
        console.log('❌ Write test failed:', writeError.message);
      }
      
    } else {
      console.log('\n⚠️  Please create the index with these settings:');
      console.log(`   Name: ${business.pineconeIndexName}`);
      console.log('   Dimensions: 1536');
      console.log('   Metric: cosine');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRealIndex();