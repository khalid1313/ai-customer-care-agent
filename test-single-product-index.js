const { PrismaClient } = require('@prisma/client');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

async function testSingleProductIndex() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Testing Single Product Index ===\n');
    
    // Get business config
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('📋 Configuration:');
    console.log(`   API Key: ${business.pineconeApiKey.substring(0, 12)}...`);
    console.log(`   Environment: ${business.pineconeEnvironment}`);
    console.log(`   Index: ${business.pineconeIndexName}`);
    console.log(`   Namespace: ${business.pineconeNamespace}`);
    
    // Create dummy product
    const dummyProduct = {
      businessId: business.id,
      shopifyProductId: 'test-111-earrings',
      productTitle: '111 Angel Number Stud Earrings - 111 / Pair / Gold',
      productHandle: '111-angel-number-stud-earrings',
      productDescription: 'Beautiful gold angel number stud earrings featuring the number 111. Perfect for spiritual jewelry lovers.',
      productPrice: '29.99',
      productCategory: 'Jewelry',
      productTags: 'angel numbers,spiritual,gold,earrings,111',
      productUrl: 'https://example.com/products/111-angel-number-stud-earrings',
      productImage: 'https://example.com/images/111-earrings.jpg',
      productStatus: 'active',
      inventoryTracked: false,
      shopifyStatus: 'synced',
      pineconeStatus: 'pending'
    };
    
    console.log('\n📦 Updating test product...');
    const product = await prisma.productSync.upsert({
      where: {
        businessId_shopifyProductId: {
          businessId: business.id,
          shopifyProductId: 'test-111-earrings'
        }
      },
      update: dummyProduct,
      create: dummyProduct
    });
    
    console.log('✅ Test product updated:', product.productTitle);
    
    // Initialize OpenAI for embeddings
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Generate embedding
    console.log('\n🧮 Generating embedding...');
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${product.productTitle} ${product.productDescription} ${product.productCategory} ${product.productTags}`,
      encoding_format: "float"
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    console.log(`✅ Embedding generated (${embedding.length} dimensions)`);
    
    // Initialize Pinecone
    console.log('\n🔌 Connecting to Pinecone...');
    const pc = new Pinecone({ 
      apiKey: business.pineconeApiKey,
      environment: business.pineconeEnvironment
    });
    
    // Get index
    const index = pc.index(business.pineconeIndexName);
    
    // Prepare metadata
    const metadata = {
      businessId: product.businessId,
      shopifyProductId: product.shopifyProductId,
      title: product.productTitle,
      handle: product.productHandle,
      description: product.productDescription,
      price: product.productPrice,
      category: product.productCategory,
      tags: product.productTags,
      url: product.productUrl,
      image: product.productImage,
      syncedAt: new Date().toISOString()
    };
    
    // Prepare vector
    const vectorId = `${product.businessId}-${product.shopifyProductId}`;
    const vector = {
      id: vectorId,
      values: embedding,
      metadata
    };
    
    console.log('\n📤 Upserting to Pinecone...');
    console.log(`   Vector ID: ${vectorId}`);
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   Metadata fields: ${Object.keys(metadata).length}`);
    
    // Upsert to Pinecone
    await index.namespace(business.pineconeNamespace).upsert([vector]);
    console.log('✅ Vector upserted successfully');
    
    // Update product status
    await prisma.productSync.update({
      where: { id: product.id },
      data: {
        pineconeStatus: 'indexed',
        vectorId: vectorId,
        pineconeLastSync: new Date(),
        pineconeAttempts: 1
      }
    });
    
    // Verify by querying
    console.log('\n🔍 Verifying with test query...');
    const queryResult = await index.namespace(business.pineconeNamespace).query({
      vector: embedding,
      topK: 1,
      includeMetadata: true
    });
    
    if (queryResult.matches && queryResult.matches.length > 0) {
      const match = queryResult.matches[0];
      console.log('✅ Verification successful!');
      console.log(`   Score: ${match.score}`);
      console.log(`   Title: ${match.metadata?.title}`);
      console.log(`   Price: ${match.metadata?.price}`);
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSingleProductIndex(); 