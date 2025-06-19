const axios = require('axios');

async function testFullFlow() {
  try {
    console.log('Testing full registration and authentication flow...\n');
    
    // Generate unique email for testing
    const timestamp = Date.now();
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      email: `test${timestamp}@example.com`,
      password: 'test123456',
      businessName: `Test Business ${timestamp}`
    };
    
    console.log('1. Testing registration...');
    console.log('Data:', { ...testData, password: '***' });
    
    const registerResponse = await axios.post('http://localhost:3003/api/auth/register', testData, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Registration successful!');
    console.log('User ID:', registerResponse.data.data.user.id);
    console.log('Business ID:', registerResponse.data.data.business.id);
    console.log('Token:', registerResponse.data.data.token.substring(0, 20) + '...');
    
    const token = registerResponse.data.data.token;
    
    // Test authentication
    console.log('\n2. Testing authentication with token...');
    
    const meResponse = await axios.get('http://localhost:3003/api/auth/me', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Authentication successful!');
    console.log('Authenticated user:', meResponse.data.data.user);
    console.log('Business:', meResponse.data.data.business);
    
    // Test login
    console.log('\n3. Testing login...');
    
    const loginResponse = await axios.post('http://localhost:3003/api/auth/login', {
      email: testData.email,
      password: testData.password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Login successful!');
    console.log('Login token:', loginResponse.data.data.token.substring(0, 20) + '...');
    
    console.log('\n✅ All tests passed! User should be able to access the dashboard.');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

// First, ensure server is running
console.log('Checking if server is running...');
axios.get('http://localhost:3003/health')
  .then(() => {
    console.log('✅ Server is running\n');
    testFullFlow();
  })
  .catch(() => {
    console.error('❌ Server is not running! Please start the backend server first.');
    console.error('Run: node src/server.js');
  });