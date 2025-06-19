const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserBusinessId() {
  try {
    const email = 'khalid@clicky.pk';
    const correctBusinessId = 'cmbsfx1qt0001tvvj7hoemk12';
    
    console.log('🔧 Fixing user business ID association...\n');
    
    // 1. Check current user state
    const user = await prisma.user.findFirst({
      where: { email: email },
      include: { business: true }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('📊 Current user state:');
    console.log('- User ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- Current businessId:', user.businessId);
    console.log('- Business exists?', user.business ? '✅ Yes' : '❌ No');
    
    // 2. Check if correct business exists
    const correctBusiness = await prisma.business.findUnique({
      where: { id: correctBusinessId }
    });
    
    if (!correctBusiness) {
      console.log('❌ Correct business not found');
      return;
    }
    
    console.log('\n📊 Correct business found:');
    console.log('- Business ID:', correctBusiness.id);
    console.log('- Business Name:', correctBusiness.name);
    
    // 3. Update user to point to correct business
    console.log('\n🔧 Updating user businessId...');
    
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: {
        businessId: correctBusinessId
      },
      include: { business: true }
    });
    
    console.log('\n✅ User updated successfully:');
    console.log('- User ID:', updatedUser.id);
    console.log('- Email:', updatedUser.email);
    console.log('- New businessId:', updatedUser.businessId);
    console.log('- Business Name:', updatedUser.business?.name);
    
    console.log('\n🎉 Fix complete! User is now associated with correct business.');
    console.log('📝 Next step: Log out and log back in to get fresh token.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserBusinessId();