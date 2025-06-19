const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTokenBusiness() {
  try {
    const tokenBusinessId = 'cmbu6vu5o0000ly7bpxb5ryh8';
    const oldBusinessId = 'cmbsfx1qt0001tvvj7hoemk12';
    
    console.log('🔍 Checking businesses in database...\n');
    
    // Check token business
    const tokenBusiness = await prisma.business.findUnique({
      where: { id: tokenBusinessId }
    });
    
    console.log('Token Business ID:', tokenBusinessId);
    if (tokenBusiness) {
      console.log('✅ Token business EXISTS:', tokenBusiness.name);
    } else {
      console.log('❌ Token business NOT FOUND');
    }
    
    console.log('\n---\n');
    
    // Check old business
    const oldBusiness = await prisma.business.findUnique({
      where: { id: oldBusinessId }
    });
    
    console.log('Old Business ID:', oldBusinessId);
    if (oldBusiness) {
      console.log('✅ Old business EXISTS:', oldBusiness.name);
    } else {
      console.log('❌ Old business NOT FOUND');
    }
    
    console.log('\n---\n');
    
    // Check user association
    const user = await prisma.user.findFirst({
      where: { email: 'khalid@clicky.pk' },
      include: { business: true }
    });
    
    if (user) {
      console.log('User businessId:', user.businessId);
      console.log('User business name:', user.business?.name);
      console.log('Matches token?', user.businessId === tokenBusinessId);
      console.log('Matches old?', user.businessId === oldBusinessId);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTokenBusiness();