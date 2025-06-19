const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateConversation() {
  try {
    // Update the conversation to allow AI handling
    const updated = await prisma.conversation.update({
      where: { id: 'cmc0vtfj3000vzcih0pegxlxe' },
      data: { isAiHandling: true }
    });
    console.log('Conversation updated:', updated.id, 'isAiHandling:', updated.isAiHandling);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateConversation();
