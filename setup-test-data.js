const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTestData() {
  try {
    // Check if test business exists
    let business = await prisma.business.findUnique({
      where: { id: 'test-business-123' }
    });

    if (!business) {
      // Create test business
      business = await prisma.business.create({
        data: {
          id: 'test-business-123',
          name: 'Test Business',
          email: 'test@business.com',
          settings: JSON.stringify({ testMode: true })
        }
      });
      console.log('✅ Test business created:', business.id);
    } else {
      console.log('✅ Test business already exists:', business.id);
    }

    return business;
  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();