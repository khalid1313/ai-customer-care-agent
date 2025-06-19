const { PrismaClient } = require('@prisma/client');

async function updateToWorkingApiKey() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Updating to the API key that works with Python project...');
    
    await prisma.business.update({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' },
      data: { 
        pineconeApiKey: 'pcsk_5maRBX_2AyaTs6eQrsHnHbZDqVHeZgMKHU2p8GVTvM62iSiLy9F24zNiofKVrtXyynTRLh',
        pineconeEnvironment: 'us-east1-gcp'
      }
    });
    
    console.log('✅ Updated API key to match Python project');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateToWorkingApiKey();