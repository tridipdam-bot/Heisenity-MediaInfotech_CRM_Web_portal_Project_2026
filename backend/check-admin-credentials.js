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

async function checkAdminCredentials() {
  try {
    console.log('Checking admin credentials...');
    
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        adminId: true,
        name: true,
        email: true,
        password: true
      }
    });

    console.log('Found admins:', admins);

  } catch (error) {
    console.error('Error checking admin credentials:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminCredentials();