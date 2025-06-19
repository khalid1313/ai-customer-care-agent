const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDuplicateUsers() {
  try {
    const email = 'khalid@clicky.pk';
    
    console.log('🔍 Finding ALL users with email:', email);
    console.log('==========================================\n');
    
    // Find ALL users with this email (including inactive ones)
    const users = await prisma.user.findMany({
      where: { email: email },
      include: { business: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${users.length} users with email: ${email}\n`);
    
    users.forEach((user, index) => {
      console.log(`👤 User ${index + 1}:`);
      console.log(`- ID: ${user.id}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Business ID: ${user.businessId}`);
      console.log(`- Business Name: ${user.business?.name || 'No business'}`);
      console.log(`- Business Exists: ${user.business ? 'Yes' : 'No'}`);
      console.log(`- Is Active: ${user.isActive}`);
      console.log(`- Created: ${user.createdAt}`);
      console.log(`- Updated: ${user.updatedAt}`);
      
      if (user.id === 'cmbu6vu8n0002ly7bi7d7xett') {
        console.log(`- ⚠️  THIS IS THE WRONG USER BEING RETURNED BY LOGIN`);
      }
      if (user.id === 'cmbsfx1qw0003tvvjxss73kz8') {
        console.log(`- ✅ THIS IS THE CORRECT USER`);
      }
      
      console.log('---');
    });
    
    if (users.length > 1) {
      console.log('\n🚨 PROBLEM FOUND: Multiple users with same email!');
      console.log('The login endpoint is probably using findUnique() which returns the first match.');
      console.log('We need to either:');
      console.log('1. Delete the duplicate user(s)');
      console.log('2. Deactivate the wrong user');
      console.log('3. Modify the login query to find the correct user');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findDuplicateUsers();