import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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

async function seedTeams() {
  console.log('Seeding teams...');

  try {
    // Create sample teams
    const teams = [
      {
        name: 'Development Team',
        description: 'Software development and engineering team'
      },
      {
        name: 'Field Operations',
        description: 'On-site field engineers and technicians'
      },
      {
        name: 'Support Team',
        description: 'Customer support and maintenance team'
      },
      {
        name: 'Sales Team',
        description: 'Sales and business development team'
      }
    ];

    for (const team of teams) {
      const existingTeam = await prisma.team.findUnique({
        where: { name: team.name }
      });

      if (!existingTeam) {
        await prisma.team.create({
          data: team
        });
        console.log(`Created team: ${team.name}`);
      } else {
        console.log(`Team already exists: ${team.name}`);
      }
    }

    console.log('Teams seeded successfully!');
  } catch (error) {
    console.error('Error seeding teams:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTeams();
