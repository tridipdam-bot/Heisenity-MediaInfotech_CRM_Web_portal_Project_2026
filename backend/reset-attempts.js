// Reset attendance attempts for debugging
import "dotenv/config";
import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
  ssl: false
});

const prisma = new PrismaClient({ adapter });

async function resetAttendanceAttempts(employeeId) {
  try {
    console.log(`Resetting attempts for employee: ${employeeId}`);
    
    // Find the employee
    const employee = await prisma.fieldEngineer.findUnique({
      where: { employeeId }
    });
    
    if (!employee) {
      console.log('Employee not found');
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check existing attendance record
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today
        }
      }
    });
    
    if (existingAttendance) {
      console.log('Existing attendance record:', {
        status: existingAttendance.status,
        attemptCount: existingAttendance.attemptCount,
        locked: existingAttendance.locked,
        lockedReason: existingAttendance.lockedReason
      });
      
      // Reset the attempts
      await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          attemptCount: 'ZERO',
          locked: false,
          lockedReason: '',
          status: 'PRESENT' // Reset status if it was ABSENT
        }
      });
      
      console.log('Attempts reset successfully');
    } else {
      console.log('No existing attendance record found for today');
    }
    
  } catch (error) {
    console.error('Error resetting attempts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get employee ID from command line argument
const employeeId = process.argv[2];
if (!employeeId) {
  console.log('Usage: node reset-attempts.js <employeeId>');
  process.exit(1);
}

resetAttendanceAttempts(employeeId);