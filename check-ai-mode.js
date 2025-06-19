const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAiMode() {
  try {
    const businessId = 'cmbsfx1qt0001tvvj7hoemk12';
    
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    if (business) {
      console.log('Business found:', business.name);
      
      if (business.settings) {
        const settings = JSON.parse(business.settings);
        console.log('AI Mode Enabled:', settings.aiModeEnabled);
        console.log('AI Mode Updated At:', settings.aiModeUpdatedAt);
        console.log('\nFull settings:');
        console.log(JSON.stringify(settings, null, 2));
      } else {
        console.log('No settings found');
      }
    } else {
      console.log('Business not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAiMode();