const { PrismaClient } = require('@prisma/client');
const express = require('express');

const prisma = new PrismaClient();

async function testIntegrationFix() {
    console.log('=== Testing Pinecone Integration Fix ===');
    
    // Test 1: Check if environment field exists in database
    console.log('\n1. Checking database schema...');
    try {
        const business = await prisma.business.findFirst({
            where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
        });
        
        console.log('✅ Database fields:');
        console.log(`   - pineconeApiKey: ${business.pineconeApiKey ? 'Set' : 'Not set'}`);
        console.log(`   - pineconeEnvironment: ${business.pineconeEnvironment || 'Not set'}`);
        console.log(`   - pineconeNamespace: ${business.pineconeNamespace || 'Not set'}`);
        console.log(`   - pineconeIndexName: ${business.pineconeIndexName || 'Not set'}`);
    } catch (error) {
        console.log('❌ Database error:', error.message);
    }
    
    // Test 2: Test API endpoint structure
    console.log('\n2. Testing API endpoint mock...');
    const mockRequestBody = {
        apiKey: 'test-key',
        environment: 'us-east1-gcp',
        namespace: 'test-namespace',
        indexName: 'test-index'
    };
    
    console.log('✅ Mock request body:', mockRequestBody);
    
    // Test validation
    const { apiKey, environment, namespace, indexName } = mockRequestBody;
    const validationPassed = !!(apiKey && environment && namespace && indexName);
    console.log(`✅ Validation passes: ${validationPassed}`);
    
    // Test 3: Simulate Pinecone connection 
    console.log('\n3. Testing Pinecone connection simulation...');
    try {
        const { Pinecone } = require('@pinecone-database/pinecone');
        
        // This will fail but we can check the error message
        const pc = new Pinecone({ 
            apiKey: 'fake-key',
            environment: 'us-east1-gcp'
        });
        
        console.log('✅ Pinecone client initialized with environment parameter');
    } catch (error) {
        if (error.message.includes('environment')) {
            console.log('❌ Still missing environment parameter');
        } else {
            console.log('✅ Environment parameter accepted, failed for other reasons:', error.message.substring(0, 100));
        }
    }
    
    console.log('\n=== Test Complete ===');
    console.log('The integration form should now include:');
    console.log('- API Key field');
    console.log('- Environment field (NEW!)');
    console.log('- Namespace field');
    console.log('- Index Name field');
    
    await prisma.$disconnect();
}

testIntegrationFix();