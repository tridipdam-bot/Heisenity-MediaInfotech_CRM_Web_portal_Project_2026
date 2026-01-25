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

async function createTestCustomerSupportRequest() {
  try {
    console.log('Creating test customer support request...');
    
    // Find a customer to create the request for
    const customer = await prisma.customer.findFirst({
      select: {
        id: true,
        customerId: true,
        name: true,
        phone: true,
        email: true
      }
    });

    if (!customer) {
      console.log('No customers found. Creating a test customer first...');
      
      // Create a test customer
      const newCustomer = await prisma.customer.create({
        data: {
          customerId: 'CUS-TEST',
          name: 'Test Customer',
          phone: '1234567890',
          email: 'test@customer.com',
          password: 'test123', // This should be hashed in real scenario
          status: 'ACTIVE'
        }
      });
      
      console.log('✅ Test customer created:', newCustomer.customerId);
      
      // Use the new customer
      customer = newCustomer;
    }

    console.log('Using customer:', customer.name, customer.customerId);

    // Create a new support request
    const supportRequest = await prisma.customerSupportRequest.create({
      data: {
        customerId: customer.id,
        message: 'I need help with my account setup. The login is not working properly and I cannot access my dashboard.',
        status: 'PENDING'
      },
      include: {
        customer: {
          select: {
            customerId: true,
            name: true,
            phone: true,
            email: true
          }
        }
      }
    });

    console.log('✅ Test customer support request created:');
    console.log('   ID:', supportRequest.id);
    console.log('   Customer:', supportRequest.customer.name);
    console.log('   Message:', supportRequest.message);
    console.log('   Status:', supportRequest.status);

    return supportRequest;

  } catch (error) {
    console.error('Error creating test customer support request:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCustomerSupportRequest();