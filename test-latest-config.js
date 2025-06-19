const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

async function testLatestConfig() {
  const prisma = new PrismaClient();
  
  try {
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('🔑 Testing with latest configuration...');
    console.log('   API Key prefix:', business.pineconeApiKey.substring(0, 15) + '...');
    console.log('   Current environment:', business.pineconeEnvironment);
    console.log('   Target index:', business.pineconeIndexName);
    
    // Test common environments
    const environments = [
      'us-east1-gcp',
      'us-west1-gcp', 
      'us-central1-gcp',
      'us-east-1-aws',
      'us-west-2-aws',
      'gcp-starter',
      'eu-west1-gcp',
      'asia-northeast1-gcp'
    ];
    
    console.log('\n🔍 Searching for indexes...\n');
    
    for (const env of environments) {
      try {
        process.stdout.write(`Testing ${env}... `);
        
        const pc = new Pinecone({ 
          apiKey: business.pineconeApiKey,
          environment: env
        });
        
        const indexList = await pc.listIndexes();
        const count = indexList.indexes?.length || 0;
        
        if (count > 0) {
          console.log(`✅ Found ${count} indexes!`);
          
          indexList.indexes.forEach(idx => {
            console.log(`  - ${idx.name} (${idx.status?.state})`);
          });
          
          const targetIndex = indexList.indexes.find(i => i.name === business.pineconeIndexName);
          if (targetIndex) {
            console.log(`\n🎯 FOUND "${business.pineconeIndexName}" INDEX!`);
            console.log(`   Environment: ${env}`);
            console.log(`   Status: ${targetIndex.status?.state}`);
            console.log(`   Dimensions: ${targetIndex.dimension}`);
            
            // Test access
            const index = pc.index(business.pineconeIndexName);
            const stats = await index.describeIndexStats();
            console.log(`\n✅ Index accessible!`);
            console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
            
            // Update database
            if (business.pineconeEnvironment !== env) {
              await prisma.business.update({
                where: { id: business.id },
                data: { pineconeEnvironment: env }
              });
              console.log(`\n✅ Updated environment to: ${env}`);
            }
            
            console.log('\n🚀 READY TO INDEX PRODUCTS!');
            await prisma.$disconnect();
            return;
          }
        } else {
          console.log('No indexes');
        }
      } catch (error) {
        console.log(`Failed: ${error.message.substring(0, 30)}...`);
      }
    }
    
    console.log('\n⏳ Index not found in any environment.');
    console.log('\n💡 Please check:');
    console.log('1. Is the index created and showing as "Ready" in Pinecone console?');
    console.log('2. Is this API key from the same Pinecone project where you created the index?');
    console.log('3. What cloud/region did you select when creating the index?');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLatestConfig();