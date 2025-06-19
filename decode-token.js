const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWJ1NnZ1OG4wMDAybHk3Ymk3ZDd4ZXR0IiwiYnVzaW5lc3NJZCI6ImNtYnU2dnU1bzAwMDBseTdicHhiNXJ5aDgiLCJlbWFpbCI6ImtoYWxpZEBjbGlja3kucGsiLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3NDk3OTY2MjQsImV4cCI6MTc1MDQwMTQyNH0.ekNq8eGAb-doWjLWi7ad1h2Rqa_hj2mzAdDdPXvHh4E';

try {
  const decoded = jwt.decode(token);
  console.log('Decoded JWT token:');
  console.log(JSON.stringify(decoded, null, 2));
  console.log('\nKey info:');
  console.log('- User ID:', decoded.userId);
  console.log('- Business ID:', decoded.businessId);
  console.log('- Email:', decoded.email);
  console.log('- Role:', decoded.role);
  
  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  console.log('\nToken status:');
  console.log('- Issued at:', new Date(decoded.iat * 1000));
  console.log('- Expires at:', new Date(decoded.exp * 1000));
  console.log('- Is expired:', now > decoded.exp);
  
} catch (error) {
  console.error('Error decoding token:', error);
}