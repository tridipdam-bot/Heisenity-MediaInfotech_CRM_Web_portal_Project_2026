import { prisma } from '@/lib/prisma'
import {
  LeaveApplication,
  LeaveType,
  LeaveStatus,
  CreateLeaveApplicationRequest,
  ReviewLeaveApplicationRequest,
  LeaveApplicationResponse,
  LeaveApplicationsResponse
} from './leave.types'

export class LeaveService {
  // Create a new leave application
  async createLeaveApplication(data: CreateLeaveApplicationRequest): Promise<LeaveApplicationResponse> {
    try {
      // Find employee
      const employee = await prisma.employee.findUnique({
        where: { employeeId: data.employeeId }
      })

      if (!employee) {
        return { success: false, error: 'Employee not found' }
      }

      // Validate dates - allow today and future dates
      const startDate = new Date(data.startDate)
      const endDate = new Date(data.endDate)
      const today = new Date()
      
      // Set all dates to start of day for proper comparison
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)

      if (startDate < today) {
        return { success: false, error: 'Start date cannot be in the past' }
      }

      if (endDate < startDate) {
        return { success: false, error: 'End date cannot be before start date' }
      }

      // Check for overlapping leave applications
      const overlappingLeave = await prisma.leaveApplication.findFirst({
        where: {
          employeeId: employee.id,
          status: {
            in: [LeaveStatus.PENDING, LeaveStatus.APPROVED]
          },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      })

      if (overlappingLeave) {
        return { success: false, error: 'You already have a leave application for overlapping dates' }
      }

      // Create leave application
      const leaveApplication = await prisma.leaveApplication.create({
        data: {
          employeeId: employee.id,
          leaveType: data.leaveType,
          startDate,
          endDate,
          reason: data.reason,
          status: LeaveStatus.PENDING
        },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        }
      })

      const response: LeaveApplication = {
        id: leaveApplication.id,
        employeeId: data.employeeId,
        employeeName: leaveApplication.employee.name,
        leaveType: leaveApplication.leaveType as LeaveType,
        startDate: leaveApplication.startDate.toISOString().split('T')[0],
        endDate: leaveApplication.endDate.toISOString().split('T')[0],
        reason: leaveApplication.reason,
        status: leaveApplication.status as LeaveStatus,
        appliedAt: leaveApplication.appliedAt.toISOString(),
        reviewedBy: leaveApplication.reviewedBy || undefined,
        reviewedAt: leaveApplication.reviewedAt?.toISOString(),
        reviewNote: leaveApplication.reviewNote || undefined,
        createdAt: leaveApplication.createdAt.toISOString(),
        updatedAt: leaveApplication.updatedAt.toISOString()
      }

      return { success: true, data: response }
    } catch (error) {
      console.error('Error creating leave application:', error)
      return { success: false, error: 'Failed to create leave application' }
    }
  }

  // Get leave applications for an employee
  async getEmployeeLeaveApplications(employeeId: string): Promise<LeaveApplicationsResponse> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { employeeId }
      })

      if (!employee) {
        return { success: false, error: 'Employee not found' }
      }

      const leaveApplications = await prisma.leaveApplication.findMany({
        where: { employeeId: employee.id },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        },
        orderBy: { appliedAt: 'desc' }
      })

      const response: LeaveApplication[] = leaveApplications.map(app => ({
        id: app.id,
        employeeId: employeeId,
        employeeName: app.employee.name,
        leaveType: app.leaveType as LeaveType,
        startDate: app.startDate.toISOString().split('T')[0],
        endDate: app.endDate.toISOString().split('T')[0],
        reason: app.reason,
        status: app.status as LeaveStatus,
        appliedAt: app.appliedAt.toISOString(),
        reviewedBy: app.reviewedBy || undefined,
        reviewedAt: app.reviewedAt?.toISOString(),
        reviewNote: app.reviewNote || undefined,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString()
      }))

      return { success: true, data: response }
    } catch (error) {
      console.error('Error fetching employee leave applications:', error)
      return { success: false, error: 'Failed to fetch leave applications' }
    }
  }

  // Get all leave applications (for admin)
  async getAllLeaveApplications(): Promise<LeaveApplicationsResponse> {
    try {
      const leaveApplications = await prisma.leaveApplication.findMany({
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        },
        orderBy: { appliedAt: 'desc' }
      })

      const response: LeaveApplication[] = leaveApplications.map(app => ({
        id: app.id,
        employeeId: app.employee.employeeId,
        employeeName: app.employee.name,
        leaveType: app.leaveType as LeaveType,
        startDate: app.startDate.toISOString().split('T')[0],
        endDate: app.endDate.toISOString().split('T')[0],
        reason: app.reason,
        status: app.status as LeaveStatus,
        appliedAt: app.appliedAt.toISOString(),
        reviewedBy: app.reviewedBy || undefined,
        reviewedAt: app.reviewedAt?.toISOString(),
        reviewNote: app.reviewNote || undefined,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString()
      }))

      return { success: true, data: response }
    } catch (error) {
      console.error('Error fetching all leave applications:', error)
      return { success: false, error: 'Failed to fetch leave applications' }
    }
  }

  // Review leave application (approve/reject)
  async reviewLeaveApplication(data: ReviewLeaveApplicationRequest): Promise<LeaveApplicationResponse> {
    try {
      const leaveApplication = await prisma.leaveApplication.findUnique({
        where: { id: data.applicationId },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        }
      })

      if (!leaveApplication) {
        return { success: false, error: 'Leave application not found' }
      }

      if (leaveApplication.status !== LeaveStatus.PENDING) {
        return { success: false, error: 'Leave application has already been reviewed' }
      }

      const updatedApplication = await prisma.leaveApplication.update({
        where: { id: data.applicationId },
        data: {
          status: data.status,
          reviewedBy: data.reviewedBy,
          reviewedAt: new Date(),
          reviewNote: data.reviewNote
        },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        }
      })

      const response: LeaveApplication = {
        id: updatedApplication.id,
        employeeId: updatedApplication.employee.employeeId,
        employeeName: updatedApplication.employee.name,
        leaveType: updatedApplication.leaveType as LeaveType,
        startDate: updatedApplication.startDate.toISOString().split('T')[0],
        endDate: updatedApplication.endDate.toISOString().split('T')[0],
        reason: updatedApplication.reason,
        status: updatedApplication.status as LeaveStatus,
        appliedAt: updatedApplication.appliedAt.toISOString(),
        reviewedBy: updatedApplication.reviewedBy || undefined,
        reviewedAt: updatedApplication.reviewedAt?.toISOString(),
        reviewNote: updatedApplication.reviewNote || undefined,
        createdAt: updatedApplication.createdAt.toISOString(),
        updatedAt: updatedApplication.updatedAt.toISOString()
      }

      return { success: true, data: response }
    } catch (error) {
      console.error('Error reviewing leave application:', error)
      return { success: false, error: 'Failed to review leave application' }
    }
  }

  // Cancel leave application (by employee)
  async cancelLeaveApplication(applicationId: string, employeeId: string): Promise<LeaveApplicationResponse> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { employeeId }
      })

      if (!employee) {
        return { success: false, error: 'Employee not found' }
      }

      const leaveApplication = await prisma.leaveApplication.findFirst({
        where: {
          id: applicationId,
          employeeId: employee.id
        },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        }
      })

      if (!leaveApplication) {
        return { success: false, error: 'Leave application not found' }
      }

      if (leaveApplication.status !== LeaveStatus.PENDING) {
        return { success: false, error: 'Only pending leave applications can be cancelled' }
      }

      const updatedApplication = await prisma.leaveApplication.update({
        where: { id: applicationId },
        data: {
          status: LeaveStatus.CANCELLED
        },
        include: {
          employee: {
            select: {
              name: true,
              employeeId: true
            }
          }
        }
      })

      const response: LeaveApplication = {
        id: updatedApplication.id,
        employeeId: updatedApplication.employee.employeeId,
        employeeName: updatedApplication.employee.name,
        leaveType: updatedApplication.leaveType as LeaveType,
        startDate: updatedApplication.startDate.toISOString().split('T')[0],
        endDate: updatedApplication.endDate.toISOString().split('T')[0],
        reason: updatedApplication.reason,
        status: updatedApplication.status as LeaveStatus,
        appliedAt: updatedApplication.appliedAt.toISOString(),
        reviewedBy: updatedApplication.reviewedBy || undefined,
        reviewedAt: updatedApplication.reviewedAt?.toISOString(),
        reviewNote: updatedApplication.reviewNote || undefined,
        createdAt: updatedApplication.createdAt.toISOString(),
        updatedAt: updatedApplication.updatedAt.toISOString()
      }

      return { success: true, data: response }
    } catch (error) {
      console.error('Error cancelling leave application:', error)
      return { success: false, error: 'Failed to cancel leave application' }
    }
  }
}