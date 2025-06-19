const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBusiness() {
  try {
    // Check if the specific business exists
    const businessId = 'cmbsfx1qt0001tvvj7hoemk12';
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    if (business) {
      console.log('✅ Business found:', business);
    } else {
      console.log('❌ Business not found with ID:', businessId);
      
      // List all businesses
      const allBusinesses = await prisma.business.findMany();
      console.log('\n📋 All businesses in database:');
      allBusinesses.forEach((b, index) => {
        console.log(`${index + 1}. ID: ${b.id}, Name: ${b.name}`);
      });
      
      if (allBusinesses.length === 0) {
        console.log('No businesses found in database. Creating a test business...');
        
        // Create a test business
        const newBusiness = await prisma.business.create({
          data: {
            id: businessId,
            name: 'Test Business',
            email: 'test@example.com',
            settings: JSON.stringify({
              aiModeEnabled: false,
              orderTrackingSource: 'local'
            })
          }
        });
        
        console.log('✅ Created test business:', newBusiness);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBusiness();