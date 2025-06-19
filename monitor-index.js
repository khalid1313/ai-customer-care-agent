const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');

async function monitorIndex() {
  const prisma = new PrismaClient();
  
  try {
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('🔍 Monitoring for "mrsfc" index...');
    console.log('   Will check every 15 seconds');
    console.log('   Press Ctrl+C to stop\n');
    
    const checkIndex = async () => {
      const environments = ['us-east1-gcp', 'us-west1-gcp', 'us-central1-gcp', 'us-east-1-aws', 'gcp-starter'];
      
      for (const env of environments) {
        try {
          const pc = new Pinecone({ 
            apiKey: business.pineconeApiKey,
            environment: env
          });
          
          const indexList = await pc.listIndexes();
          if (indexList.indexes?.length > 0) {
            const mrsfcIndex = indexList.indexes.find(i => i.name === 'mrsfc');
            if (mrsfcIndex) {
              console.log(`\n🎉 FOUND "mrsfc" INDEX!`);
              console.log(`   Environment: ${env}`);
              console.log(`   Status: ${mrsfcIndex.status?.state}`);
              console.log(`   Host: ${mrsfcIndex.host}`);
              
              // Update database
              await prisma.business.update({
                where: { id: business.id },
                data: { pineconeEnvironment: env }
              });
              
              console.log(`\n✅ Updated database with environment: ${env}`);
              console.log('🚀 Ready to index products!');
              
              await prisma.$disconnect();
              process.exit(0);
            }
          }
        } catch (error) {
          // Silent fail, continue checking
        }
      }
      
      console.log(`[${new Date().toLocaleTimeString()}] Still checking...`);
    };
    
    // Check immediately
    await checkIndex();
    
    // Then check every 15 seconds
    setInterval(checkIndex, 15000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
  }
}

monitorIndex();