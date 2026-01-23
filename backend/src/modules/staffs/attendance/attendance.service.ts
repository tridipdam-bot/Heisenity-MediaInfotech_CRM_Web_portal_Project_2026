import { prisma } from '../../../lib/prisma'
import { AttendanceRecord } from './attendance.types'
import { getDeviceInfo } from '../../../utils/deviceinfo'
import { getTodayDate } from '../../../utils/date'
import { VehicleService } from '../vehicles/vehicle.service'
import { NotificationService } from '../../notifications/notification.service'

const MAX_ATTEMPTS = 3

/**
 * =============================================================================
 * CRITICAL BUSINESS RULES - DO NOT VIOLATE
 * =============================================================================
 * 1. ONE attendance record per employee per day
 * 2. clockIn = START OF DAY, set ONLY ONCE after admin approval
 * 3. Tasks NEVER create, overwrite, reset, or nullify clockIn
 * 4. Field Engineers require admin approval ONLY for FIRST check-in of day
 * 5. After first approval, employee can freely check in/out of tasks
 * 6. clockIn must NEVER disappear once approved
 * 7. Task lifecycle is INDEPENDENT from day attendance lifecycle
 * =============================================================================
 */

// Helper functions for attempt count conversion
function attemptCountToNumber(attemptCount: any): number {
  if (attemptCount === 'ZERO') return 0
  if (attemptCount === 'ONE') return 1
  if (attemptCount === 'TWO') return 2
  if (attemptCount === 'THREE') return 3
  return 0
}

/**
 * DAY-LEVEL: Field Engineer clicks CHECK-IN (first time of the day)
 * - If no clockIn exists → set approvalStatus = PENDING, store pendingCheckInAt
 * - If clockIn exists (already approved) → allow immediate task check-in
 * - Notify admin for approval
 */
export async function fieldEngineerCheckIn(data: {
  employeeId: string
  ipAddress: string
  userAgent: string
  photo?: string
  locationText?: string
}): Promise<AttendanceRecord> {
  const today = getTodayDate()
  const now = new Date()

  const employee = await prisma.employee.findUnique({ where: { employeeId: data.employeeId } })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')

  // Get or create today's attendance record
  let attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } }
  })

  if (attendance && attendance.locked) {
    throw new Error('ATTENDANCE_LOCKED')
  }

  const deviceInfo = getDeviceInfo(data.userAgent)
  const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`
  const locationText = data.locationText || 'Office Location'

  // INVARIANT: If clockIn exists, day is already approved
  if (attendance?.clockIn) {
    // Day already approved - return current status
    return {
      employeeId: data.employeeId,
      timestamp: now.toISOString(),
      location: locationText,
      ipAddress: data.ipAddress,
      deviceInfo: deviceString,
      photo: data.photo,
      status: attendance.status as any
    }
  }

  // FIRST CHECK-IN OF THE DAY - requires approval
  if (!attendance) {
    // Create new attendance record with PENDING status
    attendance = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        date: today,
        clockIn: null, // DO NOT set clockIn yet
        clockOut: null,
        pendingCheckInAt: now, // Store pending timestamp
        approvalStatus: 'PENDING',
        status: 'PRESENT', // Prisma enum value
        location: locationText,
        ipAddress: data.ipAddress,
        deviceInfo: deviceString,
        photo: data.photo,
        source: 'SELF',
        attemptCount: 'ZERO',
        locked: false
      }
    })
  } else {
    // Update existing attendance to PENDING
    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        pendingCheckInAt: now,
        approvalStatus: 'PENDING',
        ipAddress: data.ipAddress,
        deviceInfo: deviceString,
        photo: data.photo || attendance.photo,
        location: locationText,
        updatedAt: now
      }
    })
  }

  // Notify admin for approval
  try {
    const notificationService = new NotificationService()
    await notificationService.createAdminNotification({
      type: 'ATTENDANCE_APPROVAL_REQUEST',
      title: 'Attendance Approval Required',
      message: `${employee.name} (${data.employeeId}) has checked in and requires attendance approval.`,
      data: {
        attendanceId: attendance.id,
        employeeId: data.employeeId,
        employeeName: employee.name,
        employeeRole: employee.role,
        checkInTime: now.toISOString(),
        location: locationText,
        photo: attendance.photo
      }
    })
  } catch (error) {
    console.error('Error creating attendance approval notification:', error)
  }

  return {
    employeeId: data.employeeId,
    timestamp: now.toISOString(),
    location: locationText,
    ipAddress: data.ipAddress,
    deviceInfo: deviceString,
    photo: data.photo,
    status: 'present' as any // Return lowercase for API compatibility
  }
}

/**
 * DAY-LEVEL: Field Engineer clocks out for the day
 * - Sets clockOut (end of workday)
 * - Does NOT modify clockIn
 * - Auto-unassigns vehicle
 */
export async function dayClockOut(employeeId: string): Promise<{ success: boolean; message: string; data?: any }> {
  const today = getTodayDate()
  const now = new Date()

  const employee = await prisma.employee.findUnique({ where: { employeeId } })
  if (!employee) {
    return { success: false, message: 'Employee not found' }
  }

  if (employee.role !== 'FIELD_ENGINEER') {
    return { success: false, message: 'Day clock-out is only available for field engineers' }
  }

  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } }
  })

  if (!attendance) {
    return { success: false, message: 'No attendance record found for today' }
  }

  // INVARIANT: Must have clockIn to clock out
  if (!attendance.clockIn) {
    return { success: false, message: 'You need to check in first before clocking out for the day' }
  }

  if (attendance.clockOut) {
    return { success: false, message: 'You have already clocked out for the day' }
  }

  // Set clockOut (DO NOT modify clockIn)
  const updatedAttendance = await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      clockOut: now,
      updatedAt: now
    }
  })

  // Auto-unassign vehicle
  try {
    const vehicleService = new VehicleService()
    const notificationService = new NotificationService()

    const vehicleResult = await vehicleService.getEmployeeVehicle(employeeId)

    if (vehicleResult.success && vehicleResult.data) {
      const vehicle = vehicleResult.data
      const unassignResult = await vehicleService.unassignVehicle(vehicle.id)

      if (unassignResult.success) {
        await notificationService.createAdminNotification({
          type: 'VEHICLE_UNASSIGNED',
          title: 'Vehicle Auto-Unassigned',
          message: `Vehicle ${vehicle.vehicleNumber} has been automatically unassigned from ${employee.name} after day clock-out.`,
          data: {
            vehicleId: vehicle.id,
            vehicleNumber: vehicle.vehicleNumber,
            employeeId: employeeId,
            employeeName: employee.name,
            clockoutTime: updatedAttendance.clockOut?.toISOString()
          }
        })
      }
    }
  } catch (error) {
    console.error('Error in vehicle unassignment during day clock-out:', error)
  }

  return {
    success: true,
    message: 'Day clock-out successful',
    data: {
      clockOut: updatedAttendance.clockOut?.toISOString()
    }
  }
}

/**
 * ADMIN: Approve attendance - set clockIn atomically
 * - Uses pendingCheckInAt as the clockIn timestamp
 * - Sets approvalStatus = APPROVED
 * - Clears pendingCheckInAt
 * - If task is assigned, mark it as IN_PROGRESS
 * - This operation is ATOMIC and IRREVERSIBLE
 */
export async function approveAttendance(
  attendanceId: string,
  adminId: string,
  reason?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            role: true
          }
        }
      }
    })

    if (!attendance) {
      return { success: false, message: 'Attendance record not found' }
    }

    if (attendance.approvalStatus === 'APPROVED') {
      return { success: false, message: 'Attendance already approved' }
    }

    // INVARIANT: Use pendingCheckInAt as clockIn, fallback to now
    const clockInTime = attendance.pendingCheckInAt || new Date()
    const now = new Date()

    // Prepare update data
    const updateData: any = {
      clockIn: clockInTime, // SET clockIn - this is the START OF DAY
      approvalStatus: 'APPROVED',
      approvedBy: adminId,
      approvedAt: now,
      approvalReason: reason || 'Approved by admin',
      pendingCheckInAt: null, // Clear pending timestamp
      updatedAt: now
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: updateData
    })

    // Notifications
    try {
      const notificationService = new NotificationService()
      await notificationService.removeAttendanceApprovalNotification(attendanceId)
      await notificationService.createAdminNotification({
        type: 'ATTENDANCE_APPROVED',
        title: 'Attendance Approved',
        message: `Attendance for ${attendance.employee.name} (${attendance.employee.employeeId}) has been approved.`,
        data: {
          attendanceId,
          employeeId: attendance.employee.employeeId,
          employeeName: attendance.employee.name,
          approvedBy: adminId,
          approvedAt: updatedAttendance.approvedAt?.toISOString(),
          clockIn: updatedAttendance.clockIn?.toISOString()
        }
      })
    } catch (err) {
      console.warn('Notification error after approval:', err)
    }

    return {
      success: true,
      message: 'Attendance approved successfully',
      data: {
        attendance: updatedAttendance
      }
    }
  } catch (error) {
    console.error('Error approving attendance:', error)
    return { success: false, message: 'Failed to approve attendance' }
  }
}

/**
 * ADMIN: Reject attendance
 * - Sets approvalStatus = REJECTED
 * - Resets clockIn to null
 * - Sets status to ABSENT
 */
export async function rejectAttendance(
  attendanceId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            role: true
          }
        }
      }
    })

    if (!attendance) {
      return { success: false, message: 'Attendance record not found' }
    }

    if (attendance.approvalStatus === 'REJECTED') {
      return { success: false, message: 'Attendance already rejected' }
    }

    const now = new Date()

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        approvalStatus: 'REJECTED',
        rejectedBy: adminId,
        rejectedAt: now,
        approvalReason: reason,
        clockIn: null, // Reset clockIn
        clockOut: null,
        pendingCheckInAt: null,
        status: 'ABSENT',
        updatedAt: now
      }
    })

    // Notifications
    try {
      const notificationService = new NotificationService()
      await notificationService.removeAttendanceApprovalNotification(attendanceId)
      await notificationService.createAdminNotification({
        type: 'ATTENDANCE_REJECTED',
        title: 'Attendance Rejected',
        message: `Attendance for ${attendance.employee.name} (${attendance.employee.employeeId}) has been rejected. Reason: ${reason}`,
        data: {
          attendanceId,
          employeeId: attendance.employee.employeeId,
          employeeName: attendance.employee.name,
          rejectedBy: adminId,
          rejectedAt: updatedAttendance.rejectedAt?.toISOString(),
          reason
        }
      })
    } catch (err) {
      console.warn('Notification error after rejection:', err)
    }

    return {
      success: true,
      message: 'Attendance rejected successfully',
      data: updatedAttendance
    }
  } catch (error) {
    console.error('Error rejecting attendance:', error)
    return { success: false, message: 'Failed to reject attendance' }
  }
}

/**
 * Get pending attendance approvals
 */
export async function getPendingAttendanceApprovals(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const pendingAttendances = await prisma.attendance.findMany({
      where: {
        approvalStatus: 'PENDING'
      },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            email: true,
            phone: true,
            role: true,
            teamId: true,
            isTeamLeader: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedData = pendingAttendances.map(attendance => ({
      id: attendance.id,
      employeeId: attendance.employee.employeeId,
      employeeName: attendance.employee.name,
      email: attendance.employee.email,
      phone: attendance.employee.phone,
      role: attendance.employee.role,
      teamId: attendance.employee.teamId,
      isTeamLeader: attendance.employee.isTeamLeader,
      date: attendance.date.toISOString().split('T')[0],
      pendingCheckInAt: attendance.pendingCheckInAt?.toISOString(),
      status: attendance.status,
      location: attendance.location || 'Office Location',
      photo: attendance.photo,
      approvalStatus: attendance.approvalStatus,
      createdAt: attendance.createdAt.toISOString()
    }))

    return {
      success: true,
      data: formattedData
    }
  } catch (error) {
    console.error('Error getting pending attendance approvals:', error)
    return {
      success: false,
      error: 'Failed to get pending attendance approvals'
    }
  }
}

/**
 * Get remaining attempts for attendance
 */
export async function getRemainingAttempts(employeeId: string): Promise<{ remainingAttempts: number; isLocked: boolean; status?: string }> {
  const today = getTodayDate()

  const employee = await prisma.employee.findUnique({ where: { employeeId } })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')

  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } }
  })

  if (!attendance) {
    return { remainingAttempts: MAX_ATTEMPTS, isLocked: false }
  }

  if (attendance.locked) {
    return { remainingAttempts: 0, isLocked: true, status: attendance.status }
  }

  const used = attemptCountToNumber(attendance.attemptCount)
  return { remainingAttempts: Math.max(0, MAX_ATTEMPTS - used), isLocked: false, status: attendance.status }
}

/**
 * Legacy function for backward compatibility
 * Routes to appropriate function based on action
 */
export async function createAttendanceRecord(data: {
  employeeId: string
  ipAddress: string
  userAgent: string
  photo?: string
  status: string
  locationText?: string
  action?: 'check-in' | 'check-out'
}): Promise<AttendanceRecord> {
  // Route to appropriate function based on action
  if (data.action === 'check-in') {
    return fieldEngineerCheckIn(data)
  } else if (data.action === 'check-out') {
    // Day clock-out
    const result = await dayClockOut(data.employeeId)
    if (!result.success) {
      throw new Error(result.message)
    }
    return {
      employeeId: data.employeeId,
      timestamp: new Date().toISOString(),
      location: data.locationText || 'Office Location',
      ipAddress: data.ipAddress,
      deviceInfo: getDeviceInfo(data.userAgent).os,
      status: 'present' as any
    }
  } else {
    // Default to check-in
    return fieldEngineerCheckIn(data)
  }
}

/**
 * ADMIN: Re-enable attendance after mistaken rejection
 * - Allows employee to re-submit clock-in SAME DAY
 * - Does NOT set clockIn
 * - Resets status back to PENDING
 */
export async function reEnableAttendance(
  attendanceId: string,
  adminId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: { employee: true }
  })

  if (!attendance) {
    return { success: false, message: 'Attendance record not found' }
  }

  if (attendance.approvalStatus !== 'REJECTED') {
    return { success: false, message: 'Only rejected attendance can be re-enabled' }
  }

  const now = new Date()

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      approvalStatus: 'NOT_REQUIRED',
      pendingCheckInAt: null,
      rejectedBy: null,
      rejectedAt: null,
      approvalReason: reason || 'Re-enabled by admin',
      status: 'PRESENT',
      updatedAt: new Date()
    }
  })

  // Notify admin & employee
  const notificationService = new NotificationService()
  await notificationService.createAdminNotification({
    type: 'ATTENDANCE_ALERT',
    title: 'Attendance Re-enabled',
    message: `Attendance for ${attendance.employee.name} (${attendance.employee.employeeId}) has been re-enabled by admin ${adminId}.`,
    data: { attendanceId, adminId }
  })

  return {
    success: true,
    message: 'Attendance re-enabled. Employee can clock in again.'
  }
}
