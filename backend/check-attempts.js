// Check attendance attempts for debugging
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

async function checkAttendanceAttempts(employeeId) {
  try {
    console.log(`Checking attempts for employee: ${employeeId}`);
    
    // Find the employee
    const employee = await prisma.fieldEngineer.findUnique({
      where: { employeeId }
    });
    
    if (!employee) {
      console.log('Employee not found');
      return;
    }
    
    console.log('Employee found:', {
      id: employee.id,
      name: employee.name,
      employeeId: employee.employeeId
    });
    
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
      console.log('Existing attendance record for today:', {
        id: existingAttendance.id,
        status: existingAttendance.status,
        attemptCount: existingAttendance.attemptCount,
        locked: existingAttendance.locked,
        lockedReason: existingAttendance.lockedReason,
        location: existingAttendance.location,
        createdAt: existingAttendance.createdAt,
        updatedAt: existingAttendance.updatedAt
      });
    } else {
      console.log('No existing attendance record found for today');
    }
    
    // Check assigned location for today
    const assignedLocation = await prisma.dailyLocation.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: today
        }
      }
    });
    
    if (assignedLocation) {
      console.log('Assigned location for today:', {
        address: assignedLocation.address,
        city: assignedLocation.city,
        state: assignedLocation.state,
        latitude: assignedLocation.latitude,
        longitude: assignedLocation.longitude,
        radius: assignedLocation.radius,
        startTime: assignedLocation.startTime,
        endTime: assignedLocation.endTime
      });
    } else {
      console.log('No assigned location found for today');
    }
    
  } catch (error) {
    console.error('Error checking attempts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get employee ID from command line argument
const employeeId = process.argv[2];
if (!employeeId) {
  console.log('Usage: node check-attempts.js <employeeId>');
  process.exit(1);
}

checkAttendanceAttempts(employeeId);