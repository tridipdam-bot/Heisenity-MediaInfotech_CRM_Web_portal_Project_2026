require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  max: 5,
  ssl: false
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testTicketCreation() {
  try {
    console.log('Testing ticket creation from customer support request...');
    
    // Find an accepted customer support request
    const acceptedRequest = await prisma.customerSupportRequest.findFirst({
      where: { status: 'ACCEPTED' },
      include: {
        customer: true,
        acceptedByEmployee: true
      }
    });

    if (!acceptedRequest) {
      console.log('No accepted customer support requests found');
      return;
    }

    console.log('Found accepted request:', {
      id: acceptedRequest.id,
      message: acceptedRequest.message.substring(0, 50) + '...',
      customer: acceptedRequest.customer.name,
      acceptedBy: acceptedRequest.acceptedByEmployee?.name
    });

    // Check if ticket category exists
    let ticketCategory = await prisma.ticketCategory.findFirst({
      where: { name: 'Customer Support' }
    });

    if (!ticketCategory) {
      console.log('Creating default ticket category...');
      ticketCategory = await prisma.ticketCategory.create({
        data: {
          name: 'Customer Support',
          description: 'Tickets created from customer support requests',
          createdBy: 'SYSTEM'
        }
      });
      console.log('Created category:', ticketCategory);
    }

    // Generate ticket ID
    const lastTicket = await prisma.supportTicket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ticketId: true }
    });

    let ticketNumber = 1;
    if (lastTicket) {
      const match = lastTicket.ticketId.match(/TKT-(\d+)/);
      if (match) {
        ticketNumber = parseInt(match[1], 10) + 1;
      }
    }
    const ticketId = `TKT-${ticketNumber.toString().padStart(3, '0')}`;

    console.log('Creating ticket with ID:', ticketId);

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketId,
        description: acceptedRequest.message,
        categoryId: ticketCategory.id,
        priority: 'MEDIUM',
        status: 'OPEN',
        assigneeId: acceptedRequest.acceptedBy,
        reporterId: acceptedRequest.acceptedBy,
        customerName: acceptedRequest.customer.name,
        customerId: acceptedRequest.customer.customerId,
        customerPhone: acceptedRequest.customer.phone
      }
    });

    console.log('✅ Ticket created successfully:', ticket);

    // Update support request
    await prisma.customerSupportRequest.update({
      where: { id: acceptedRequest.id },
      data: {
        status: 'TICKET_CREATED',
        ticketId: ticket.id
      }
    });

    console.log('✅ Support request updated to TICKET_CREATED status');

  } catch (error) {
    console.error('❌ Error during ticket creation test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTicketCreation();