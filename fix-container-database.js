const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixContainerDatabase() {
  try {
    const email = 'khalid@clicky.pk';
    
    console.log('🔧 Fixing user business association in container database...\n');
    
    // 1. Find current user
    const user = await prisma.user.findUnique({
      where: { email: email },
      include: { business: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('📊 Current state in container:');
    console.log('- User ID:', user.id);
    console.log('- Business ID:', user.businessId);
    console.log('- Business Name:', user.business?.name);
    console.log('- Business Status:', user.business?.status);
    
    // 2. Check if there's already a correct business
    let correctBusiness = await prisma.business.findFirst({
      where: { id: 'cmbsfx1qt0001tvvj7hoemk12' }
    });
    
    if (!correctBusiness) {
      console.log('\n🆕 Creating correct business record...');
      correctBusiness = await prisma.business.create({
        data: {
          id: 'cmbsfx1qt0001tvvj7hoemk12',
          name: 'Clicky',
          email: 'khalid@clicky.pk',
          status: 'active',
          subscription: 'free',
          settings: JSON.stringify({
            aiModeEnabled: true,
            orderTrackingSource: 'local',
            autoDetectOrderFormat: true,
            showTrackingUrls: true,
            orderStatusUpdates: true
          })
        }
      });
      console.log('✅ Business created:', correctBusiness.id);
    }
    
    // 3. Update user to use correct business
    console.log('\n🔧 Updating user business association...');
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: {
        businessId: 'cmbsfx1qt0001tvvj7hoemk12'
      },
      include: { business: true }
    });
    
    console.log('\n✅ User updated successfully:');
    console.log('- User ID:', updatedUser.id);
    console.log('- New Business ID:', updatedUser.businessId);
    console.log('- Business Name:', updatedUser.business?.name);
    
    console.log('\n🎉 Container database fixed!');
    console.log('📝 Next: Log out and log in again to get fresh token.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixContainerDatabase();