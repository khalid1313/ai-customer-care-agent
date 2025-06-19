require('dotenv').config();

async function testAIOrderTracking() {
  console.log('🤖 Testing AI Agent with Order Tracking...');
  
  try {
    const response = await fetch('http://localhost:3001/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "Can you track my order ORD-2024-001?",
        sessionId: 'test-order-tracking-session'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('📋 AI Response:');
    console.log('✅ Success:', data.success);
    console.log('💬 Response Preview:', data.response.substring(0, 300) + '...');
    console.log('🔧 Tools Called:', data.metrics?.toolsCalled || []);
    console.log('⏱️ Processing Time:', data.metrics?.processingTime || 0);
    console.log('🧠 Reasoning:', data.reasoning?.slice(-3) || []); // Last 3 reasoning steps
    
    // Test with email search
    console.log('\n🔍 Testing email search...');
    const emailResponse = await fetch('http://localhost:3001/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "I need to track orders for john.smith@email.com",
        sessionId: 'test-email-tracking-session'
      })
    });
    
    const emailData = await emailResponse.json();
    console.log('📧 Email Search Success:', emailData.success);
    console.log('💬 Email Response Preview:', emailData.response.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAIOrderTracking();