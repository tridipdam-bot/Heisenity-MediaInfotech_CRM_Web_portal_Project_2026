// controllers/attendance.controller.ts
import { Request, Response } from 'express'
import { prisma } from '../../../lib/prisma'
import { getDeviceInfo } from '../../../utils/deviceinfo'
import { createAttendanceRecord, getRemainingAttempts, approveAttendance, rejectAttendance, getPendingAttendanceApprovals, dayClockOut } from './attendance.service'

export const getAttendanceRecords = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      date,
      dateFrom,
      dateTo,
      employeeId,
      status,
      role
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}

    if (employeeId) {
      // Find employee by employeeId first
      const employee = await prisma.employee.findUnique({
        where: { employeeId: employeeId as string }
      })
      if (employee) {
        where.employeeId = employee.id
      } else {
        return res.status(404).json({
          success: false,
          error: 'Employee not found'
        })
      }
    }

    if (status) {
      where.status = status
    }

    // Add role filter to the where clause if specified
    if (role && (role === 'FIELD_ENGINEER' || role === 'IN_OFFICE')) {
      where.employee = {
        role: role
      }
    }

    if (date) {
      const targetDate = new Date(date as string)
      targetDate.setHours(0, 0, 0, 0)
      where.date = targetDate
    } else if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string)
        fromDate.setHours(0, 0, 0, 0)
        where.date.gte = fromDate
      }
      if (dateTo) {
        const toDate = new Date(dateTo as string)
        toDate.setHours(23, 59, 59, 999)
        where.date.lte = toDate
      }
    }

    // Get total count for pagination
    const total = await prisma.attendance.count({ where })

    // Get attendance records with employee details
    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            email: true,
            phone: true,
            teamId: true,
            isTeamLeader: true,
            role: true
          }
        },
        assignedTask: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            location: true,
            startTime: true,
            endTime: true,
            assignedBy: true,
            assignedAt: true,
            status: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limitNum
    })

    // Transform the data to match frontend expectations
    const records = attendances.map(attendance => ({
      id: attendance.id,
      employeeId: attendance.employee.employeeId,
      employeeName: attendance.employee.name,
      email: attendance.employee.email,
      phone: attendance.employee.phone,
      teamId: attendance.employee.teamId,
      isTeamLeader: attendance.employee.isTeamLeader,
      role: attendance.employee.role,
      date: attendance.date.toISOString().split('T')[0],
      clockIn: attendance.clockIn?.toISOString(),
      clockOut: attendance.clockOut?.toISOString(),
      status: attendance.status,
      source: attendance.source,
      location: attendance.location || 'Office Location',
      latitude: attendance.latitude ? Number(attendance.latitude) : undefined,
      longitude: attendance.longitude ? Number(attendance.longitude) : undefined,
      ipAddress: attendance.ipAddress,
      deviceInfo: attendance.deviceInfo,
      photo: attendance.photo,
      locked: attendance.locked,
      lockedReason: attendance.lockedReason,
      attemptCount: attendance.attemptCount,
      taskId: attendance.taskId, // Add taskId field
      taskStartTime: attendance.taskStartTime,
      taskEndTime: attendance.taskEndTime,
      taskLocation: attendance.taskLocation,
      // Add approval fields
      approvalStatus: attendance.approvalStatus,
      approvedBy: attendance.approvedBy,
      approvedAt: attendance.approvedAt?.toISOString(),
      rejectedBy: attendance.rejectedBy,
      rejectedAt: attendance.rejectedAt?.toISOString(),
      approvalReason: attendance.approvalReason,
      createdAt: attendance.createdAt.toISOString(),
      updatedAt: attendance.updatedAt.toISOString(),
      assignedTask: attendance.assignedTask ? {
        id: attendance.assignedTask.id,
        title: attendance.assignedTask.title,
        description: attendance.assignedTask.description,
        category: attendance.assignedTask.category,
        location: attendance.assignedTask.location,
        startTime: attendance.assignedTask.startTime,
        endTime: attendance.assignedTask.endTime,
        assignedBy: attendance.assignedTask.assignedBy,
        assignedAt: attendance.assignedTask.assignedAt.toISOString(),
        status: attendance.assignedTask.status
      } : undefined
    }))

    const totalPages = Math.ceil(total / limitNum)

    return res.status(200).json({
      success: true,
      data: {
        records,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      }
    })
  } catch (error) {
    console.error({ event: 'get_attendance_records_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to get attendance records' })
  }
}

export const checkRemainingAttempts = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' })
    }

    const result = await getRemainingAttempts(employeeId)

    return res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error({ event: 'check_remaining_attempts_error', error: error instanceof Error ? error.message : error })

    let errorMessage = 'Failed to check remaining attempts'
    let statusCode = 500

    if (error instanceof Error && error.message === 'EMPLOYEE_NOT_FOUND') {
      statusCode = 404
      errorMessage = 'Employee not found'
    }

    return res.status(statusCode).json({ success: false, error: errorMessage })
  }
}

export const detectDevice = async (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'] || ''
    const device = getDeviceInfo(userAgent)

    return res.status(200).json({ success: true, device })
  } catch (error) {
    console.error({ event: 'detect_device_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to detect device info' })
  }
}

export const deleteAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ success: false, error: 'Attendance record ID is required' })
    }

    // Check if the attendance record exists
    const existingRecord = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true
          }
        }
      }
    })

    if (!existingRecord) {
      return res.status(404).json({ success: false, error: 'Attendance record not found' })
    }

    // Delete all attendance records for this employee
    await prisma.attendance.delete({
      where: { id }
    })

    // Delete the employee from employee table
    await prisma.employee.delete({
      where: { id: existingRecord.employeeId }
    })


    return res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    })
  } catch (error) {
    console.error({ event: 'delete_attendance_record_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to delete attendance record' })
  }
}

export const createAttendance = async (req: Request, res: Response) => {
  try {
    const { employeeId, photo, status = 'PRESENT', location, action } = req.body

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' })
    }

    // Validate action parameter
    if (action && !['check-in', 'check-out', 'task-checkout'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action. Must be "check-in", "check-out", or "task-checkout"' })
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown'
    const userAgent = req.headers['user-agent'] || ''

    console.info({ event: 'create_attendance_request', employeeId, ipAddress, action })

    // Call service (simplified without location validation)
    const attendance = await createAttendanceRecord({
      employeeId,
      ipAddress,
      userAgent,
      photo,
      status: status as 'PRESENT' | 'LATE',
      locationText: location || 'Office Location',
      action: action as 'check-in' | 'check-out' | 'task-checkout' | undefined
    })

    return res.status(201).json({ success: true, message: 'Attendance recorded successfully', data: attendance })
  } catch (error) {
    console.error({ event: 'create_attendance_error', error: error instanceof Error ? error.message : error })
    let errorMessage = 'Failed to create attendance record'
    let statusCode = 500
    if (error instanceof Error) {
      if ((error as any).message === 'EMPLOYEE_NOT_FOUND') {
        statusCode = 404
        errorMessage = 'Employee not found'
      } else if ((error as any).message === 'MAX_ATTEMPTS_EXCEEDED' || (error as any).code === 'MAX_ATTEMPTS_EXCEEDED') {
        statusCode = 403
        errorMessage = error.message
      } else {
        errorMessage = error.message
      }
    }
    return res.status(statusCode).json({ success: false, error: errorMessage })
  }
}

// Get pending attendance approvals
export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const result = await getPendingAttendanceApprovals()

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.data
      })
    } else {
      return res.status(400).json({
        success: false,
        error: result.error
      })
    }
  } catch (error) {
    console.error({ event: 'get_pending_approvals_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to get pending approvals' })
  }
}

// Approve attendance
export const approveAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params
    const { adminId, reason } = req.body

    if (!attendanceId) {
      return res.status(400).json({ success: false, error: 'Attendance ID is required' })
    }

    if (!adminId) {
      return res.status(400).json({ success: false, error: 'Admin ID is required' })
    }

    const result = await approveAttendance(attendanceId, adminId, reason)

    if (result.success) {
      return res.status(200).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    console.error({ event: 'approve_attendance_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to approve attendance' })
  }
}

// Reject attendance
export const rejectAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const { attendanceId } = req.params
    const { adminId, reason } = req.body

    if (!attendanceId) {
      return res.status(400).json({ success: false, error: 'Attendance ID is required' })
    }

    if (!adminId) {
      return res.status(400).json({ success: false, error: 'Admin ID is required' })
    }

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason is required' })
    }

    const result = await rejectAttendance(attendanceId, adminId, reason)

    if (result.success) {
      return res.status(200).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    console.error({ event: 'reject_attendance_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to reject attendance' })
  }
}

// Day clock-out for field engineers
export const dayClockOutController = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID is required' })
    }

    const result = await dayClockOut(employeeId)

    if (result.success) {
      return res.status(200).json(result)
    } else {
      return res.status(400).json(result)
    }
  } catch (error) {
    console.error({ event: 'day_clock_out_error', error: error instanceof Error ? error.message : error })
    return res.status(500).json({ success: false, error: 'Failed to clock out for the day' })
  }
}