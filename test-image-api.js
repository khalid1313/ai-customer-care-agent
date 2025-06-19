require('dotenv').config();

async function testImageAPI() {
  console.log('🧪 Testing Image Upload API...');
  
  // Create a test base64 image (1x1 pixel PNG)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  try {
    const response = await fetch('http://localhost:3001/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "What products does this image show?",
        image: testImageBase64,
        sessionId: 'test-image-session'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('📋 API Response:');
    console.log('Success:', data.success);
    console.log('Response:', data.response);
    console.log('Tools Called:', data.metrics?.toolsCalled || []);
    console.log('Processing Time:', data.metrics?.processingTime || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testImageAPI();