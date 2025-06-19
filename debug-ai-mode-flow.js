const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAiModeFlow() {
  try {
    const businessId = 'cmbsfx1qt0001tvvj7hoemk12';
    
    console.log('🔍 Checking AI Mode flow...\n');
    
    // 1. Check current state
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    if (!business) {
      console.log('❌ Business not found');
      return;
    }
    
    console.log('📊 Current business settings:');
    if (business.settings) {
      const settings = JSON.parse(business.settings);
      console.log('- AI Mode Enabled:', settings.aiModeEnabled);
      console.log('- Last Updated:', settings.aiModeUpdatedAt);
    }
    
    // 2. Simulate saving AI Mode = true
    console.log('\n💾 Simulating AI Mode save (true)...');
    let currentSettings = {};
    if (business.settings) {
      currentSettings = JSON.parse(business.settings);
    }
    
    currentSettings.aiModeEnabled = true;
    currentSettings.aiModeUpdatedAt = new Date().toISOString();
    
    await prisma.business.update({
      where: { id: businessId },
      data: {
        settings: JSON.stringify(currentSettings),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ AI Mode saved as TRUE');
    
    // 3. Verify it was saved
    const updatedBusiness = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    const verifySettings = JSON.parse(updatedBusiness.settings);
    console.log('\n✅ Verification:');
    console.log('- AI Mode Enabled:', verifySettings.aiModeEnabled);
    console.log('- Updated At:', verifySettings.aiModeUpdatedAt);
    
    // 4. Check if there are any other processes that might modify settings
    console.log('\n🔍 Checking for other modification patterns...');
    
    // Wait 2 seconds and check again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalCheck = await prisma.business.findUnique({
      where: { id: businessId }
    });
    
    const finalSettings = JSON.parse(finalCheck.settings);
    console.log('\n🔍 After 2 seconds:');
    console.log('- AI Mode Enabled:', finalSettings.aiModeEnabled);
    console.log('- Updated At:', finalSettings.aiModeUpdatedAt);
    
    if (finalSettings.aiModeEnabled !== true) {
      console.log('⚠️ WARNING: AI Mode was changed after saving!');
    } else {
      console.log('✅ AI Mode setting is stable');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAiModeFlow();