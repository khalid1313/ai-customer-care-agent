require('dotenv').config();

async function testImageUploadFixed() {
  console.log('🧪 Testing Fixed Image Upload...');
  
  // Create a small test base64 image (1x1 pixel PNG)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  try {
    console.log('🔧 SKIP_VISION_API:', process.env.SKIP_VISION_API);
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    
    const response = await fetch('http://localhost:3001/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "What is this product?",
        image: testImageBase64,
        sessionId: 'test-fixed-image-session'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('📋 API Response:');
    console.log('✅ Success:', data.success);
    console.log('💬 Response:', data.response);
    console.log('🔧 Tools Called:', data.metrics?.toolsCalled || []);
    console.log('⏱️ Processing Time:', data.metrics?.processingTime || 0);
    console.log('🧠 Reasoning:', data.reasoning);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testImageUploadFixed();