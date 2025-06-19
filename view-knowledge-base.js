const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function viewKnowledgeBase(businessId) {
    try {
        console.log('Retrieving knowledge base for business ID:', businessId);
        console.log('----------------------------------------\n');
        
        // Get the business context with knowledge base
        const businessContext = await prisma.businessContext.findUnique({
            where: { businessId: businessId },
            include: {
                business: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
        
        if (!businessContext) {
            console.log('No business context found for this business ID.');
            return;
        }
        
        console.log('Business Information:');
        console.log('- Name:', businessContext.business?.name || 'N/A');
        console.log('- Email:', businessContext.business?.email || 'N/A');
        console.log('\nKnowledge Base Status:');
        console.log('- Indexed:', businessContext.isIndexed ? 'Yes' : 'No');
        console.log('- Last Updated:', businessContext.updatedAt);
        
        if (businessContext.knowledgeBase) {
            const knowledgeBase = businessContext.knowledgeBase;
            
            console.log('\n----------------------------------------');
            console.log('KNOWLEDGE BASE CONTENT:');
            console.log('----------------------------------------\n');
            
            // Display categories
            if (knowledgeBase.categories && knowledgeBase.categories.length > 0) {
                console.log('CATEGORIES:');
                knowledgeBase.categories.forEach((category, index) => {
                    console.log(`${index + 1}. ${category.name}`);
                    if (category.description) {
                        console.log(`   Description: ${category.description}`);
                    }
                });
                console.log('');
            }
            
            // Display FAQs
            if (knowledgeBase.faqs && knowledgeBase.faqs.length > 0) {
                console.log('FREQUENTLY ASKED QUESTIONS:');
                knowledgeBase.faqs.forEach((faq, index) => {
                    console.log(`\n${index + 1}. Q: ${faq.question}`);
                    console.log(`   A: ${faq.answer}`);
                });
                console.log('');
            }
            
            // Display policies
            if (knowledgeBase.policies) {
                console.log('\nPOLICIES:');
                Object.entries(knowledgeBase.policies).forEach(([key, value]) => {
                    console.log(`\n${key.toUpperCase()}:`);
                    console.log(value);
                });
            }
            
            // Display contact information
            if (knowledgeBase.contactInfo) {
                console.log('\nCONTACT INFORMATION:');
                Object.entries(knowledgeBase.contactInfo).forEach(([key, value]) => {
                    console.log(`- ${key}: ${value}`);
                });
            }
            
            // Display business hours
            if (knowledgeBase.businessHours) {
                console.log('\nBUSINESS HOURS:');
                Object.entries(knowledgeBase.businessHours).forEach(([day, hours]) => {
                    console.log(`- ${day}: ${hours}`);
                });
            }
            
            // Display raw JSON (optional - uncomment if needed)
            // console.log('\n----------------------------------------');
            // console.log('RAW JSON DATA:');
            // console.log('----------------------------------------');
            // console.log(JSON.stringify(knowledgeBase, null, 2));
            
        } else {
            console.log('\nNo knowledge base data found.');
        }
        
    } catch (error) {
        console.error('Error retrieving knowledge base:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Main execution
async function main() {
    const businessId = process.argv[2] || 'cmbsfx1qt0001tvvj7hoemk12';
    
    if (process.argv[2] === '--help' || process.argv[2] === '-h') {
        console.log('Usage: node view-knowledge-base.js [businessId]');
        console.log('Default businessId: cmbsfx1qt0001tvvj7hoemk12');
        console.log('\nExample: node view-knowledge-base.js cmbsfx1qt0001tvvj7hoemk12');
        return;
    }
    
    await viewKnowledgeBase(businessId);
}

main();