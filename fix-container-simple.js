const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixContainerSimple() {
  try {
    const email = 'khalid@clicky.pk';
    
    console.log('🔧 Simple fix: Update existing business settings...\n');
    
    // 1. Find current user and business
    const user = await prisma.user.findUnique({
      where: { email: email },
      include: { business: true }
    });
    
    console.log('Current business ID:', user.businessId);
    
    // 2. Update the existing business settings to enable AI mode
    const updatedBusiness = await prisma.business.update({
      where: { id: user.businessId },
      data: {
        settings: JSON.stringify({
          aiModeEnabled: true,
          aiModeUpdatedAt: new Date().toISOString(),
          orderTrackingSource: 'local',
          autoDetectOrderFormat: true,
          showTrackingUrls: true,
          orderStatusUpdates: true
        })
      }
    });
    
    console.log('✅ Business settings updated:');
    const settings = JSON.parse(updatedBusiness.settings);
    console.log('- AI Mode Enabled:', settings.aiModeEnabled);
    console.log('- Updated At:', settings.aiModeUpdatedAt);
    
    console.log('\n🎉 Fix complete!');
    console.log('📝 Now try the AI Mode toggle in settings - it should work and persist!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixContainerSimple();