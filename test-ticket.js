const axios = require('axios');

async function testTicketCreation() {
  try {
    // Test the AI chat endpoint with refund request
    console.log('Testing AI chat endpoint with refund request...');
    
    const chatResponse = await axios.post('http://localhost:3001/api/ai-chat', {
      message: 'I want a refund please',
      sessionId: 'test-session-123',
      businessId: 'test-business-123',
      source: 'test'
    });
    
    console.log('\n=== Chat Response ===');
    console.log('Response:', chatResponse.data.response);
    console.log('Tools Used:', chatResponse.data.toolsUsed);
    console.log('Reasoning:', chatResponse.data.reasoning);
    
    // Also test with different refund phrases
    console.log('\n\nTesting with "money back" phrase...');
    
    const chatResponse2 = await axios.post('http://localhost:3001/api/ai-chat', {
      message: 'give me my money back',
      sessionId: 'test-session-456',
      businessId: 'test-business-123',
      source: 'test'
    });
    
    console.log('\n=== Second Response ===');
    console.log('Response:', chatResponse2.data.response);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data?.details) {
      console.error('Validation errors:', JSON.stringify(error.response.data.details, null, 2));
    }
  }
}

// Direct test of CreateTicketTool
async function testDirectTicketCreation() {
  try {
    console.log('\n\n=== Testing Direct Ticket Creation ===');
    
    const CreateTicketTool = require('./src/tools/CreateTicketTool');
    const ticketTool = new CreateTicketTool('test-business-123');
    
    ticketTool.setConversationContext({
      conversationId: 'test-conv-123',
      customerId: 'test-customer-123',
      customerName: 'Test Customer',
      customerEmail: 'test@example.com'
    });
    
    const ticketData = {
      priority: 'high',
      category: 'refund',
      title: 'Refund Request - Test',
      description: 'Customer requesting refund for test purposes',
      customerImpact: 'Testing ticket creation',
      suggestedAction: 'Process test refund'
    };
    
    const result = await ticketTool.getTool().func(JSON.stringify(ticketData));
    console.log('Direct Ticket Creation Result:\n', result);
    
  } catch (error) {
    console.error('Direct ticket creation error:', error.message);
  }
}

async function runTests() {
  await testTicketCreation();
  await testDirectTicketCreation();
}

runTests();