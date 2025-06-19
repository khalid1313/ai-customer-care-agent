const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testChannelIntegrations() {
    try {
        console.log('🔍 Testing Channel Integrations Schema...\n');

        // 1. Find a business to use for testing
        const business = await prisma.business.findFirst();
        if (!business) {
            console.log('❌ No business found. Please run setup scripts first.');
            return;
        }
        console.log(`✅ Using business: ${business.name} (${business.id})\n`);

        // 2. Create test channel integrations
        console.log('📝 Creating test channel integrations...');
        
        const platforms = ['INSTAGRAM', 'MESSENGER', 'WHATSAPP'];
        
        for (const platform of platforms) {
            try {
                const integration = await prisma.channelIntegration.upsert({
                    where: {
                        businessId_platform: {
                            businessId: business.id,
                            platform: platform
                        }
                    },
                    update: {
                        status: 'CONNECTED',
                        platformAccountName: `Test ${platform} Account`,
                        webhookSubscribed: true,
                        lastTestAt: new Date()
                    },
                    create: {
                        businessId: business.id,
                        platform: platform,
                        status: 'CONNECTED',
                        platformAccountName: `Test ${platform} Account`,
                        platformAccountId: `test_${platform.toLowerCase()}_123`,
                        webhookSubscribed: true,
                        webhookUrl: `http://localhost:3001/api/webhooks/${platform.toLowerCase()}`,
                        permissions: JSON.stringify(['messaging', 'webhooks']),
                        features: JSON.stringify(['messaging']),
                        connectedAt: new Date()
                    }
                });
                console.log(`✅ Created/Updated ${platform} integration`);
            } catch (error) {
                console.log(`❌ Error with ${platform}:`, error.message);
            }
        }

        // 3. Query all integrations
        console.log('\n📊 All channel integrations:');
        const integrations = await prisma.channelIntegration.findMany({
            where: { businessId: business.id },
            orderBy: { createdAt: 'desc' }
        });

        integrations.forEach(integration => {
            console.log(`
Platform: ${integration.platform}
Status: ${integration.status}
Account: ${integration.platformAccountName}
Webhook: ${integration.webhookSubscribed ? '✅ Active' : '❌ Inactive'}
Connected: ${integration.connectedAt ? new Date(integration.connectedAt).toLocaleDateString() : 'Never'}
            `);
        });

        // 4. Test unique constraint
        console.log('\n🔒 Testing unique constraint...');
        try {
            await prisma.channelIntegration.create({
                data: {
                    businessId: business.id,
                    platform: 'INSTAGRAM',
                    status: 'DISCONNECTED'
                }
            });
            console.log('❌ Unique constraint not working!');
        } catch (error) {
            console.log('✅ Unique constraint working correctly - cannot create duplicate platform integration');
        }

        console.log('\n✅ Channel integrations schema test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testChannelIntegrations();