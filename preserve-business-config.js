const { PrismaClient } = require('@prisma/client');

async function preserveBusinessConfig() {
    const prisma = new PrismaClient();
    
    try {
        const businessId = 'cmbsfx1qt0001tvvj7hoemk12';
        
        // Your stable business configuration
        const businessConfig = {
            shopifyDomain: 'mrsfc.myshopify.com',
            shopifyApiKey: 'your-api-key-here', // Replace with actual API key
            shopifyAccessToken: 'your-access-token-here', // Replace with actual token
            shopifyStoreId: 'mrsfc-store',
            pineconeApiKey: 'pcsk_369vFM_FQnYT21x64dsr3rxoZ9DdoMLbVoTNZPw7FEZaTjXLYwV1k6tiaqpXgXeRTM5SWw',
            pineconeEnvironment: 'insig1',
            pineconeNamespace: 'insig1',
            pineconeIndexName: 'insig1'
        };
        
        const updated = await prisma.business.update({
            where: { id: businessId },
            data: businessConfig
        });
        
        console.log('✅ Business configuration preserved for:', updated.id);
        console.log('📊 Shopify Domain:', updated.shopifyDomain);
        console.log('🔍 Pinecone Index:', updated.pineconeIndexName);
        
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: 'khalid@clicky.pk' }
        });
        
        if (user) {
            console.log('👤 User account confirmed:', user.email);
        }
        
    } catch (error) {
        console.error('❌ Error preserving business config:', error);
    } finally {
        await prisma.$disconnect();
    }
}

preserveBusinessConfig();