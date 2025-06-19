const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// This should match the backend's JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

async function generateFreshToken() {
  try {
    // Get user with correct business association
    const user = await prisma.user.findFirst({
      where: { email: 'khalid@clicky.pk' },
      include: { business: true }
    });
    
    if (!user) {
      console.error('User not found');
      return;
    }
    
    console.log('User info:');
    console.log('- User ID:', user.id);
    console.log('- Business ID:', user.businessId);
    console.log('- Email:', user.email);
    console.log('- Role:', user.role);
    console.log('- Business Name:', user.business?.name);
    
    // Generate token that expires in 24 hours
    const token = jwt.sign(
      { 
        userId: user.id, 
        businessId: user.businessId,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Verify the token immediately
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('\n✅ Token verified successfully:');
    console.log('- Expires at:', new Date(decoded.exp * 1000));
    console.log('- Business ID in token:', decoded.businessId);
    
    console.log('\n🔑 Fresh Token:');
    console.log(token);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateFreshToken();