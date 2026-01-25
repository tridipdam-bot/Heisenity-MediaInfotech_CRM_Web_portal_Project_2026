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

async function debugTicketCreation() {
  try {
    console.log('Debugging ticket creation foreign key constraints...');
    
    // Get the accepted request
    const request = await prisma.customerSupportRequest.findFirst({
      where: { status: 'ACCEPTED' },
      include: {
        customer: true
      }
    });

    if (!request) {
      console.log('No accepted request found');
      return;
    }

    console.log('Found accepted request:', {
      id: request.id,
      acceptedBy: request.acceptedBy,
      customer: request.customer.name
    });

    // Check if the acceptedBy employee exists
    if (request.acceptedBy) {
      const employee = await prisma.employee.findUnique({
        where: { id: request.acceptedBy },
        select: { id: true, name: true, employeeId: true }
      });
      
      console.log('AcceptedBy employee:', employee || 'NOT FOUND');
    }

    // Check ticket categories
    const categories = await prisma.ticketCategory.findMany({
      select: { id: true, name: true }
    });
    
    console.log('Available ticket categories:', categories);

    // Check if "Customer Support" category exists
    const customerSupportCategory = await prisma.ticketCategory.findFirst({
      where: { name: 'Customer Support' }
    });
    
    console.log('Customer Support category:', customerSupportCategory || 'NOT FOUND');

    // Check admin employee record
    const admin = await prisma.admin.findFirst({
      select: { id: true, adminId: true, name: true, email: true }
    });
    
    if (admin) {
      console.log('Found admin:', admin);
      
      const adminEmployeeId = `ADMIN_${admin.adminId}`;
      const adminEmployee = await prisma.employee.findUnique({
        where: { employeeId: adminEmployeeId },
        select: { id: true, name: true, employeeId: true }
      });
      
      console.log('Admin employee record:', adminEmployee || 'NOT FOUND');
    }

  } catch (error) {
    console.error('Error debugging ticket creation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTicketCreation();