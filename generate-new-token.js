const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

async function generateNewToken() {
  try {
    // Get the user with correct business association
    const user = await prisma.user.findFirst({
      where: { email: 'khalid@clicky.pk' },
      include: { business: true }
    });
    
    if (!user) {
      console.error('User not found');
      return;
    }
    
    console.log('User found:');
    console.log('- User ID:', user.id);
    console.log('- Business ID:', user.businessId);
    console.log('- Business Name:', user.business.name);
    
    // Generate new token with correct business ID
    const newToken = jwt.sign(
      { 
        userId: user.id, 
        businessId: user.businessId,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('\n✅ New token generated:');
    console.log(newToken);
    console.log('\n📋 To use this token:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Application/Storage > Local Storage');
    console.log('3. Find the key "auth_token"');
    console.log('4. Replace its value with the token above');
    console.log('5. Refresh the page');
    
  } catch (error) {
    console.error('Error generating token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateNewToken();