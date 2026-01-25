const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotificationCleanup() {
  try {
    console.log('Testing notification cleanup...');
    
    // Find any TICKET_CREATED notifications
    const ticketNotifications = await prisma.adminNotification.findMany({
      where: {
        type: 'TICKET_CREATED'
      },
      take: 5
    });

    console.log(`Found ${ticketNotifications.length} TICKET_CREATED notifications`);

    for (const notification of ticketNotifications) {
      const data = notification.data ? JSON.parse(notification.data) : null;
      if (data?.ticketId) {
        console.log(`Checking ticket ${data.ticketId}...`);
        
        // Check if ticket is assigned
        const ticket = await prisma.supportTicket.findUnique({
          where: { ticketId: data.ticketId },
          select: { assigneeId: true, status: true }
        });

        if (ticket?.assigneeId) {
          console.log(`Ticket ${data.ticketId} is assigned, removing notification...`);
          
          // Remove the notification
          await prisma.adminNotification.delete({
            where: { id: notification.id }
          });
          
          console.log(`Removed notification for assigned ticket ${data.ticketId}`);
        } else {
          console.log(`Ticket ${data.ticketId} is still unassigned`);
        }
      }
    }

    console.log('Cleanup test completed');
  } catch (error) {
    console.error('Error during cleanup test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationCleanup();