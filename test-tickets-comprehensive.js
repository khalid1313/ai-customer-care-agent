const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const BUSINESS_ID = 'test-business-123';

// Test scenarios for different ticket types
const testScenarios = [
  {
    name: 'Refund Request',
    message: 'I want my money back for this purchase',
    expectedCategory: 'refund',
    expectedPriority: 'HIGH'
  },
  {
    name: 'Return Request',
    message: 'I want to return this product',
    expectedCategory: 'return',
    expectedPriority: 'NORMAL'
  },
  {
    name: 'Defective Product',
    message: 'This item is broken and not working',
    expectedCategory: 'product_issue',
    expectedPriority: 'HIGH'
  },
  {
    name: 'Shipping Issue',
    message: 'My package is late and missing',
    expectedCategory: 'shipping',
    expectedPriority: 'NORMAL'
  },
  {
    name: 'Billing Problem',
    message: 'I was charged wrong amount',
    expectedCategory: 'billing',
    expectedPriority: 'NORMAL'
  },
  {
    name: 'Manager Escalation',
    message: 'This is unacceptable, I need a supervisor',
    expectedCategory: 'general',
    expectedPriority: 'HIGH'
  }
];

async function runComprehensiveTicketTests() {
  console.log('🎯 Starting Comprehensive Ticket System Tests\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Ticket Creation for Each Category
  console.log('📝 Test 1: Ticket Creation for Each Category');
  console.log('=' .repeat(50));
  
  for (const scenario of testScenarios) {
    totalTests++;
    try {
      console.log(`\n🔹 Testing: ${scenario.name}`);
      console.log(`   Message: "${scenario.message}"`);
      
      const response = await axios.post(`${BASE_URL}/api/ai-chat`, {
        message: scenario.message,
        sessionId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        businessId: BUSINESS_ID,
        source: 'test'
      });
      
      if (response.data.success && response.data.response.includes('Support Ticket Created')) {
        // Extract ticket number from response
        const ticketMatch = response.data.response.match(/Ticket ID:\*\* (TK-\d{8}-\d{3})/);
        const ticketNumber = ticketMatch ? ticketMatch[1] : 'Unknown';
        
        console.log(`   ✅ Ticket created: ${ticketNumber}`);
        
        // Verify the ticket details
        const ticketsResponse = await axios.get(`${BASE_URL}/api/tickets/${BUSINESS_ID}`);
        const createdTicket = ticketsResponse.data.data.tickets.find(t => t.ticketNumber === ticketNumber);
        
        if (createdTicket) {
          const categoryMatch = createdTicket.category === scenario.expectedCategory;
          const priorityMatch = createdTicket.priority === scenario.expectedPriority;
          
          console.log(`   📋 Category: ${createdTicket.category} ${categoryMatch ? '✅' : '❌'}`);
          console.log(`   ⚡ Priority: ${createdTicket.priority} ${priorityMatch ? '✅' : '❌'}`);
          console.log(`   📅 SLA: ${createdTicket.timeRemaining}`);
          
          if (categoryMatch && priorityMatch) {
            passedTests++;
            console.log(`   🎉 ${scenario.name} test PASSED`);
          } else {
            console.log(`   💥 ${scenario.name} test FAILED`);
          }
        } else {
          console.log(`   💥 Could not find created ticket`);
        }
      } else {
        console.log(`   💥 Failed to create ticket: ${response.data.response || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
  }
  
  // Test 2: Ticket API Endpoints
  console.log('\n\n📊 Test 2: Ticket API Endpoints');
  console.log('=' .repeat(50));
  
  totalTests++;
  try {
    console.log('\n🔹 Testing: Get All Tickets');
    const allTicketsResponse = await axios.get(`${BASE_URL}/api/tickets/${BUSINESS_ID}`);
    
    if (allTicketsResponse.data.success) {
      const ticketCount = allTicketsResponse.data.data.tickets.length;
      console.log(`   ✅ Retrieved ${ticketCount} tickets`);
      passedTests++;
    } else {
      console.log(`   💥 Failed to get tickets`);
    }
  } catch (error) {
    console.log(`   💥 Error getting tickets: ${error.message}`);
  }
  
  totalTests++;
  try {
    console.log('\n🔹 Testing: Get Ticket Statistics');
    const statsResponse = await axios.get(`${BASE_URL}/api/tickets/${BUSINESS_ID}/stats`);
    
    if (statsResponse.data.success) {
      const stats = statsResponse.data.data;
      console.log(`   ✅ Statistics: ${stats.total} total, ${stats.open} open, ${stats.inProgress} in progress`);
      passedTests++;
    } else {
      console.log(`   💥 Failed to get statistics`);
    }
  } catch (error) {
    console.log(`   💥 Error getting statistics: ${error.message}`);
  }
  
  // Test 3: Ticket Status Updates
  console.log('\n\n🔄 Test 3: Ticket Status Updates');
  console.log('=' .repeat(50));
  
  totalTests++;
  try {
    console.log('\n🔹 Testing: Update Ticket Status');
    
    // Get the first ticket
    const ticketsResponse = await axios.get(`${BASE_URL}/api/tickets/${BUSINESS_ID}`);
    const firstTicket = ticketsResponse.data.data.tickets[0];
    
    if (firstTicket) {
      const updateResponse = await axios.put(`${BASE_URL}/api/tickets/${firstTicket.id}/status`, {
        status: 'RESOLVED'
      });
      
      if (updateResponse.data.success) {
        console.log(`   ✅ Updated ticket ${firstTicket.ticketNumber} to RESOLVED`);
        passedTests++;
      } else {
        console.log(`   💥 Failed to update ticket status`);
      }
    } else {
      console.log(`   💥 No tickets found to update`);
    }
  } catch (error) {
    console.log(`   💥 Error updating ticket: ${error.message}`);
  }
  
  // Test 4: SLA Validation
  console.log('\n\n⏰ Test 4: SLA Validation');
  console.log('=' .repeat(50));
  
  totalTests++;
  try {
    console.log('\n🔹 Testing: SLA Calculations');
    const ticketsResponse = await axios.get(`${BASE_URL}/api/tickets/${BUSINESS_ID}`);
    const tickets = ticketsResponse.data.data.tickets;
    
    const slaValidation = {
      refund: { expectedHours: 4, found: false },
      return: { expectedHours: 48, found: false },
      product_issue: { expectedHours: 8, found: false },
      shipping: { expectedHours: 24, found: false }
    };
    
    let slaCorrect = 0;
    let slaTotal = 0;
    
    tickets.forEach(ticket => {
      if (slaValidation[ticket.category]) {
        slaTotal++;
        const slaDeadline = new Date(ticket.slaDeadline);
        const createdAt = new Date(ticket.createdAt);
        const hoursDiff = (slaDeadline - createdAt) / (1000 * 60 * 60);
        
        if (Math.abs(hoursDiff - slaValidation[ticket.category].expectedHours) < 1) {
          slaCorrect++;
          slaValidation[ticket.category].found = true;
        }
        
        console.log(`   📋 ${ticket.category} ticket: ${Math.round(hoursDiff)}h SLA ${Math.abs(hoursDiff - slaValidation[ticket.category].expectedHours) < 1 ? '✅' : '❌'}`);
      }
    });
    
    if (slaCorrect === slaTotal && slaTotal > 0) {
      console.log(`   ✅ All SLA calculations correct (${slaCorrect}/${slaTotal})`);
      passedTests++;
    } else {
      console.log(`   💥 SLA validation failed (${slaCorrect}/${slaTotal})`);
    }
  } catch (error) {
    console.log(`   💥 Error validating SLA: ${error.message}`);
  }
  
  // Test Summary
  console.log('\n\n📊 Test Summary');
  console.log('=' .repeat(50));
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests PASSED! Ticket system is working perfectly!');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
  }
  
  return { passed: passedTests, total: totalTests };
}

// Run the tests
runComprehensiveTicketTests()
  .then(results => {
    process.exit(results.passed === results.total ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });