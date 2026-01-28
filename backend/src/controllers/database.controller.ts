import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

export class DatabaseController {
  // DELETE /api/database/reset - Reset all data (DANGEROUS!)
  async resetDatabase(req: Request, res: Response) {
    try {
      // Add authentication check - only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Database reset not allowed in production'
        })
      }

      // Delete data in reverse order of dependencies
      await prisma.adminNotification.deleteMany({})
      await prisma.petrolBill.deleteMany({})
      await prisma.vehicle.deleteMany({})
      await prisma.payrollRecord.deleteMany({})
      await prisma.task.deleteMany({})
      await prisma.attendance.deleteMany({})
      await prisma.userSession.deleteMany({})

      res.json({
        success: true,
        message: 'Database reset completed successfully'
      })
    } catch (error) {
      console.error('Error resetting database:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to reset database'
      })
    }
  }

  // DELETE /api/database/attendance - Clear attendance data
  async clearAttendance(req: Request, res: Response) {
    try {
      const result = await prisma.attendance.deleteMany({})
      
      res.json({
        success: true,
        message: `Deleted ${result.count} attendance records`
      })
    } catch (error) {
      console.error('Error clearing attendance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to clear attendance data'
      })
    }
  }

  // DELETE /api/database/tasks - Clear task data
  async clearTasks(req: Request, res: Response) {
    try {
      const result = await prisma.task.deleteMany({})
      
      res.json({
        success: true,
        message: `Deleted ${result.count} tasks`
      })
    } catch (error) {
      console.error('Error clearing tasks:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to clear task data'
      })
    }
  }

  // POST /api/database/unassign-vehicles - Unassign all vehicles
  async unassignAllVehicles(req: Request, res: Response) {
    try {
      const result = await prisma.vehicle.updateMany({
        data: {
          assignedTo: null,
          assignedAt: null,
          status: 'AVAILABLE'
        }
      })
      
      res.json({
        success: true,
        message: `Unassigned ${result.count} vehicles`
      })
    } catch (error) {
      console.error('Error unassigning vehicles:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to unassign vehicles'
      })
    }
  }

  // DELETE /api/database/notifications - Clear notifications
  async clearNotifications(req: Request, res: Response) {
    try {
      const result = await prisma.adminNotification.deleteMany({})
      
      res.json({
        success: true,
        message: `Deleted ${result.count} notifications`
      })
    } catch (error) {
      console.error('Error clearing notifications:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to clear notifications'
      })
    }
  }

  // GET /api/database/stats - Get database statistics
  async getDatabaseStats(req: Request, res: Response) {
    try {
      const stats = {
        admins: await prisma.admin.count(),
        employees: await prisma.employee.count(),
        products: await prisma.product.count(),
        teams: await prisma.team.count(),
        attendance: await prisma.attendance.count(),
        tasks: await prisma.task.count(),
        vehicles: await prisma.vehicle.count(),
        petrolBills: await prisma.petrolBill.count(),
        payrollRecords: await prisma.payrollRecord.count(),
        notifications: await prisma.adminNotification.count(),
        userSessions: await prisma.userSession.count(),
        // Add customer support stats
        pendingCustomerSupport: await prisma.customerSupportRequest.count({
          where: { status: 'PENDING' }
        }),
        totalCustomers: await prisma.customer.count()
      }
      
      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      console.error('Error getting database stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get database statistics'
      })
    }
  }
}