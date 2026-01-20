import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from 'bcryptjs';

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

async function seedAdmin() {
  console.log('Seeding admin account...');

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    // Create admin account
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.admin.create({
      data: {
        adminId: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@example.com',
        password: hashedPassword,
        phone: '+1234567890',
        status: 'ACTIVE'
      }
    });

    console.log('Admin created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('Admin ID:', admin.adminId);

  } catch (error) {
    console.error('Error seeding admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();