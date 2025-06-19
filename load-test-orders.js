require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function loadTestOrders() {
  console.log('📦 Loading test orders into database...');
  
  try {
    // Read the orders from the JSON file
    const ordersData = JSON.parse(fs.readFileSync('./data/orders.json', 'utf8'));
    
    // Update orders to use the correct business ID
    const businessId = 'cmbsfx1qt0001tvvj7hoemk12';
    
    for (const orderData of ordersData) {
      // Create order with correct business ID
      const order = await prisma.order.create({
        data: {
          id: orderData.id,
          businessId: businessId,
          customerId: orderData.customerId,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          status: orderData.status,
          total: orderData.total,
          items: JSON.stringify(orderData.items),
          shippingAddress: JSON.stringify(orderData.shippingAddress),
          trackingNumber: orderData.trackingNumber,
          notes: orderData.notes,
          createdAt: new Date(orderData.createdAt),
          updatedAt: new Date(orderData.updatedAt)
        }
      });
      
      console.log(`✅ Created order: ${order.id} for ${order.customerName}`);
    }
    
    console.log('\n🎉 All test orders loaded successfully!');
    
    // Show summary
    const orderCount = await prisma.order.count({
      where: { businessId }
    });
    
    console.log(`📊 Total orders for business ${businessId}: ${orderCount}`);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ Orders already exist in database');
    } else {
      console.error('❌ Error loading orders:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

loadTestOrders();