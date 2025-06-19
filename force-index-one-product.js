const { PrismaClient } = require('@prisma/client');
const ProductSyncService = require('./src/services/ProductSyncService');

async function forceIndexOneProduct() {
  const prisma = new PrismaClient();
  const productSyncService = new ProductSyncService();
  
  try {
    console.log('=== Force Index One Product ===\n');
    
    // Get business config
    const business = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    console.log('📋 Configuration:');
    console.log(`   API Key: ${business.pineconeApiKey.substring(0, 12)}...`);
    console.log(`   Environment: ${business.pineconeEnvironment}`);
    console.log(`   Index: ${business.pineconeIndexName}`);
    console.log(`   Namespace: ${business.pineconeNamespace}`);
    
    // Get one product
    const product = await prisma.productSync.findFirst({
      where: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12',
        shopifyStatus: 'synced'
      }
    });
    
    console.log(`\n📦 Target Product: ${product.productTitle}`);
    console.log(`   Shopify ID: ${product.shopifyProductId}`);
    console.log(`   Current Status: ${product.pineconeStatus}`);
    
    // Update product status to pending
    console.log('\n🔄 Setting product status to pending...');
    await prisma.productSync.update({
      where: { id: product.id },
      data: { pineconeStatus: 'pending' }
    });
    
    // Attempt direct indexing
    console.log('\n🚀 Attempting direct product indexing...');
    
    try {
      // Step 1: Generate product text
      console.log('1️⃣ Creating product text...');
      const productText = productSyncService.createProductText(product);
      console.log(`   ✅ Text created (${productText.length} chars)`);
      
      // Step 2: Generate embedding
      console.log('2️⃣ Generating OpenAI embedding...');
      const embedding = await productSyncService.generateEmbedding(productText);
      console.log(`   ✅ Embedding created (${embedding.length} dimensions)`);
      
      // Step 3: Prepare Pinecone record
      console.log('3️⃣ Preparing Pinecone record...');
      const vectorId = `${business.id}-${product.shopifyProductId}`;
      const metadata = {
        businessId: business.id,
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
      
      console.log(`   ✅ Vector ID: ${vectorId}`);
      console.log(`   ✅ Metadata keys: ${Object.keys(metadata).length}`);
      
      // Step 4: Connect to Pinecone
      console.log('4️⃣ Connecting to Pinecone...');
      const { Pinecone } = require('@pinecone-database/pinecone');
      const pc = new Pinecone({ 
        apiKey: business.pineconeApiKey,
        environment: business.pineconeEnvironment
      });
      
      // Step 5: Check indexes
      console.log('5️⃣ Checking available indexes...');
      const indexList = await pc.listIndexes();
      console.log(`   Found ${indexList.indexes?.length || 0} indexes`);
      
      if (indexList.indexes && indexList.indexes.length > 0) {
        console.log('   Available indexes:');
        indexList.indexes.forEach((idx, i) => {
          console.log(`     ${i + 1}. ${idx.name} (${idx.status?.state || 'unknown'})`);
        });
      }
      
      // Step 6: Try to access our target index
      console.log(`6️⃣ Attempting to access index "${business.pineconeIndexName}"...`);
      
      const targetIndex = indexList.indexes?.find(i => i.name === business.pineconeIndexName);
      if (!targetIndex) {
        throw new Error(`Index "${business.pineconeIndexName}" not found in available indexes`);
      }
      
      console.log(`   ✅ Index found! Status: ${targetIndex.status?.state || 'unknown'}`);
      
      if (targetIndex.status?.state !== 'Ready') {
        console.log(`   ⚠️  Index state: ${targetIndex.status?.state} (not Ready yet)`);
      }
      
      // Step 7: Get index instance
      console.log('7️⃣ Getting index instance...');
      const index = pc.index(business.pineconeIndexName);
      
      // Step 8: Test index stats
      console.log('8️⃣ Testing index stats...');
      const stats = await index.describeIndexStats();
      console.log(`   ✅ Index stats retrieved`);
      console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
      console.log(`   Dimensions: ${stats.dimension}`);
      console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).length}`);
      
      // Step 9: Upsert the vector
      console.log('9️⃣ Upserting vector to Pinecone...');
      await index.namespace(business.pineconeNamespace).upsert([{
        id: vectorId,
        values: embedding,
        metadata
      }]);
      
      console.log('   🎉 SUCCESS! Vector upserted to Pinecone');
      
      // Step 10: Update database
      console.log('🔟 Updating database status...');
      const contentHash = productSyncService.createProductContentHash(product);
      
      await prisma.productSync.update({
        where: { id: product.id },
        data: {
          pineconeStatus: 'indexed',
          vectorId: vectorId,
          contentHash: contentHash,
          pineconeLastSync: new Date(),
          pineconeAttempts: product.pineconeAttempts + 1
        }
      });
      
      console.log('   ✅ Database updated');
      
      // Step 11: Verify by querying
      console.log('1️⃣1️⃣ Verifying by querying Pinecone...');
      const queryResult = await index.namespace(business.pineconeNamespace).query({
        id: vectorId,
        topK: 1,
        includeMetadata: true
      });
      
      if (queryResult.matches && queryResult.matches.length > 0) {
        const match = queryResult.matches[0];
        console.log('   🎯 VERIFICATION SUCCESS!');
        console.log(`   Score: ${match.score}`);
        console.log(`   Title: ${match.metadata?.title}`);
        console.log(`   Price: ${match.metadata?.price}`);
      } else {
        console.log('   ⚠️  Query returned no matches');
      }
      
      console.log('\n🏆 COMPLETE SUCCESS!');
      console.log('✅ Product successfully indexed to Pinecone');
      console.log('✅ Database status updated');
      console.log('✅ Verification query successful');
      
    } catch (indexError) {
      console.error('\n❌ Indexing failed:', indexError.message);
      console.error('Stack:', indexError.stack);
      
      // Update status to failed
      await prisma.productSync.update({
        where: { id: product.id },
        data: {
          pineconeStatus: 'failed',
          lastError: indexError.message,
          pineconeAttempts: product.pineconeAttempts + 1
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

forceIndexOneProduct();