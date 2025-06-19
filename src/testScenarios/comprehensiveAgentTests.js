// Comprehensive Agent Performance Test Scenarios
// These test cases cover various aspects of agent capabilities including:
// - Product knowledge and search
// - Order management and tracking
// - Complex multi-step interactions
// - Memory and context retention
// - Tool usage accuracy
// - Ambiguous query handling
// - Customer emotion handling
// - Cross-selling and upselling
// - Technical support scenarios
// - Return and refund processes

export const testScenarios = [
  {
    id: 'price-comparison-shopping',
    name: 'Price Comparison Shopping',
    category: 'Product Search',
    difficulty: 'Medium',
    description: 'Customer comparing multiple products with budget constraints',
    expectedTools: ['ProductSearchTool', 'ProductAvailabilityTool', 'ProductRecommendationTool'],
    expectedContextSwitches: 2,
    conversation: [
      {
        role: 'user',
        content: "I need a good gaming mouse under $100. What are my options?"
      },
      {
        role: 'user',
        content: "How does the ErgoGrip compare to the gaming mouse in terms of features?"
      },
      {
        role: 'user',
        content: "Actually, can you show me all mice you have, including the expensive ones?"
      },
      {
        role: 'user',
        content: "What's the return policy if I don't like it?"
      }
    ]
  },
  {
    id: 'order-delay-investigation',
    name: 'Order Delay Investigation',
    category: 'Order Management',
    difficulty: 'High',
    description: 'Customer with delayed order requiring investigation and resolution',
    expectedTools: ['OrderTrackingTool', 'ShippingTool', 'CustomerSupportTool'],
    expectedContextSwitches: 3,
    conversation: [
      {
        role: 'user',
        content: "My order ORD-2024-001 was supposed to arrive yesterday but didn't. What's going on?"
      },
      {
        role: 'user',
        content: "The tracking shows it's been stuck in the same location for 3 days. This is unacceptable!"
      },
      {
        role: 'user',
        content: "I need this for a presentation tomorrow. Can you expedite shipping or send a replacement?"
      },
      {
        role: 'user',
        content: "If it doesn't arrive by tomorrow, I want a full refund. How do I proceed?"
      }
    ]
  },
  {
    id: 'ambiguous-product-inquiry',
    name: 'Ambiguous Product Inquiry',
    category: 'Product Search',
    difficulty: 'High',
    description: 'Customer using vague descriptions requiring clarification',
    expectedTools: ['ProductSearchTool', 'ProductRecommendationTool', 'FAQTool'],
    expectedContextSwitches: 4,
    conversation: [
      {
        role: 'user',
        content: "Do you have that thing that makes your phone stick to the car?"
      },
      {
        role: 'user',
        content: "No, not a holder exactly. It's magnetic I think?"
      },
      {
        role: 'user',
        content: "Yes! That's it. But I also need something to charge it wirelessly at the same time"
      },
      {
        role: 'user',
        content: "Perfect. But will it work with my iPhone 12?"
      }
    ]
  },
  {
    id: 'multi-product-bundle-inquiry',
    name: 'Multi-Product Bundle Inquiry',
    category: 'Complex Purchase',
    difficulty: 'Very High',
    description: 'Customer building a complete work-from-home setup',
    expectedTools: ['ProductSearchTool', 'ProductAvailabilityTool', 'ProductRecommendationTool', 'ShoppingCartTool'],
    expectedContextSwitches: 5,
    conversation: [
      {
        role: 'user',
        content: "I'm setting up a home office. I need a webcam, good headphones, and something to improve my posture"
      },
      {
        role: 'user',
        content: "The webcam quality is important for client calls. What's the difference between the StreamCam and others?"
      },
      {
        role: 'user',
        content: "Add the StreamCam to my cart. For headphones, I need something with good noise cancellation"
      },
      {
        role: 'user',
        content: "Actually, I'm on a $500 budget total. Can you adjust my selections to fit?"
      },
      {
        role: 'user',
        content: "Great! Can you also recommend a good keyboard for typing all day?"
      },
      {
        role: 'user',
        content: "What's the total with shipping? And do you offer any bundle discounts?"
      }
    ]
  },
  {
    id: 'technical-compatibility-check',
    name: 'Technical Compatibility Check',
    category: 'Technical Support',
    difficulty: 'Medium',
    description: 'Customer checking product compatibility with existing devices',
    expectedTools: ['ProductSearchTool', 'FAQTool', 'CustomerSupportTool'],
    expectedContextSwitches: 2,
    conversation: [
      {
        role: 'user',
        content: "Will the TypeMaster keyboard work with my 2019 MacBook Pro?"
      },
      {
        role: 'user',
        content: "Does it support the Mac function keys and shortcuts?"
      },
      {
        role: 'user',
        content: "What about connecting to multiple devices? I also have a Windows desktop"
      },
      {
        role: 'user',
        content: "Is there special software I need to install?"
      }
    ]
  },
  {
    id: 'warranty-claim-process',
    name: 'Warranty Claim Process',
    category: 'Support & Returns',
    difficulty: 'High',
    description: 'Customer filing warranty claim for defective product',
    expectedTools: ['OrderTrackingTool', 'ReturnTool', 'CustomerSupportTool', 'FAQTool'],
    expectedContextSwitches: 4,
    conversation: [
      {
        role: 'user',
        content: "My AeroSound earbuds stopped working after 3 months. They're still under warranty"
      },
      {
        role: 'user',
        content: "Order number is ORD-2024-003. The left earbud has no sound at all"
      },
      {
        role: 'user',
        content: "I already tried resetting them and updating firmware. Nothing works"
      },
      {
        role: 'user',
        content: "How long will the warranty replacement take? I use these for work calls"
      },
      {
        role: 'user',
        content: "Can I get a temporary replacement or expedited shipping?"
      }
    ]
  },
  {
    id: 'price-match-negotiation',
    name: 'Price Match Negotiation',
    category: 'Pricing & Policies',
    difficulty: 'Medium',
    description: 'Customer requesting price match with competitor',
    expectedTools: ['ProductSearchTool', 'FAQTool', 'CustomerSupportTool'],
    expectedContextSwitches: 2,
    conversation: [
      {
        role: 'user',
        content: "I found the ProGamer mouse for $69 on Amazon. You have it for $89. Do you price match?"
      },
      {
        role: 'user',
        content: "Here's the link: [amazon.com/... ] It's sold by Amazon directly"
      },
      {
        role: 'user',
        content: "If you can't match it, do you offer any other incentives to buy from you?"
      },
      {
        role: 'user',
        content: "What about free shipping or extended warranty?"
      }
    ]
  },
  {
    id: 'subscription-loyalty-inquiry',
    name: 'Subscription & Loyalty Inquiry',
    category: 'Account & Loyalty',
    difficulty: 'Low',
    description: 'Customer asking about loyalty programs and benefits',
    expectedTools: ['FAQTool', 'CustomerSupportTool'],
    expectedContextSwitches: 1,
    conversation: [
      {
        role: 'user',
        content: "Do you have a loyalty program or subscription service?"
      },
      {
        role: 'user',
        content: "What are the benefits? I buy tech accessories frequently"
      },
      {
        role: 'user',
        content: "Is there a signup bonus or first-purchase discount?"
      }
    ]
  },
  {
    id: 'bulk-order-corporate',
    name: 'Bulk Order Corporate',
    category: 'B2B Sales',
    difficulty: 'Very High',
    description: 'Corporate customer needing bulk order with special requirements',
    expectedTools: ['ProductSearchTool', 'ProductAvailabilityTool', 'CustomerSupportTool', 'ShippingTool'],
    expectedContextSwitches: 5,
    conversation: [
      {
        role: 'user',
        content: "I need to order 50 webcams for our company. Do you offer bulk discounts?"
      },
      {
        role: 'user',
        content: "We need them delivered to 3 different office locations. Is that possible?"
      },
      {
        role: 'user',
        content: "Can you provide a formal quote on company letterhead?"
      },
      {
        role: 'user',
        content: "We also need 50 headsets. Can you suggest good ones for video conferencing?"
      },
      {
        role: 'user',
        content: "What's your lead time for this quantity? We need them within 2 weeks"
      },
      {
        role: 'user',
        content: "Do you offer NET 30 payment terms for corporate accounts?"
      }
    ]
  },
  {
    id: 'product-recommendation-lifestyle',
    name: 'Product Recommendation Lifestyle',
    category: 'Product Discovery',
    difficulty: 'Medium',
    description: 'Customer seeking recommendations based on lifestyle needs',
    expectedTools: ['ProductRecommendationTool', 'ProductSearchTool', 'ProductAvailabilityTool'],
    expectedContextSwitches: 3,
    conversation: [
      {
        role: 'user',
        content: "I travel a lot for work. What products do you recommend for frequent travelers?"
      },
      {
        role: 'user',
        content: "I especially need something for long flights. My neck always hurts"
      },
      {
        role: 'user',
        content: "Do any of your chargers work internationally?"
      },
      {
        role: 'user',
        content: "What about something to keep my devices organized in my carry-on?"
      }
    ]
  },
  {
    id: 'angry-customer-resolution',
    name: 'Angry Customer Resolution',
    category: 'Customer Service',
    difficulty: 'Very High',
    description: 'Handling upset customer with multiple issues',
    expectedTools: ['OrderTrackingTool', 'ReturnTool', 'CustomerSupportTool', 'ShippingTool'],
    expectedContextSwitches: 4,
    conversation: [
      {
        role: 'user',
        content: "This is the THIRD time I'm contacting you! My order is wrong and nobody is helping!"
      },
      {
        role: 'user',
        content: "I ordered ORD-2024-002 - a ProGamer mouse but received cheap earbuds instead!"
      },
      {
        role: 'user',
        content: "I've been a customer for years and this is how you treat me? This is ridiculous!"
      },
      {
        role: 'user',
        content: "I want a full refund AND you need to send the correct item with overnight shipping!"
      },
      {
        role: 'user',
        content: "How are you going to make this right? I'm thinking of posting about this online"
      }
    ]
  },
  {
    id: 'technical-troubleshooting',
    name: 'Technical Troubleshooting',
    category: 'Technical Support',
    difficulty: 'High',
    description: 'Customer needs help troubleshooting product issues',
    expectedTools: ['ProductSearchTool', 'FAQTool', 'CustomerSupportTool'],
    expectedContextSwitches: 3,
    conversation: [
      {
        role: 'user',
        content: "My TypeMaster keyboard types multiple letters when I press once. Help!"
      },
      {
        role: 'user',
        content: "I already tried different USB ports and another computer. Same issue"
      },
      {
        role: 'user',
        content: "Is there a firmware update? How do I install it?"
      },
      {
        role: 'user',
        content: "I followed the instructions but the updater doesn't recognize the keyboard"
      },
      {
        role: 'user',
        content: "This is affecting my work. If we can't fix it, I need a replacement ASAP"
      }
    ]
  },
  {
    id: 'gift-purchase-assistance',
    name: 'Gift Purchase Assistance',
    category: 'Product Discovery',
    difficulty: 'Medium',
    description: 'Customer buying gifts with limited knowledge',
    expectedTools: ['ProductRecommendationTool', 'ProductSearchTool', 'FAQTool'],
    expectedContextSwitches: 3,
    conversation: [
      {
        role: 'user',
        content: "I need to buy a tech gift for my teenage nephew. He's into gaming"
      },
      {
        role: 'user',
        content: "My budget is around $50-75. What would a 16-year-old gamer like?"
      },
      {
        role: 'user',
        content: "Does the mouse work with PlayStation or just computers?"
      },
      {
        role: 'user',
        content: "Can you gift wrap it or include a gift receipt?"
      }
    ]
  },
  {
    id: 'comparison-deep-dive',
    name: 'Comparison Deep Dive',
    category: 'Product Research',
    difficulty: 'High',
    description: 'Customer doing detailed comparison between products',
    expectedTools: ['ProductSearchTool', 'ProductRecommendationTool', 'FAQTool'],
    expectedContextSwitches: 4,
    conversation: [
      {
        role: 'user',
        content: "Compare all your wireless headphones. I need a detailed breakdown"
      },
      {
        role: 'user',
        content: "Which has the best battery life? I need at least 20 hours"
      },
      {
        role: 'user',
        content: "How's the call quality on the AeroSound? I'm in a lot of Zoom meetings"
      },
      {
        role: 'user',
        content: "Between AeroSound and SoundPro, which has better bass for music?"
      },
      {
        role: 'user',
        content: "What if I mainly use them for podcasts and audiobooks, not music?"
      }
    ]
  },
  {
    id: 'inventory-availability-check',
    name: 'Inventory Availability Check',
    category: 'Inventory',
    difficulty: 'Low',
    description: 'Customer checking stock across multiple items',
    expectedTools: ['ProductAvailabilityTool', 'ProductSearchTool', 'ShippingTool'],
    expectedContextSwitches: 2,
    conversation: [
      {
        role: 'user',
        content: "Is the StreamCam Pro in stock?"
      },
      {
        role: 'user',
        content: "How many do you have? I might need 3"
      },
      {
        role: 'user',
        content: "When will you get more if I need 5 total?"
      },
      {
        role: 'user',
        content: "Can you hold 3 for me while I check with my team?"
      }
    ]
  },
  {
    id: 'return-exchange-process',
    name: 'Return Exchange Process',
    category: 'Returns',
    difficulty: 'Medium',
    description: 'Customer wanting to exchange product for different model',
    expectedTools: ['OrderTrackingTool', 'ReturnTool', 'ProductSearchTool', 'ShippingTool'],
    expectedContextSwitches: 3,
    conversation: [
      {
        role: 'user',
        content: "I bought the ErgoGrip mouse but it's too small for my hand. Can I exchange it?"
      },
      {
        role: 'user',
        content: "Order ORD-2024-004. I've only used it for 2 days"
      },
      {
        role: 'user',
        content: "What gaming mice do you have that are bigger?"
      },
      {
        role: 'user',
        content: "Can I pay the difference and upgrade to the ProGamer?"
      },
      {
        role: 'user',
        content: "How does the exchange process work? Do I ship first?"
      }
    ]
  },
  {
    id: 'shipping-options-urgent',
    name: 'Shipping Options Urgent',
    category: 'Shipping',
    difficulty: 'Medium',
    description: 'Customer needs urgent delivery with specific requirements',
    expectedTools: ['ShippingTool', 'ProductAvailabilityTool', 'FAQTool'],
    expectedContextSwitches: 2,
    conversation: [
      {
        role: 'user',
        content: "I need a webcam delivered by Friday. Today is Wednesday. Is that possible?"
      },
      {
        role: 'user',
        content: "What shipping options guarantee Friday delivery to Chicago?"
      },
      {
        role: 'user',
        content: "Can I pick it up somewhere instead to save time?"
      },
      {
        role: 'user',
        content: "If I order in the next hour, when exactly will it ship?"
      }
    ]
  },
  {
    id: 'payment-issues-resolution',
    name: 'Payment Issues Resolution',
    category: 'Payment Support',
    difficulty: 'High',
    description: 'Customer experiencing payment problems during checkout',
    expectedTools: ['PaymentTool', 'OrderTrackingTool', 'CustomerSupportTool'],
    expectedContextSwitches: 3,
    conversation: [
      {
        role: 'user',
        content: "My payment keeps getting declined but my card is fine. I just used it"
      },
      {
        role: 'user',
        content: "I tried 3 times. Will I be charged multiple times?"
      },
      {
        role: 'user',
        content: "Can I use PayPal or another payment method instead?"
      },
      {
        role: 'user',
        content: "My bank shows a pending charge. But I didn't get an order confirmation"
      },
      {
        role: 'user',
        content: "This is frustrating. Can someone just take my order over the phone?"
      }
    ]
  },
  {
    id: 'accessory-compatibility-complex',
    name: 'Accessory Compatibility Complex',
    category: 'Technical Support',
    difficulty: 'High',
    description: 'Customer building a complex setup with compatibility concerns',
    expectedTools: ['ProductSearchTool', 'FAQTool', 'ProductRecommendationTool'],
    expectedContextSwitches: 4,
    conversation: [
      {
        role: 'user',
        content: "I have a MacBook Pro, iPad, and Android phone. Need accessories that work with all"
      },
      {
        role: 'user',
        content: "Specifically, I need a charger that can handle all three"
      },
      {
        role: 'user',
        content: "Will the TurboCharge 4.0 fast charge my MacBook Pro 16-inch?"
      },
      {
        role: 'user',
        content: "What about a keyboard that can switch between all my devices?"
      },
      {
        role: 'user',
        content: "Do any of your headphones support both Apple and Android switching?"
      }
    ]
  },
  {
    id: 'quality-concerns-research',
    name: 'Quality Concerns Research',
    category: 'Product Research',
    difficulty: 'Medium',
    description: 'Customer researching product quality and durability',
    expectedTools: ['ProductSearchTool', 'FAQTool', 'CustomerSupportTool'],
    expectedContextSwitches: 2,
    conversation: [
      {
        role: 'user',
        content: "I've had bad experiences with cheap accessories. How's your quality?"
      },
      {
        role: 'user',
        content: "What's the warranty on the ProGamer mouse? What does it cover?"
      },
      {
        role: 'user',
        content: "Have you had many returns or complaints about it?"
      },
      {
        role: 'user',
        content: "What materials is it made from? I need something durable"
      }
    ]
  },
  {
    id: 'subscription-cancellation-save',
    name: 'Subscription Cancellation Save',
    category: 'Account Management',
    difficulty: 'High',
    description: 'Customer wanting to cancel, requiring retention efforts',
    expectedTools: ['CustomerSupportTool', 'FAQTool', 'ProductRecommendationTool'],
    expectedContextSwitches: 3,
    conversation: [
      {
        role: 'user',
        content: "I want to cancel my premium membership. Not using it enough"
      },
      {
        role: 'user',
        content: "I've only bought twice this year. The membership fee isn't worth it"
      },
      {
        role: 'user',
        content: "What benefits am I actually getting? I don't see the value"
      },
      {
        role: 'user',
        content: "Unless you can offer something better, please proceed with cancellation"
      }
    ]
  },
  {
    id: 'cross-sell-success-scenario',
    name: 'Cross-Sell Success Scenario',
    category: 'Sales',
    difficulty: 'Medium',
    description: 'Opportunity to cross-sell complementary products',
    expectedTools: ['ProductRecommendationTool', 'ProductSearchTool', 'ShoppingCartTool'],
    expectedContextSwitches: 3,
    conversation: [
      {
        role: 'user',
        content: "I'm buying the StreamCam Pro for streaming"
      },
      {
        role: 'user',
        content: "Actually, what else do I need for a professional streaming setup?"
      },
      {
        role: 'user',
        content: "Good point about lighting. Do you sell ring lights?"
      },
      {
        role: 'user',
        content: "What about a microphone? The webcam mic probably isn't enough"
      },
      {
        role: 'user',
        content: "Ok add the webcam and your best headset for streaming to cart"
      }
    ]
  }
];

// Test Scenario Executor Configuration
export const testConfig = {
  // Expected response times (in ms)
  responseTimeThresholds: {
    excellent: 1000,
    good: 2000,
    acceptable: 3000,
    poor: 5000
  },
  
  // Quality score thresholds
  qualityThresholds: {
    excellent: 0.9,
    good: 0.75,
    acceptable: 0.6,
    poor: 0.5
  },
  
  // Hallucination risk thresholds
  hallucinationThresholds: {
    low: 0.2,
    medium: 0.5,
    high: 0.7,
    critical: 0.85
  },
  
  // Context coherence thresholds
  coherenceThresholds: {
    excellent: 0.95,
    good: 0.85,
    acceptable: 0.7,
    poor: 0.5
  },
  
  // Memory usage thresholds (percentage)
  memoryThresholds: {
    low: 25,
    moderate: 50,
    high: 75,
    critical: 90
  }
};

// Scoring rubric for test evaluation
export const scoringRubric = {
  toolUsage: {
    weight: 0.25,
    criteria: {
      allExpectedToolsUsed: 100,
      mostExpectedToolsUsed: 75,
      someExpectedToolsUsed: 50,
      fewExpectedToolsUsed: 25,
      noExpectedToolsUsed: 0
    }
  },
  responseQuality: {
    weight: 0.3,
    criteria: {
      accurate: 100,
      mostlyAccurate: 75,
      partiallyAccurate: 50,
      mostlyInaccurate: 25,
      inaccurate: 0
    }
  },
  contextManagement: {
    weight: 0.2,
    criteria: {
      perfectRetention: 100,
      goodRetention: 75,
      adequateRetention: 50,
      poorRetention: 25,
      noRetention: 0
    }
  },
  responseTime: {
    weight: 0.15,
    criteria: {
      excellent: 100,
      good: 75,
      acceptable: 50,
      poor: 25,
      unacceptable: 0
    }
  },
  customerSatisfaction: {
    weight: 0.1,
    criteria: {
      delighted: 100,
      satisfied: 75,
      neutral: 50,
      dissatisfied: 25,
      angry: 0
    }
  }
};

// Helper function to calculate overall test score
export function calculateTestScore(testResults) {
  let totalScore = 0;
  
  Object.keys(scoringRubric).forEach(metric => {
    const weight = scoringRubric[metric].weight;
    const score = testResults[metric] || 0;
    totalScore += score * weight;
  });
  
  return totalScore;
}

// Helper function to generate test report
export function generateTestReport(scenario, results) {
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    category: scenario.category,
    difficulty: scenario.difficulty,
    timestamp: new Date().toISOString(),
    results: {
      overallScore: calculateTestScore(results),
      toolsUsed: results.toolsUsed || [],
      expectedTools: scenario.expectedTools,
      contextSwitches: results.contextSwitches || 0,
      expectedContextSwitches: scenario.expectedContextSwitches,
      averageResponseTime: results.averageResponseTime || 0,
      averageQualityScore: results.averageQualityScore || 0,
      hallucinationRisk: results.hallucinationRisk || 0,
      coherenceScore: results.coherenceScore || 0,
      memoryUsage: results.memoryUsage || 0,
      conversationLength: results.conversationLength || 0,
      escalationNeeded: results.escalationNeeded || false
    },
    recommendations: generateRecommendations(results)
  };
}

// Helper function to generate recommendations based on test results
export function generateRecommendations(results) {
  const recommendations = [];
  
  if (results.averageResponseTime > testConfig.responseTimeThresholds.acceptable) {
    recommendations.push('Optimize response time - consider caching frequent queries');
  }
  
  if (results.hallucinationRisk > testConfig.hallucinationThresholds.medium) {
    recommendations.push('High hallucination risk detected - enhance fact verification');
  }
  
  if (results.coherenceScore < testConfig.coherenceThresholds.good) {
    recommendations.push('Improve context coherence - enhance memory management');
  }
  
  if (results.toolUsage < 75) {
    recommendations.push('Improve tool utilization - ensure appropriate tools are called');
  }
  
  return recommendations;
}