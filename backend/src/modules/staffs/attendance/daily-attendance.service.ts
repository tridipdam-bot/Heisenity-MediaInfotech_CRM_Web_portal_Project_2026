import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/utils/date";
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

    // Find employee
    const employee = await prisma.employee.findUnique({
      where: { employeeId: data.employeeId }
    });

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    // Allow both field engineers and office employees
    if (employee.role !== 'FIELD_ENGINEER' && employee.role !== 'IN_OFFICE') {
      return { 
        success: false, 
        message: 'Daily clock-in is only available for field engineers and office employees' 
      };
    }

    // Check if already clocked in today
    let attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } }
    });

    if (attendance?.clockIn) {
      return {
        success: true,
        message: 'You are already clocked in for today',
        data: {
          attendanceId: attendance.id,
          clockIn: attendance.clockIn.toISOString(),
          clockOut: attendance.clockOut?.toISOString(),
          approvalStatus: attendance.approvalStatus,
          needsApproval: false
        }
      };
    }

    if (attendance?.locked) {
      return { success: false, message: 'Attendance is locked and cannot be modified' };
    }

    const deviceInfo = getDeviceInfo(data.userAgent);
    const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
    const locationText = data.locationText || 'Field Location';

    if (attendance) {
      // Update existing attendance record
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          pendingCheckInAt: now,
          approvalStatus: 'PENDING',
          location: locationText,
          ipAddress: data.ipAddress,
          deviceInfo: deviceString,
          photo: data.photo,
          source: 'SELF',
          updatedAt: now
        }
      });
    } else {
      // Create new attendance record
      attendance = await prisma.attendance.create({
        data: {
          employeeId: employee.id,
          date: today,
          clockIn: null, // Will be set after admin approval
          clockOut: null,
          pendingCheckInAt: now,
          approvalStatus: 'PENDING',
          status: 'PRESENT',
          location: locationText,
          ipAddress: data.ipAddress,
          deviceInfo: deviceString,
          photo: data.photo,
          source: 'SELF',
          attemptCount: 'ZERO',
          locked: false
        }
      });
    }

    // Notify admin for approval
    try {
      const notificationService = new NotificationService();
      await notificationService.createAdminNotification({
        type: 'ATTENDANCE_APPROVAL_REQUEST',
        title: 'Field Engineer Clock-In Approval Required',
        message: `${employee.name} (${employee.employeeId}) has clocked in and requires approval.`,
        data: {
          attendanceId: attendance.id,
          employeeId: data.employeeId,
          employeeName: employee.name,
          employeeRole: employee.role,
          checkInTime: now.toISOString(),
          location: locationText,
          status: 'PRESENT',
          photo: data.photo
        }
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the clock-in if notification fails
    }

    return {
      success: true,
      message: 'Clock-in submitted successfully. Waiting for admin approval.',
      data: {
        attendanceId: attendance.id,
        approvalStatus: 'PENDING',
        needsApproval: true
      }
    };

  } catch (error) {
    console.error('Daily clock-in error:', error);
    return { 
      success: false, 
      message: 'Failed to clock in. Please try again.' 
    };
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

    // Find employee
    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    // Allow both field engineers and office employees
    if (employee.role !== 'FIELD_ENGINEER' && employee.role !== 'IN_OFFICE') {
      return { 
        success: false, 
        message: 'Daily clock-out is only available for field engineers and office employees' 
      };
    }

    // Get today's attendance
    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } }
    });

    if (!attendance) {
      return { success: false, message: 'No attendance record found for today' };
    }

    if (!attendance.clockIn) {
      return { 
        success: false, 
        message: 'You need to clock in first (and get approval) before clocking out' 
      };
    }

    if (attendance.clockOut) {
      return {
        success: true,
        message: 'You have already clocked out for today',
        data: {
          attendanceId: attendance.id,
          clockIn: attendance.clockIn.toISOString(),
          clockOut: attendance.clockOut.toISOString(),
          approvalStatus: attendance.approvalStatus,
          needsApproval: false
        }
      };
    }

    // Set clock-out time
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: now,
        updatedAt: now
      }
    });

    // Auto-unassign vehicle
    try {
      const vehicleService = new VehicleService();
      const vehicleResult = await vehicleService.getEmployeeVehicle(employeeId);

      if (vehicleResult.success && vehicleResult.data) {
        const vehicle = vehicleResult.data;
        const unassignResult = await vehicleService.unassignVehicle(vehicle.id);

        if (unassignResult.success) {
          // Notify admin about vehicle unassignment
          const notificationService = new NotificationService();
          await notificationService.createAdminNotification({
            type: 'VEHICLE_UNASSIGNED',
            title: 'Vehicle Auto-Unassigned',
            message: `Vehicle ${vehicle.vehicleNumber} has been automatically unassigned from ${employee.name} after daily clock-out.`,
            data: {
              vehicleId: vehicle.id,
              vehicleNumber: vehicle.vehicleNumber,
              employeeId: employeeId,
              employeeName: employee.name,
              clockOutTime: now.toISOString()
            }
          });
        }
      }
    } catch (vehicleError) {
      console.error('Vehicle unassignment error:', vehicleError);
      // Don't fail clock-out if vehicle unassignment fails
    }

    // Notify admin about clock-out
    try {
      const notificationService = new NotificationService();
      await notificationService.createAdminNotification({
        type: 'ATTENDANCE_ALERT',
        title: 'Field Engineer Clocked Out',
        message: `${employee.name} (${employee.employeeId}) has clocked out for the day.`,
        data: {
          attendanceId: updatedAttendance.id,
          employeeId: employeeId,
          employeeName: employee.name,
          clockOutTime: now.toISOString(),
          totalHours: calculateWorkHours(attendance.clockIn, now)
        }
      });
    } catch (notificationError) {
      console.error('Failed to send clock-out notification:', notificationError);
      // Don't fail the clock-out if notification fails
    }

    return {
      success: true,
      message: 'Successfully clocked out for the day',
      data: {
        attendanceId: updatedAttendance.id,
        clockIn: updatedAttendance.clockIn!.toISOString(),
        clockOut: updatedAttendance.clockOut!.toISOString(),
        approvalStatus: updatedAttendance.approvalStatus,
        needsApproval: false
      }
    };

  } catch (error) {
    console.error('Daily clock-out error:', error);
    return { 
      success: false, 
      message: 'Failed to clock out. Please try again.' 
    };
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

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } }
    });

    return {
      success: true,
      data: {
        hasAttendance: !!attendance,
        clockIn: attendance?.clockIn?.toISOString() || null,
        clockOut: attendance?.clockOut?.toISOString() || null,
        approvalStatus: attendance?.approvalStatus || 'NOT_REQUIRED',
        needsApproval: attendance?.approvalStatus === 'PENDING',
        isPendingApproval: attendance?.approvalStatus === 'PENDING' && !attendance?.clockIn,
        canClockOut: !!attendance?.clockIn && !attendance?.clockOut,
        workHours: attendance?.clockIn && attendance?.clockOut 
          ? calculateWorkHours(attendance.clockIn, attendance.clockOut)
          : null,
        approvalReason: attendance?.approvalReason || null,
        rejectedBy: attendance?.rejectedBy || null,
        rejectedAt: attendance?.rejectedAt?.toISOString() || null
      }
    };

  } catch (error) {
    console.error('Get daily attendance status error:', error);
    return { success: false, message: 'Failed to get attendance status' };
  }
}

/**
 * Helper function to calculate work hours
 */
function calculateWorkHours(clockIn: Date, clockOut: Date): string {
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHours}h ${diffMinutes}m`;
}

