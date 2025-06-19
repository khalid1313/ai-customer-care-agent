const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

async function testUpdatedPinecone() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Testing Updated Pinecone Configuration ===');
    
    // Get updated business config
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('\n📋 Current Configuration:');
    console.log(`   API Key: ${business.pineconeApiKey.substring(0, 12)}...`);
    console.log(`   Environment: ${business.pineconeEnvironment}`);
    console.log(`   Namespace: ${business.pineconeNamespace}`);
    console.log(`   Index Name: ${business.pineconeIndexName}`);
    
    // Test connection
    console.log('\n🔌 Testing Pinecone Connection...');
    const pc = new Pinecone({ 
      apiKey: business.pineconeApiKey,
      environment: business.pineconeEnvironment
    });
    
    // List available indexes
    console.log('📡 Fetching available indexes...');
    const indexList = await pc.listIndexes();
    console.log(`   Found ${indexList.indexes?.length || 0} indexes:`);
    
    if (indexList.indexes && indexList.indexes.length > 0) {
      indexList.indexes.forEach((index, i) => {
        console.log(`   ${i + 1}. ${index.name} (${index.dimension} dimensions, ${index.metric} metric)`);
      });
    } else {
      console.log('   (No indexes found)');
    }
    
    // Check if our target index exists
    const targetIndex = business.pineconeIndexName;
    const indexExists = indexList.indexes?.some(i => i.name === targetIndex);
    
    console.log(`\n🎯 Target Index "${targetIndex}": ${indexExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    if (indexExists) {
      console.log('🔍 Testing index connection...');
      const index = pc.index(targetIndex);
      const stats = await index.describeIndexStats();
      console.log('📊 Index Stats:');
      console.log(`   Total Vectors: ${stats.totalVectorCount || 0}`);
      console.log(`   Dimension: ${stats.dimension || 'Unknown'}`);
      console.log('   Namespaces:', Object.keys(stats.namespaces || {}));
      
      console.log('\n🎉 SUCCESS: Pinecone integration is fully working!');
      console.log('✅ You can now run product sync');
    } else {
      console.log('\n⚠️  Index not found. Available options:');
      console.log('   1. Create an index named "' + targetIndex + '" in Pinecone console');
      console.log('   2. Update the configuration to use an existing index');
    }
    
  } catch (error) {
    console.error('\n❌ Connection Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('💡 Tip: Check your Pinecone API key is correct');
    } else if (error.message.includes('environment')) {
      console.log('💡 Tip: Check your Pinecone environment is correct');
    } else if (error.message.includes('project')) {
      console.log('💡 Tip: Make sure your Pinecone project has available resources');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testUpdatedPinecone();