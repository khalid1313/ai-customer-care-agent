const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupAdmin() {
  try {
    // Find the first user (assuming it's your account)
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!user) {
      console.log('No users found. Please register first.');
      return;
    }

    console.log('Found user:', user.email);

    // Update user to admin role
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'admin'
      }
    });

    console.log('✅ User updated to admin successfully!');
    console.log('Role:', updatedUser.role);
    console.log('\nPlease logout and login again to see the admin panel.');

  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();