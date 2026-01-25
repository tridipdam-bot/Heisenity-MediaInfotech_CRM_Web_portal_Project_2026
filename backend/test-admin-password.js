require('dotenv').config();
const bcrypt = require('bcryptjs');
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

async function testAdminPassword() {
  try {
    console.log('Testing admin password...');
    
    const admin = await prisma.admin.findFirst({
      where: { 
        AND: [
          { email: 'admin@company.com' },
          { adminId: 'ADMIN001' }
        ]
      }
    });

    if (!admin) {
      console.log('Admin not found');
      return;
    }

    console.log('Found admin:', { id: admin.id, email: admin.email, adminId: admin.adminId });
    
    const testPassword = 'admin123';
    const passwordMatch = await bcrypt.compare(testPassword, admin.password);
    
    console.log('Password test result:', passwordMatch);
    console.log('Stored hash:', admin.password);
    console.log('Test password:', testPassword);

  } catch (error) {
    console.error('Error testing admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPassword();