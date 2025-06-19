const jwt = require('jsonwebtoken');

console.log('Please paste your current auth_token from localStorage:');
console.log('(Go to DevTools > Application > Local Storage > auth_token and copy the value)');
console.log('');
console.log('Then run: node verify-current-token.js "YOUR_TOKEN_HERE"');
console.log('');

const token = process.argv[2];

if (!token) {
  console.log('No token provided. Usage: node verify-current-token.js "YOUR_TOKEN"');
  process.exit(1);
}

try {
  const decoded = jwt.decode(token);
  console.log('Current token info:');
  console.log('- Business ID:', decoded.businessId);
  console.log('- User ID:', decoded.userId);
  console.log('- Email:', decoded.email);
  console.log('- Expires:', new Date(decoded.exp * 1000));
  console.log('');
  
  if (decoded.businessId === 'cmbsfx1qt0001tvvj7hoemk12') {
    console.log('✅ Token has CORRECT business ID');
  } else {
    console.log('❌ Token has WRONG business ID');
    console.log('Expected: cmbsfx1qt0001tvvj7hoemk12');
    console.log('Actual:', decoded.businessId);
  }
  
} catch (error) {
  console.error('Error decoding token:', error);
}