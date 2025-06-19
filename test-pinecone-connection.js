const { Pinecone } = require('@pinecone-database/pinecone');
const { PrismaClient } = require('@prisma/client');

async function testPineconeConnection() {
  const prisma = new PrismaClient();
  
  try {
    // Get business with Pinecone config
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('Business config:');
    console.log('- API Key:', business.pineconeApiKey ? 'Set' : 'Not set');
    console.log('- Environment:', business.pineconeEnvironment);
    console.log('- Index Name:', business.pineconeIndexName);
    console.log('- Namespace:', business.pineconeNamespace);
    
    if (!business.pineconeApiKey) {
      throw new Error('Pinecone API key not set');
    }
    
    // Test Pinecone connection
    console.log('\nTesting Pinecone connection...');
    const pc = new Pinecone({ 
      apiKey: business.pineconeApiKey,
      environment: business.pineconeEnvironment
    });
    
    const indexList = await pc.listIndexes();
    const count = indexList.indexes?.length || 0;
    
    console.log(`📡 Found ${count} indexes`);
    
    if (count > 0) {
      console.log('🎉 Indexes are now available!');
      
      indexList.indexes.forEach((index, i) => {
        console.log(`   ${i + 1}. ${index.name}`);
        console.log(`      Dimensions: ${index.dimension}`);
        console.log(`      Metric: ${index.metric}`);
        console.log(`      Status: ${index.status?.state || 'unknown'}`);
        if (index.host) {
          console.log(`      Host: ${index.host}`);
        }
      });
    } else {
      console.log('⏳ No indexes found.');
    }
    
    // Check if index exists
    const indexExists = indexList.indexes?.some(i => i.name === business.pineconeIndexName);
    console.log(`Index '${business.pineconeIndexName}' exists:`, indexExists);
    
    if (!indexExists) {
      console.log('Index does not exist. Creating index...');
      try {
        await pc.createIndex({
          name: business.pineconeIndexName,
          dimension: 1536, // OpenAI text-embedding-ada-002 dimension
          metric: 'cosine'
        });
        console.log('Index created successfully!');
        
        // Wait a bit for index to be ready
        console.log('Waiting for index to be ready...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (createError) {
        console.error('Failed to create index:', createError.message);
        return;
      }
    }
    
    console.log('Testing index connection...');
    const index = pc.index(business.pineconeIndexName);
    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);
    
  } catch (error) {
    console.error('Test error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testPineconeConnection();