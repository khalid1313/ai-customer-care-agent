const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: 'admin@acme-electronics.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('First Name:', user.firstName);
    console.log('Last Name:', user.lastName);
    console.log('Is Active:', user.isActive);
    console.log('Business ID:', user.businessId);

  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();