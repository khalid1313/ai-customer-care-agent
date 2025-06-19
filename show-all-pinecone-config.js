const { PrismaClient } = require('@prisma/client');

async function showAllPineconeConfig() {
  const prisma = new PrismaClient();
  
  try {
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('📋 COMPLETE PINECONE CONFIGURATION:');
    console.log('=====================================\n');
    
    console.log('1. API Key:');
    console.log('   Full key:', business.pineconeApiKey);
    console.log('');
    
    console.log('2. Environment:');
    console.log('   Current setting:', business.pineconeEnvironment);
    console.log('');
    
    console.log('3. Index Name:');
    console.log('   Target index:', business.pineconeIndexName);
    console.log('');
    
    console.log('4. Namespace:');
    console.log('   Namespace:', business.pineconeNamespace);
    console.log('');
    
    console.log('5. Business ID:');
    console.log('   ID:', business.id);
    console.log('');
    
    console.log('6. OpenAI Configuration:');
    console.log('   API Key stored:', business.openaiApiKey ? 'Yes' : 'No');
    if (business.openaiApiKey) {
      console.log('   OpenAI Key prefix:', business.openaiApiKey.substring(0, 20) + '...');
    }
    console.log('');
    
    console.log('7. Other Settings:');
    console.log('   Business Name:', business.name);
    console.log('   Created:', business.createdAt);
    console.log('   Updated:', business.updatedAt);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showAllPineconeConfig();