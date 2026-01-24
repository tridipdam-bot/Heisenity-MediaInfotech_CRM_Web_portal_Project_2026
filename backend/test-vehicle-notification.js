/**
 * Test script to verify vehicle unassignment notification fix
 * This script simulates the clock-out process to ensure notifications are sent
 */

const { PrismaClient } = require('@prisma/client');
const { dailyClockOut } = require('./src/modules/staffs/attendance/daily-attendance.service');

const prisma = new PrismaClient();

async function testVehicleNotification() {
  try {
    console.log('🧪 Testing vehicle unassignment notification fix...');
    
    // Find a field engineer with an assigned vehicle
    const employee = await prisma.employee.findFirst({
      where: {
        role: 'FIELD_ENGINEER',
        vehicles: {
          some: {
            status: 'ASSIGNED'
          }
        }
      },
      include: {
        vehicles: true
      }
    });

    if (!employee) {
      console.log('❌ No field engineer with assigned vehicle found for testing');
      return;
    }

    console.log(`✅ Found test employee: ${employee.name} (${employee.employeeId})`);
    console.log(`🚗 Assigned vehicle: ${employee.vehicles[0]?.vehicleNumber}`);

    // Check current notifications count
    const notificationsBefore = await prisma.adminNotification.count({
      where: { type: 'VEHICLE_UNASSIGNED' }
    });
    console.log(`📊 Vehicle unassignment notifications before: ${notificationsBefore}`);

    // Simulate clock-out (this should trigger vehicle unassignment and notification)
    console.log('⏰ Simulating clock-out...');
    const result = await dailyClockOut(employee.employeeId);
    
    if (result.success) {
      console.log('✅ Clock-out successful');
      
      // Check notifications after
      const notificationsAfter = await prisma.adminNotification.count({
        where: { type: 'VEHICLE_UNASSIGNED' }
      });
      console.log(`📊 Vehicle unassignment notifications after: ${notificationsAfter}`);
      
      if (notificationsAfter > notificationsBefore) {
        console.log('🎉 SUCCESS: Vehicle unassignment notification was created!');
        
        // Show the latest notification
        const latestNotification = await prisma.adminNotification.findFirst({
          where: { type: 'VEHICLE_UNASSIGNED' },
          orderBy: { createdAt: 'desc' }
        });
        
        console.log('📧 Latest notification:');
        console.log(`   Title: ${latestNotification.title}`);
        console.log(`   Message: ${latestNotification.message}`);
        console.log(`   Data: ${latestNotification.data}`);
      } else {
        console.log('❌ FAILED: No vehicle unassignment notification was created');
      }
    } else {
      console.log(`❌ Clock-out failed: ${result.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testVehicleNotification();