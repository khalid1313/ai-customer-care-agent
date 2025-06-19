const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

async function findMrsfcIndex() {
  const prisma = new PrismaClient();
  
  try {
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('🔍 Searching for "mrsfc" index...\n');
    
    // Test different configurations
    const configs = [
      { name: 'No environment', config: { apiKey: business.pineconeApiKey } },
      { name: 'us-east-1-aws', config: { apiKey: business.pineconeApiKey, environment: 'us-east-1-aws' } },
      { name: 'us-east1-gcp', config: { apiKey: business.pineconeApiKey, environment: 'us-east1-gcp' } },
      { name: 'us-east-1', config: { apiKey: business.pineconeApiKey, environment: 'us-east-1' } },
      { name: 'aws-us-east-1', config: { apiKey: business.pineconeApiKey, environment: 'aws-us-east-1' } },
      { name: 'gcp-starter', config: { apiKey: business.pineconeApiKey, environment: 'gcp-starter' } },
      { name: 'us-west1-gcp', config: { apiKey: business.pineconeApiKey, environment: 'us-west1-gcp' } },
      { name: 'us-central1-gcp', config: { apiKey: business.pineconeApiKey, environment: 'us-central1-gcp' } },
      { name: 'eu-west1-gcp', config: { apiKey: business.pineconeApiKey, environment: 'eu-west1-gcp' } }
    ];
    
    for (const { name, config } of configs) {
      try {
        console.log(`Testing: ${name}`);
        const pc = new Pinecone(config);
        
        const indexList = await pc.listIndexes();
        const count = indexList.indexes?.length || 0;
        
        if (count > 0) {
          console.log(`  ✅ Found ${count} indexes!`);
          
          const mrsfcIndex = indexList.indexes.find(i => i.name === 'mrsfc');
          if (mrsfcIndex) {
            console.log(`  🎯 FOUND "mrsfc" index!`);
            console.log(`     Status: ${mrsfcIndex.status?.state}`);
            console.log(`     Host: ${mrsfcIndex.host}`);
            
            // Update database with working config
            if (name !== 'No environment') {
              await prisma.business.update({
                where: { id: business.id },
                data: { pineconeEnvironment: config.environment }
              });
              console.log(`  ✅ Updated environment to: ${config.environment}`);
            } else {
              // For no environment, set to null
              await prisma.business.update({
                where: { id: business.id },
                data: { pineconeEnvironment: null }
              });
              console.log(`  ✅ Updated to use no environment (auto-detect)`);
            }
            
            // Test index access
            const index = pc.index('mrsfc');
            const stats = await index.describeIndexStats();
            console.log(`\n✅ INDEX READY!`);
            console.log(`   Dimensions: ${stats.dimension}`);
            console.log(`   Vectors: ${stats.totalVectorCount || 0}`);
            
            return true;
          }
        } else {
          console.log(`  No indexes found`);
        }
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message.substring(0, 40)}...`);
      }
    }
    
    console.log('\n⏳ Index not found yet. It may still be initializing.');
    console.log('💡 Serverless indexes can take 1-2 minutes to be accessible via API.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findMrsfcIndex();