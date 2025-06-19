const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

async function testNewIndex() {
  const prisma = new PrismaClient();
  
  try {
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('📋 Current Backend Configuration:');
    console.log('   Index Name:', business.pineconeIndexName);
    console.log('   Namespace:', business.pineconeNamespace);
    console.log('   Environment:', business.pineconeEnvironment);
    
    // Test connection
    console.log('\n🔌 Testing connection to Pinecone...');
    const pc = new Pinecone({ 
      apiKey: business.pineconeApiKey,
      environment: business.pineconeEnvironment
    });
    
    const indexList = await pc.listIndexes();
    console.log('\n✅ Connection successful!');
    console.log('Available indexes:', indexList.indexes?.map(i => i.name) || []);
    
    // Check if mrsfc exists
    const mrsfcIndex = indexList.indexes?.find(i => i.name === 'mrsfc');
    if (mrsfcIndex) {
      console.log('\n🎯 Found "mrsfc" index!');
      console.log('   Status:', mrsfcIndex.status?.state);
      console.log('   Dimensions:', mrsfcIndex.dimension);
      console.log('   Metric:', mrsfcIndex.metric);
      
      // Test index access
      const index = pc.index('mrsfc');
      const stats = await index.describeIndexStats();
      console.log('\n✅ Index access successful!');
      console.log('   Total vectors:', stats.totalVectorCount || 0);
      console.log('   Ready for indexing!');
      
      if (business.pineconeIndexName !== 'mrsfc') {
        console.log('\n⚠️  Backend has different index name:', business.pineconeIndexName);
        console.log('   Updating to "mrsfc"...');
        
        await prisma.business.update({
          where: { id: business.id },
          data: { 
            pineconeIndexName: 'mrsfc',
            pineconeNamespace: 'mrsfc'
          }
        });
        
        console.log('   ✅ Updated backend configuration!');
      } else {
        console.log('\n✅ Backend configuration matches!');
      }
      
      console.log('\n🚀 READY TO INDEX PRODUCTS!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testNewIndex();