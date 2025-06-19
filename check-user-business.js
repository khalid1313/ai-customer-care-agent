const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserBusiness() {
  try {
    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: 'khalid@clicky.pk' },
      include: { business: true }
    });
    
    if (user) {
      console.log('✅ User found:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Name:', user.firstName, user.lastName);
      console.log('- Business ID:', user.businessId);
      console.log('\n📋 Business details:');
      if (user.business) {
        console.log('- Business ID:', user.business.id);
        console.log('- Business Name:', user.business.name);
        console.log('- Business Email:', user.business.email);
      }
    } else {
      console.log('❌ User not found with email: khalid@clicky.pk');
      
      // List all users
      const allUsers = await prisma.user.findMany({
        include: { business: true }
      });
      console.log('\n📋 All users in database:');
      allUsers.forEach((u, index) => {
        console.log(`${index + 1}. Email: ${u.email}, Business: ${u.business?.name} (${u.businessId})`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserBusiness();