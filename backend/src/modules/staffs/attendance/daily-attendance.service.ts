import { prisma } from "@/lib/prisma";
import { getDateAtMidnight, getTodayDate } from "@/utils/date";
import { getDeviceInfo } from "@/utils/deviceinfo";
import { VehicleService } from "../vehicles/vehicle.service";
import { NotificationService } from "../../notifications/notification.service";

/**
 * =============================================================================
 * DAILY ATTENDANCE SERVICE (CLOCK-IN/CLOCK-OUT)
 * =============================================================================
 * This service handles ONLY day-level clock-in/clock-out operations.
 * It is completely separate from task-level check-in/checkout functionality.
 * 
 * Purpose: Track daily work hours and attendance approval for field engineers
 * Scope: Daily attendance management only
 * =============================================================================
 */

export interface DailyClockInData {
  employeeId: string;
  ipAddress: string;
  userAgent: string;
  photo?: string;
  locationText?: string;
}

export interface DailyAttendanceResult {
  success: boolean;
  message: string;
  data?: {
    attendanceId: string;
    clockIn?: string;
    clockOut?: string;
    approvalStatus: string;
    needsApproval: boolean;
  };
}

/**
 * DAILY CLOCK-IN: Employee starts their workday
 * - Creates attendance record with PENDING approval status
 * - Stores pending timestamp for admin approval
 * - Notifies admin for approval
 * - Does NOT affect task check-in/checkout
 */
export async function dailyClockIn(data: DailyClockInData): Promise<DailyAttendanceResult> {
  try {
    const today = getTodayDate();
    const now = new Date();

    const employee = await prisma.employee.findUnique({
      where: { employeeId: data.employeeId }
    });

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    if (employee.role !== 'FIELD_ENGINEER' && employee.role !== 'IN_OFFICE') {
      return { success: false, message: 'Clock-in not allowed for this role' };
    }

    const deviceInfo = getDeviceInfo(data.userAgent);
    const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;

    const start = today
    const end = new Date(today)
    end.setDate(end.getDate() + 1)

    let attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: start,
          lt: end
        }
      }
    });

    let isNewAttendance = false;

    // Create attendance if it doesn't exist
    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date: today,
          status: 'PRESENT',
          approvalStatus: 'PENDING',
          location: data.locationText || 'Field Location',
          ipAddress: data.ipAddress,
          deviceInfo: deviceString,
          source: 'SELF'
        }
      });
      isNewAttendance = true;
      console.log('Created new attendance record:', attendance.id, 'for employee:', employee.employeeId);
    }

    if (attendance.locked) {
      return { success: false, message: 'Attendance is locked and cannot be modified' };
    }

    // 2️⃣ Check for OPEN session
    const openSession = await prisma.attendanceSession.findFirst({
      where: {
        attendanceId: attendance.id,
        clockOut: null
      }
    });

    if (openSession) {
      return {
        success: false,
        message: 'You are already clocked in'
      };
    }

    // 3️⃣ Handle first clock-in vs subsequent clock-ins differently
    if (!attendance.clockIn && (attendance.approvalStatus === 'PENDING' || attendance.approvalStatus === 'NOT_REQUIRED')) {
      if (attendance.approvalStatus === 'NOT_REQUIRED') {
        // Re-enabled attendance - create session immediately without approval
        const session = await prisma.attendanceSession.create({
          data: {
            attendanceId: attendance.id,
            clockIn: now,
            photo: data.photo,
            location: data.locationText,
            ipAddress: data.ipAddress,
            deviceInfo: deviceString
          }
        });

        // Set the official clockIn time
        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            clockIn: now,
            approvalStatus: 'APPROVED',
            photo: data.photo,
            location: data.locationText || attendance.location,
            ipAddress: data.ipAddress,
            deviceInfo: deviceString,
            updatedAt: now
          }
        });

        console.log('Re-enabled attendance - created session immediately for employee:', employee.employeeId);
      } else {
        // FIRST CLOCK-IN OF THE DAY - Store pending, don't create session yet
        await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            pendingCheckInAt: now,  // Store for admin approval
            photo: data.photo,
            location: data.locationText || attendance.location,
            ipAddress: data.ipAddress,
            deviceInfo: deviceString,
            updatedAt: now
          }
        });
        console.log('Stored pending first clock-in for admin approval for employee:', employee.employeeId);
      }
    } else if (attendance.clockIn && attendance.approvalStatus === 'APPROVED') {
      // SUBSEQUENT CLOCK-IN - Day already approved, create session immediately
      await prisma.attendanceSession.create({
        data: {
          attendanceId: attendance.id,
          clockIn: now,
          photo: data.photo,
          location: data.locationText,
          ipAddress: data.ipAddress,
          deviceInfo: deviceString
        }
      });
      console.log('Created new session for already approved attendance for employee:', employee.employeeId);
    } else if (attendance.approvalStatus === 'REJECTED') {
      return {
        success: false,
        message: 'Your attendance was rejected. Please contact admin to re-enable clock-in.'
      };
    } else {
      // Edge case: attendance exists but not approved yet
      return {
        success: false,
        message: 'Please wait for admin approval of your first clock-in before clocking in again.'
      };
    }

    // 🔔 Notify admin for approval (only for new attendance records that need approval)
    if (isNewAttendance && attendance.approvalStatus === 'PENDING') {
      try {
        console.log('Sending admin notification for new attendance:', attendance.id);
        const notificationService = new NotificationService();
        const notificationResult = await notificationService.createAdminNotification({
          type: 'ATTENDANCE_APPROVAL_REQUEST',
          title: 'Attendance Approval Required',
          message: `${employee.name} (${employee.employeeId}) has clocked in and requires approval.`,
          data: {
            attendanceId: attendance.id,
            employeeId: employee.employeeId,
            employeeName: employee.name,
            employeeRole: employee.role,
            checkInTime: now.toISOString(), // Use checkInTime (not clockInTime) to match frontend
            pendingCheckInAt: now.toISOString(),
            location: data.locationText || 'Field Location',
            photo: data.photo, // Include the clock-in photo
            ipAddress: data.ipAddress,
            deviceInfo: deviceString,
            timestamp: now.toISOString(),
            status: 'PRESENT'
          }
        });

        if (notificationResult.success) {
          console.log('Admin notification created successfully for attendance:', attendance.id);
        } else {
          console.error('Failed to create admin notification:', notificationResult.error);
        }
      } catch (err) {
        console.error('Admin notification error:', err);
      }
    } else {
      console.log('Skipping notification - isNewAttendance:', isNewAttendance, 'approvalStatus:', attendance.approvalStatus);
    }

    return {
      success: true,
      message: 'Clock-in successful',
      data: {
        attendanceId: attendance.id,
        approvalStatus: attendance.approvalStatus,
        needsApproval: attendance.approvalStatus === 'PENDING'
      }
    };



  } catch (error) {
    console.error('Daily clock-in error:', error);
    return { success: false, message: 'Failed to clock in. Please try again.' };
  }
}

/**
 * DAILY CLOCK-OUT: Employee ends their workday
 * - Sets clock-out timestamp
 * - Auto-unassigns vehicle (for field engineers)
 * - Notifies admin
 * - Does NOT affect task check-in/checkout
 */
export async function dailyClockOut(employeeId: string): Promise<DailyAttendanceResult> {
  try {
    const today = getTodayDate();
    const now = new Date();

    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    if (employee.role !== 'FIELD_ENGINEER' && employee.role !== 'IN_OFFICE') {
      return { success: false, message: 'Clock-out not allowed for this role' };
    }

    const start = today
    const end = new Date(today)
    end.setDate(end.getDate() + 1)

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: start,
          lt: end
        }
      }
    });

    if (!attendance) {
      return { success: false, message: 'No attendance record found for today' };
    }

    if (attendance.locked) {
      return { success: false, message: 'Attendance is locked and cannot be modified' };
    }

    // 🔑 Find OPEN session
    const openSession = await prisma.attendanceSession.findFirst({
      where: {
        attendanceId: attendance.id,
        clockOut: null
      },
      orderBy: { clockIn: 'desc' }
    });

    if (!openSession) {
      return { success: false, message: 'No active clock-in session found' };
    }

    // 🔒 Close session and update main attendance record
    await prisma.attendanceSession.update({
      where: { id: openSession.id },
      data: { clockOut: now }
    });

    // Update the main attendance record with the final clock-out time
    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: now,
        updatedAt: now
      }
    });

    console.log('Clock-out completed for employee:', employeeId, 'at:', now.toISOString());

    // 🚗 Auto-unassign vehicle and notify admin
    try {
      const vehicleService = new VehicleService();
      const vehicleResult = await vehicleService.getEmployeeVehicle(employeeId);

      if (vehicleResult.success && vehicleResult.data) {
        const vehicle = vehicleResult.data;
        const unassignResult = await vehicleService.unassignVehicle(vehicle.id);

        // Create specific notification for vehicle unassignment
        if (unassignResult.success) {
          const notificationService = new NotificationService();
          await notificationService.createAdminNotification({
            type: 'VEHICLE_UNASSIGNED',
            title: 'Vehicle Auto-Unassigned',
            message: `Vehicle ${vehicle.vehicleNumber} has been automatically unassigned from ${employee.name} after clock-out.`,
            data: {
              vehicleId: vehicle.id,
              vehicleNumber: vehicle.vehicleNumber,
              employeeId: employeeId,
              employeeName: employee.name,
              clockOutTime: now.toISOString(),
              type: 'automatic'
            }
          });
        }
      }
    } catch (err) {
      console.error('Vehicle unassign error:', err);
    }

    // 🔔 Notify admin
    try {
      const notificationService = new NotificationService();
      await notificationService.createAdminNotification({
        type: 'ATTENDANCE_ALERT',
        title: 'Employee Clocked Out',
        message: `${employee.name} (${employee.employeeId}) has clocked out.`,
        data: {
          attendanceId: attendance.id,
          employeeId,
          employeeName: employee.name,
          clockOutTime: now.toISOString()
        }
      });
    } catch (err) {
      console.error('Clock-out notification error:', err);
    }

    return {
      success: true,
      message: 'Clock-out successful',
      data: {
        attendanceId: attendance.id,
        approvalStatus: attendance.approvalStatus,
        needsApproval: false
      }
    };

  } catch (error) {
    console.error('Daily clock-out error:', error);
    return { success: false, message: 'Failed to clock out. Please try again.' };
  }
}

/**
 * Get current daily attendance status
 */
export async function getDailyAttendanceStatus(employeeId: string) {
  try {
    const today = getTodayDate();

    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    const start = today
    const end = new Date(today)
    end.setDate(end.getDate() + 1)

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId: employee.id,
        date: {
          gte: start,
          lt: end
        }
      },
      include: {
        sessions: {
          orderBy: { clockIn: 'asc' }
        }
      }
    });


    if (!attendance) {
      return {
        success: true,
        data: {
          hasAttendance: false,
          clockIn: null,
          clockOut: null,
          isClockedIn: false,
          canClockOut: false,
          workHours: null,
          approvalStatus: 'NOT_REQUIRED',
          needsApproval: false,
          isPendingApproval: false,
          approvalReason: null,
          rejectedBy: null,
          rejectedAt: null
        }
      };
    }

    const openSession = attendance.sessions.find(s => s.clockOut === null);
    const latestSession = attendance.sessions[attendance.sessions.length - 1];

    const totalMs = attendance.sessions.reduce((sum, session) => {
      if (!session.clockOut) return sum;
      return sum + (session.clockOut.getTime() - session.clockIn.getTime());
    }, 0);

    const workHours =
      totalMs > 0
        ? formatDuration(totalMs)
        : null;

    return {
      success: true,
      data: {
        hasAttendance: true,
        clockIn: attendance.clockIn?.toISOString() || null,  // Only show clockIn if approved
        clockOut: attendance.clockOut?.toISOString() || null,
        isClockedIn: !!openSession,
        canClockOut: !!openSession,  // Can clock out if there's an open session (regardless of approval status for subsequent sessions)
        workHours,
        approvalStatus: attendance.approvalStatus,
        needsApproval: attendance.approvalStatus === 'PENDING',
        isPendingApproval: attendance.approvalStatus === 'PENDING',
        approvalReason: attendance.approvalReason || null,
        rejectedBy: attendance.rejectedBy || null,
        rejectedAt: attendance.rejectedAt?.toISOString() || null,
        pendingCheckInAt: attendance.pendingCheckInAt?.toISOString() || null,  // Show pending time for reference
        hasOpenSession: !!openSession  // Add this to help frontend logic
      }
    };

  } catch (error) {
    console.error('Get daily attendance status error:', error);
    return { success: false, message: 'Failed to get attendance status' };
  }
}

export async function approveDailyAttendance(attendanceId: string, adminId: string) {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { sessions: true }
  });

  if (!attendance) {
    throw new Error('Attendance not found');
  }

  if (attendance.approvalStatus !== 'PENDING') {
    throw new Error('Attendance is not pending');
  }

  const clockInTime = attendance.pendingCheckInAt || new Date();

  const correctedDate = getDateAtMidnight(clockInTime)

  await prisma.attendanceSession.create({
    data: {
      attendanceId: attendance.id,
      clockIn: clockInTime,
      photo: attendance.photo,
      location: attendance.location,
      ipAddress: attendance.ipAddress,
      deviceInfo: attendance.deviceInfo
    }
  });

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      approvalStatus: 'APPROVED',
      approvedBy: adminId,
      approvedAt: new Date(),
      clockIn: clockInTime,
      pendingCheckInAt: null,
      date: correctedDate
    }
  });

  console.log('Attendance approved, clockIn set, and FIRST session created for attendance:', attendanceId);
}


/**
 * Helper function to calculate work hours
 */
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}


