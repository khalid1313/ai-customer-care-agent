const axios = require('axios');

async function testRegistration() {
  try {
    console.log('Testing registration...');
    
    const testData = {
      firstName: 'Khalid',
      lastName: 'Khan',
      email: 'khalid@clicky.pk',
      password: 'test123456',
      businessName: 'Clicky Pk'
    };
    
    console.log('Sending registration request with data:', {
      ...testData,
      password: '***'
    });
    
    const response = await axios.post('http://localhost:3003/api/auth/register', testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Registration successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Registration failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('StatusText:', error.response.statusText);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Request details:');
      console.error('URL:', error.config?.url);
      console.error('Method:', error.config?.method);
      console.error('Error Code:', error.code);
    } else {
      console.error('Error:', error.message);
    }
    console.error('Full error:', error);
  }
}

testRegistration();