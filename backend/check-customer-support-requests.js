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

async function checkCustomerSupportRequests() {
  try {
    console.log('Checking customer support requests...');
    
    const requests = await prisma.customerSupportRequest.findMany({
      include: {
        customer: {
          select: {
            customerId: true,
            name: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${requests.length} customer support requests:`);
    
    requests.forEach((request, index) => {
      console.log(`\n${index + 1}. Request ID: ${request.id}`);
      console.log(`   Status: ${request.status}`);
      console.log(`   Customer: ${request.customer.name} (${request.customer.customerId})`);
      console.log(`   Message: ${request.message.substring(0, 50)}...`);
      console.log(`   Created: ${request.createdAt}`);
      console.log(`   Accepted By: ${request.acceptedBy || 'None'}`);
    });

  } catch (error) {
    console.error('Error checking customer support requests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerSupportRequests();