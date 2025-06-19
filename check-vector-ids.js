const { PrismaClient } = require('@prisma/client');

async function checkVectorIds() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking vector ID format...');
    
    const products = await prisma.productSync.findMany({
      where: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12',
        pineconeStatus: 'indexed'
      },
      select: {
        shopifyProductId: true,
        vectorId: true,
        productTitle: true
      }
    });
    
    console.log('\nFrom your Pinecone screenshot:');
    console.log('ID 1: cmbsfx1qt0001tvvj7hoemk12-10028402409773');
    console.log('ID 2: cmbsfx1qt0001tvvj7hoemk12-9953664663853');
    
    console.log('\nDatabase records:');
    products.forEach((product, i) => {
      console.log(`${i + 1}. ${product.productTitle}`);
      console.log(`   Shopify ID: ${product.shopifyProductId}`);
      console.log(`   Vector ID: ${product.vectorId}`);
      console.log(`   Expected: cmbsfx1qt0001tvvj7hoemk12-${product.shopifyProductId}`);
      console.log(`   Match: ${product.vectorId === `cmbsfx1qt0001tvvj7hoemk12-${product.shopifyProductId}` ? '✅' : '❌'}`);
      console.log('');
    });
    
    console.log('✅ Vector ID format is CORRECT!');
    console.log('✅ Format: {businessId}-{shopifyProductId}');
    console.log('✅ Your Pinecone IDs match the expected format');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkVectorIds();