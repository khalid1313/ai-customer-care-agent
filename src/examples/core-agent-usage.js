const CoreAIAgent = require('../agents/CoreAIAgent');

// Example: How to use the Core AI Agent

async function main() {
  // Create agent for a specific business
  const businessId = 'your-business-id'; // Replace with actual business ID
  const agent = new CoreAIAgent(businessId);
  
  // Initialize the agent
  await agent.initialize();
  
  console.log('Core AI Agent ready!');
  
  // Example 1: Text-based product search
  const response1 = await agent.chat('Show me wireless headphones');
  console.log('Response 1:', response1.response);
  
  // Example 2: Check stock
  const response2 = await agent.chat('Is the Sony WH-1000XM4 in stock?');
  console.log('Response 2:', response2.response);
  
  // Example 3: Track order
  const response3 = await agent.chat('Track order ORD-2024-001');
  console.log('Response 3:', response3.response);
  
  // Example 4: Multi-modal (with image)
  const response4 = await agent.chat('Find products similar to this', {
    image: 'base64_encoded_image_data_here'
  });
  console.log('Response 4:', response4.response);
  
  // Example 5: Support question
  const response5 = await agent.chat('What is your return policy?');
  console.log('Response 5:', response5.response);
}

// Run the example
main().catch(console.error);

/* 
API Usage Example:

POST /api/ai-chat
{
  "message": "Find me wireless headphones",
  "sessionId": "user-session-123",
  "businessId": "business-123"
}

Response:
{
  "response": "I found these wireless headphones for you:\n• Sony WH-1000XM4 - $299.99 ✅ In Stock\n• Apple AirPods Pro - $249.99 ✅ In Stock",
  "success": true
}
*/