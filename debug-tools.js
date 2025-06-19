const CustomerCareTools = require('./src/tools/CustomerCareTools');
const EnhancedAIAgent = require('./src/agents/EnhancedAIAgent');

async function debugTools() {
    console.log('=== Tool Debug ===');
    
    // Initialize tools
    const toolsProvider = new CustomerCareTools();
    console.log('CustomerCareTools created');
    
    const tools = toolsProvider.getAllTools();
    console.log('Tools count:', tools.length);
    console.log('Tool names:', tools.map(t => t.name));
    
    // Initialize agent
    const aiAgent = new EnhancedAIAgent(tools, {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        maxTokens: 1000,
        verbose: true
    });
    
    console.log('Agent created with', aiAgent.tools.length, 'tools');
    
    await aiAgent.initialize();
    console.log('Agent initialized');
    
    // Test a simple FAQ question
    console.log('\n=== Testing FAQ Question ===');
    const result = await aiAgent.processMessage('What is your return policy?', 'debug-session');
    
    console.log('Response:', result.response);
    console.log('Tools used:', result.toolsUsed);
    console.log('Processing time:', result.processingTime);
}

debugTools().catch(console.error);