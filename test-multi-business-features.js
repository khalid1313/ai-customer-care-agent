const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:3004/api';
const BUSINESS_ID = 'cmbsfx1qt0001tvvj7hoemk12'; // From your backend log

console.log('=================================');
console.log('Multi-Business Features Demo');
console.log('=================================\n');

async function demonstrateFeatures() {
  try {
    // 1. Get Business Details
    console.log('1. Getting business details...');
    const businessResponse = await axios.get(`${API_BASE}/business/${BUSINESS_ID}`);
    console.log('✅ Business:', businessResponse.data.business.name);
    console.log('   Email:', businessResponse.data.business.email);
    console.log('   Integrations:', businessResponse.data.business.integrations.status);
    console.log('');

    // 2. Shopify Integration Example
    console.log('2. Shopify Integration (Example):');
    console.log('   To connect Shopify, POST to:');
    console.log(`   ${API_BASE}/business/${BUSINESS_ID}/integrations/shopify`);
    console.log('   With body:');
    console.log('   {');
    console.log('     "domain": "your-store.myshopify.com",');
    console.log('     "accessToken": "shpat_xxxxxxxxxxxxx"');
    console.log('   }');
    console.log('');

    // 3. Pinecone Integration Example
    console.log('3. Pinecone Integration (Example):');
    console.log('   To connect Pinecone, POST to:');
    console.log(`   ${API_BASE}/business/${BUSINESS_ID}/integrations/pinecone`);
    console.log('   With body:');
    console.log('   {');
    console.log('     "namespace": "your-business-namespace",');
    console.log('     "indexName": "products-index"');
    console.log('   }');
    console.log('');

    // 4. Product Sync Example
    console.log('4. Product Sync (After Shopify is connected):');
    console.log('   To sync products, POST to:');
    console.log(`   ${API_BASE}/business/${BUSINESS_ID}/sync/products`);
    console.log('');

    // 5. How AI Tools Use Business Context
    console.log('5. AI Tools with Business Context:');
    console.log('   When a chat session starts, the AI automatically:');
    console.log('   - Loads business context using BusinessContextLoader');
    console.log('   - Switches to Shopify API if connected');
    console.log('   - Uses Pinecone for semantic search if available');
    console.log('   - Falls back to database/static files if not');
    console.log('');

    // 6. Testing in Playground
    console.log('6. Testing in Playground:');
    console.log('   1. Go to http://localhost:3000/playground2');
    console.log('   2. Send a message like "Show me your products"');
    console.log('   3. The AI will use:');
    console.log('      - Shopify API if connected (live data)');
    console.log('      - Database products if not');
    console.log('   4. Check the backend logs to see data source');
    console.log('');

    // 7. UI Access
    console.log('7. Access via UI:');
    console.log('   1. Login at http://localhost:3000/login');
    console.log('   2. Navigate to Integrations page');
    console.log('   3. Connect Shopify/Pinecone using the UI');
    console.log('   4. Sync products with one click');
    console.log('');

    console.log('=================================');
    console.log('Summary of Multi-Business Features:');
    console.log('=================================');
    console.log('✅ Multi-tenant database schema');
    console.log('✅ Business-aware AI tools');
    console.log('✅ Shopify integration for live products');
    console.log('✅ Pinecone integration for vector search');
    console.log('✅ API endpoints for management');
    console.log('✅ UI for easy configuration');
    console.log('✅ Automatic data source switching');
    console.log('✅ Session-based business context');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

demonstrateFeatures();