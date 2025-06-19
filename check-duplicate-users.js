const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicateUsers() {
  try {
    const email = 'khalid@clicky.pk';
    
    console.log('🔍 Checking for duplicate users...\n');
    
    // Find ALL users with this email
    const users = await prisma.user.findMany({
      where: { email: email },
      include: { business: true }
    });
    
    console.log(`Found ${users.length} user(s) with email: ${email}\n`);
    
    users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Business ID: ${user.businessId}`);
      console.log(`- Business Name: ${user.business?.name || 'No business'}`);
      console.log(`- Business Status: ${user.business?.status || 'N/A'}`);
      console.log(`- Is Active: ${user.isActive}`);
      console.log(`- Created: ${user.createdAt}`);
      console.log(`- Updated: ${user.updatedAt}`);
      console.log('---');
    });
    
    if (users.length > 1) {
      console.log('⚠️ MULTIPLE USERS FOUND! This might cause login issues.');
      console.log('The login endpoint might be returning the wrong user.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateUsers();