const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugKnowledgeBase() {
    try {
        console.log('Checking database for knowledge base data...\n');
        
        // Get all business contexts
        const contexts = await prisma.businessContext.findMany({
            include: {
                business: true
            }
        });
        
        console.log(`Found ${contexts.length} business context(s)\n`);
        
        for (const context of contexts) {
            console.log('========================================');
            console.log(`Business: ${context.business?.name || 'Unknown'}`);
            console.log(`Business ID: ${context.businessId}`);
            console.log(`Created: ${context.createdAt}`);
            console.log(`Updated: ${context.updatedAt}`);
            console.log(`Indexed: ${context.isIndexed}`);
            
            if (context.businessInfo) {
                console.log('\nBusiness Info:');
                try {
                    const info = JSON.parse(context.businessInfo);
                    console.log(JSON.stringify(info, null, 2));
                } catch (e) {
                    console.log('Raw:', context.businessInfo);
                }
            }
            
            if (context.knowledgeBase) {
                console.log('\nKnowledge Base: FOUND');
                console.log('Data type:', typeof context.knowledgeBase);
                
                // Check if it's a string that needs parsing
                if (typeof context.knowledgeBase === 'string') {
                    try {
                        const kb = JSON.parse(context.knowledgeBase);
                        console.log('\nParsed Knowledge Base:');
                        console.log(JSON.stringify(kb, null, 2));
                    } catch (e) {
                        console.log('Failed to parse as JSON:', e.message);
                        console.log('Raw data:', context.knowledgeBase);
                    }
                } else {
                    // It's already an object (Prisma Json type)
                    console.log('\nKnowledge Base Content:');
                    console.log(JSON.stringify(context.knowledgeBase, null, 2));
                }
            } else {
                console.log('\nKnowledge Base: NOT FOUND');
            }
            
            console.log('========================================\n');
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugKnowledgeBase();