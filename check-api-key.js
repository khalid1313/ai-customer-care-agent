const { PrismaClient } = require('@prisma/client');

async function checkApiKey() {
  const prisma = new PrismaClient();
  
  try {
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('📋 Current Pinecone API Key:');
    console.log('');
    console.log('First 40 characters:', business.pineconeApiKey.substring(0, 40) + '...');
    console.log('Last 20 characters:', '...' + business.pineconeApiKey.substring(business.pineconeApiKey.length - 20));
    console.log('Total length:', business.pineconeApiKey.length, 'characters');
    console.log('');
    console.log('Please verify this matches your Pinecone console API key.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiKey();