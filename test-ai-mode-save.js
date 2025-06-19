const fetch = require('node-fetch');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWJzZngxcXcwMDAzdHZ2anhzczcza3o4IiwiYnVzaW5lc3NJZCI6ImNtYnNmeDFxdDAwMDF0dnZqN2hvZW1rMTIiLCJlbWFpbCI6ImtoYWxpZEBjbGlja3kucGsiLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3NDk3OTY4NDcsImV4cCI6MTc1MDQwMTY0N30.3cY-h1lofXEgtS8s0GaqREeIj07WjVG7Ei96ywmM19Q';

async function testAiModeSave() {
  try {
    console.log('Testing AI Mode save...');
    
    const response = await fetch('http://localhost:3001/api/settings/ai-mode', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        aiModeEnabled: true
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success response:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error response:');
      console.log(errorText);
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testAiModeSave();