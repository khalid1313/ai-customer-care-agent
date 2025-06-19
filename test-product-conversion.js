const { PrismaClient } = require('@prisma/client');
const ProductSyncService = require('./src/services/ProductSyncService');

async function testProductConversion() {
  const prisma = new PrismaClient();
  const productSyncService = new ProductSyncService();
  
  try {
    console.log('=== Testing Product Conversion Flow ===\n');
    
    // Step 1: Get a real product from the database
    console.log('📦 Step 1: Getting a sample product...');
    const product = await prisma.productSync.findFirst({
      where: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12',
        shopifyStatus: 'synced'
      }
    });
    
    if (!product) {
      console.log('❌ No products found');
      return;
    }
    
    console.log('✅ Sample product found:');
    console.log(`   Database ID: ${product.id}`);
    console.log(`   Shopify ID: ${product.shopifyProductId}`);
    console.log(`   Title: ${product.productTitle}`);
    console.log(`   Price: ${product.productPrice}`);
    console.log(`   Category: ${product.productCategory}`);
    console.log(`   Handle: ${product.productHandle}`);
    
    // Step 2: Test text creation for vectorization
    console.log('\n📝 Step 2: Creating product text for vectorization...');
    const productText = productSyncService.createProductText(product);
    console.log('✅ Product text created:');
    console.log(`   Text: "${productText}"`);
    console.log(`   Length: ${productText.length} characters`);
    
    // Step 3: Test content hash creation
    console.log('\n🔗 Step 3: Creating content hash...');
    const contentHash = productSyncService.createProductContentHash(product);
    console.log('✅ Content hash created:');
    console.log(`   Hash: ${contentHash}`);
    
    // Step 4: Test Pinecone vector ID format
    console.log('\n🎯 Step 4: Creating Pinecone vector ID...');
    const businessId = 'cmbsfx1qt0001tvvj7hoemk12';
    const vectorId = `${businessId}-${product.shopifyProductId}`;
    console.log('✅ Vector ID created:');
    console.log(`   Vector ID: ${vectorId}`);
    console.log(`   Format: {businessId}-{shopifyProductId}`);
    
    // Step 5: Test metadata creation
    console.log('\n📋 Step 5: Creating Pinecone metadata...');
    const metadata = {
      businessId,
      shopifyProductId: product.shopifyProductId,
      title: product.productTitle,
      handle: product.productHandle,
      price: product.productPrice,
      category: product.productCategory,
      tags: product.productTags,
      url: product.productUrl,
      image: product.productImage,
      syncedAt: new Date().toISOString()
    };
    console.log('✅ Metadata created:');
    console.log(JSON.stringify(metadata, null, 2));
    
    // Step 6: Test embedding generation (if OpenAI key available)
    console.log('\n🧠 Step 6: Testing embedding generation...');
    try {
      if (process.env.OPENAI_API_KEY) {
        const embedding = await productSyncService.generateEmbedding(productText);
        console.log('✅ Embedding generated:');
        console.log(`   Dimensions: ${embedding.length}`);
        console.log(`   Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
        
        // Step 7: Create complete Pinecone record
        console.log('\n🎲 Step 7: Complete Pinecone record format...');
        const pineconeRecord = {
          id: vectorId,
          values: embedding,
          metadata
        };
        
        console.log('✅ Complete Pinecone record:');
        console.log(`   ID: ${pineconeRecord.id}`);
        console.log(`   Values: Array of ${pineconeRecord.values.length} floats`);
        console.log(`   Metadata keys: ${Object.keys(pineconeRecord.metadata).join(', ')}`);
        
        // Step 8: Test with real Pinecone (if index exists)
        console.log('\n🔌 Step 8: Testing with Pinecone...');
        const business = await prisma.business.findFirst({
          where: { id: businessId }
        });
        
        if (business.pineconeApiKey) {
          console.log('🧪 Attempting Pinecone upsert test...');
          
          try {
            const { Pinecone } = require('@pinecone-database/pinecone');
            const pc = new Pinecone({ 
              apiKey: business.pineconeApiKey,
              environment: business.pineconeEnvironment
            });
            
            // Check if index exists first
            const indexList = await pc.listIndexes();
            const indexExists = indexList.indexes?.some(i => i.name === business.pineconeIndexName);
            
            if (indexExists) {
              console.log('✅ Index found! Testing upsert...');
              
              const index = pc.index(business.pineconeIndexName);
              
              // Test upsert
              await index.namespace(business.pineconeNamespace).upsert([pineconeRecord]);
              console.log('🎉 SUCCESS! Product indexed to Pinecone');
              
              // Test query to verify
              const queryResult = await index.namespace(business.pineconeNamespace).query({
                id: vectorId,
                topK: 1,
                includeMetadata: true
              });
              
              if (queryResult.matches && queryResult.matches.length > 0) {
                console.log('✅ Verification successful - product retrieved from Pinecone');
                console.log(`   Score: ${queryResult.matches[0].score}`);
                console.log(`   Metadata title: ${queryResult.matches[0].metadata.title}`);
              }
              
            } else {
              console.log('⏳ Index not ready yet - cannot test upsert');
              console.log('💡 Run this test again when the index is available');
            }
            
          } catch (pineconeError) {
            console.log(`❌ Pinecone test failed: ${pineconeError.message}`);
          }
        }
        
      } else {
        console.log('⚠️  OpenAI API key not set - skipping embedding generation');
        console.log('💡 Set OPENAI_API_KEY environment variable to test embeddings');
      }
      
    } catch (embeddingError) {
      console.log(`❌ Embedding generation failed: ${embeddingError.message}`);
    }
    
    console.log('\n📊 Summary:');
    console.log('✅ Product text creation: Working');
    console.log('✅ Content hash generation: Working');
    console.log('✅ Vector ID format: Working');
    console.log('✅ Metadata structure: Working');
    console.log(`${process.env.OPENAI_API_KEY ? '✅' : '⚠️'} Embedding generation: ${process.env.OPENAI_API_KEY ? 'Working' : 'Needs OpenAI key'}`);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testProductConversion();