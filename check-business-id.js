const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBusiness() {
  const businessId = 'cmbsfx1qt0001tvvj7hoemk12';
  
  console.log(`Checking business ID: ${businessId}\n`);
  
  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        users: true,
        businessContext: true
      }
    });
    
    if (business) {
      console.log('✅ Business found:');
      console.log('================');
      console.log('ID:', business.id);
      console.log('Name:', business.name);
      console.log('Email:', business.email);
      console.log('Website:', business.website);
      console.log('Industry:', business.industry);
      console.log('Status:', business.status);
      console.log('Created:', business.createdAt);
      console.log('\nUsers:');
      business.users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - Role: ${user.role}`);
      });
      
      if (business.businessContext) {
        console.log('\n✅ Has BusinessContext');
        const context = business.businessContext;
        if (context.businessInfo) {
          const info = JSON.parse(context.businessInfo);
          console.log('  Business Info:', info.name || 'Not set');
        }
        if (context.knowledgeBase) {
          console.log('  ✅ Has Knowledge Base');
        } else {
          console.log('  ❌ No Knowledge Base saved yet');
        }
      } else {
        console.log('\n❌ No BusinessContext created yet');
      }
    } else {
      console.log('❌ No business found with this ID');
      
      // List all businesses
      console.log('\nAll businesses in database:');
      const allBusinesses = await prisma.business.findMany({
        select: { id: true, name: true, email: true }
      });
      
      allBusinesses.forEach(b => {
        console.log(`  - ${b.name} (${b.email}) - ID: ${b.id}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkBusiness();