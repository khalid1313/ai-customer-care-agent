const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

async function createPineconeIndex() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Attempting to Create Pinecone Index ===');
    
    // Get business config
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log(`\n🎯 Target Index: "${business.pineconeIndexName}"`);
    console.log(`🌍 Environment: ${business.pineconeEnvironment}`);
    
    // Initialize Pinecone
    const pc = new Pinecone({ 
      apiKey: business.pineconeApiKey,
      environment: business.pineconeEnvironment
    });
    
    // Try to create index
    console.log('\n🔨 Creating index...');
    await pc.createIndex({
      name: business.pineconeIndexName,
      dimension: 1536, // OpenAI text-embedding-ada-002 dimension
      metric: 'cosine'
    });
    
    console.log('✅ Index created successfully!');
    
    // Wait for index to be ready
    console.log('⏳ Waiting for index to initialize...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test the new index
    console.log('🔍 Testing new index...');
    const index = pc.index(business.pineconeIndexName);
    const stats = await index.describeIndexStats();
    console.log('📊 Index Stats:', stats);
    
    console.log('\n🎉 SUCCESS! Pinecone index is ready for use');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('✅ Index already exists! This is good.');
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.log('💡 Your Pinecone plan has reached its index limit.');
      console.log('   Options:');
      console.log('   1. Delete unused indexes in Pinecone console');
      console.log('   2. Upgrade your Pinecone plan');
      console.log('   3. Use an existing index by updating the configuration');
    } else if (error.message.includes('pods')) {
      console.log('💡 Your Pinecone plan doesn\'t support additional indexes.');
      console.log('   Try using the serverless option instead.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createPineconeIndex();