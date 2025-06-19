const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAllKnowledgeBases() {
    try {
        console.log('Retrieving all businesses with knowledge bases...');
        console.log('========================================\n');
        
        // Get all business contexts
        const businessContexts = await prisma.businessContext.findMany({
            include: {
                business: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        
        if (businessContexts.length === 0) {
            console.log('No business contexts found in the database.');
            return;
        }
        
        console.log(`Found ${businessContexts.length} business context(s):\n`);
        
        let knowledgeBaseCount = 0;
        
        businessContexts.forEach((context, index) => {
            console.log(`${index + 1}. Business: ${context.business?.name || 'Unknown'}`);
            console.log(`   - ID: ${context.businessId}`);
            console.log(`   - Email: ${context.business?.email || 'N/A'}`);
            console.log(`   - Indexed: ${context.isIndexed ? 'Yes' : 'No'}`);
            console.log(`   - Has Knowledge Base: ${context.knowledgeBase ? 'Yes' : 'No'}`);
            console.log(`   - Last Updated: ${context.updatedAt}`);
            
            if (context.knowledgeBase) {
                knowledgeBaseCount++;
                try {
                    const kb = context.knowledgeBase;
                    console.log(`   - Knowledge Base Summary:`);
                    console.log(`     * Categories: ${kb.categories?.length || 0}`);
                    console.log(`     * FAQs: ${kb.faqs?.length || 0}`);
                    console.log(`     * Policies: ${Object.keys(kb.policies || {}).length}`);
                } catch (e) {
                    console.log(`   - Knowledge Base: Error parsing data`);
                }
            }
            
            console.log('');
        });
        
        console.log('========================================');
        console.log(`Total businesses with knowledge bases: ${knowledgeBaseCount}/${businessContexts.length}`);
        
    } catch (error) {
        console.error('Error retrieving business contexts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Main execution
listAllKnowledgeBases();