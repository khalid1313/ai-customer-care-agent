const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function restoreCompleteConfig() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔧 Restoring complete configuration...');
        
        const businessId = 'cmbsfx1qt0001tvvj7hoemk12';
        const userEmail = 'khalid@clicky.pk';
        const userPassword = 'khalid123';
        
        // 1. Reset user password
        const hashedPassword = await bcrypt.hash(userPassword, 10);
        await prisma.user.update({
            where: { email: userEmail },
            data: { password: hashedPassword }
        });
        console.log('✅ User password reset');
        
        // 2. Update business integrations
        await prisma.business.update({
            where: { id: businessId },
            data: {
                shopifyDomain: 'mrsfc.myshopify.com',
                shopifyApiKey: 'your-api-key-here', // Replace with actual API key
                shopifyAccessToken: 'your-access-token-here', // Replace with actual token
                shopifyStoreId: 'mrsfc-store',
                pineconeApiKey: 'pcsk_369vFM_FQnYT21x64dsr3rxoZ9DdoMLbVoTNZPw7FEZaTjXLYwV1k6tiaqpXgXeRTM5SWw',
                pineconeEnvironment: 'insig1',
                pineconeNamespace: 'insig1',
                pineconeIndexName: 'insig1'
            }
        });
        console.log('✅ Business integrations configured');
        
        // 3. Verify configuration
        const business = await prisma.business.findUnique({
            where: { id: businessId },
            include: {
                users: {
                    select: { email: true, role: true, isActive: true }
                }
            }
        });
        
        console.log('\n📊 Configuration Summary:');
        console.log('Business Name:', business.name);
        console.log('Shopify Domain:', business.shopifyDomain);
        console.log('Pinecone Index:', business.pineconeIndexName);
        console.log('Users:', business.users.length);
        console.log('User Active:', business.users[0]?.isActive);
        
        console.log('\n🎯 Login Credentials:');
        console.log('Email:', userEmail);
        console.log('Password:', userPassword);
        console.log('Frontend URL: http://localhost:3000/login');
        
    } catch (error) {
        console.error('❌ Error restoring configuration:', error);
    } finally {
        await prisma.$disconnect();
    }
}

restoreCompleteConfig();