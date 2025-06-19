const axios = require('axios');

async function testScraping() {
  try {
    console.log('🧪 Testing scraping functionality...\n');

    // First, login to get auth token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'khalid@clicky.pk',
      password: 'password123'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const authToken = loginResponse.data.data.token;
    console.log('✅ Logged in successfully\n');

    // Test scraping with a simple website
    console.log('2. Testing scraping with example.com...');
    const scrapingResponse = await axios.post('http://localhost:3001/api/scraping/test', {
      url: 'https://example.com'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (scrapingResponse.data.success) {
      const { discoveryResult, testPages, summary } = scrapingResponse.data.data;
      
      console.log('✅ Scraping test successful!\n');
      console.log('📊 Discovery Results:');
      console.log(`   Total pages found: ${summary.totalPagesFound}`);
      console.log(`   Categories found: ${summary.categoriesFound}`);
      console.log(`   Pages tested successfully: ${summary.pagesTestedSuccessfully}`);
      console.log(`   Average content quality: ${(summary.averageQuality * 100).toFixed(1)}%\n`);
      
      console.log('📋 Page Categories:');
      Object.entries(discoveryResult.pages).forEach(([category, pages]) => {
        if (pages.length > 0) {
          console.log(`   ${category}: ${pages.length} pages`);
        }
      });

      console.log('\n🔍 Test Scraping Results:');
      testPages.forEach(page => {
        console.log(`   ${page.category}: ${page.url}`);
        console.log(`   Status: ${page.status}`);
        if (page.contentQuality) {
          console.log(`   Quality: ${(page.contentQuality * 100).toFixed(1)}%`);
        }
        if (page.extractedData) {
          console.log(`   Title: ${page.extractedData.title || 'No title'}`);
          console.log(`   Content length: ${page.extractedData.content?.text?.length || 0} chars`);
        }
        console.log('');
      });

    } else {
      console.log('❌ Scraping test failed:', scrapingResponse.data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testScraping();