import { Request, Response } from 'express'
import * as ExcelJS from 'exceljs'
import { prisma } from '../../../lib/prisma'

interface TaskExportFilters {
  dateFrom?: string
  dateTo?: string
  date?: string
  employeeId?: string
  status?: string
  role?: 'FIELD_ENGINEER' | 'IN_OFFICE'
  quickRange?: 'yesterday' | '15days' | '30days'
}

/* -------------------------------------------------------------------------- */
/*                               Date Helpers                                 */
/* -------------------------------------------------------------------------- */

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function parseDateOnly(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/* -------------------------------------------------------------------------- */
/*                          Quick Range Calculator                             */
/* -------------------------------------------------------------------------- */

function getDateRangeFromQuickRange(
  quickRange?: 'yesterday' | '15days' | '30days'
): { dateFrom: Date; dateTo: Date } | null {
  if (!quickRange) return null

  const today = startOfDay(new Date())

  switch (quickRange) {
    case 'yesterday': {
      const d = new Date(today)
      d.setDate(d.getDate() - 1)
      return { dateFrom: startOfDay(d), dateTo: endOfDay(d) }
    }

    case '15days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 14)
      return { dateFrom: startOfDay(from), dateTo: endOfDay(today) }
    }

    case '30days': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { dateFrom: startOfDay(from), dateTo: endOfDay(today) }
    }

    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/*                        Fetch Task Data for Export                          */
/* -------------------------------------------------------------------------- */

async function getTaskDataForExport(filters: TaskExportFilters) {
  const where: any = {}
  const employeeWhere: any = {}

  if (filters.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { employeeId: filters.employeeId }
    })
    if (employee) {
      where.employeeId = employee.id
    }
  }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.role) {
    employeeWhere.role = filters.role
  }

  const quickRange = getDateRangeFromQuickRange(filters.quickRange)

  if (quickRange) {
    where.assignedAt = {
      gte: quickRange.dateFrom,
      lte: quickRange.dateTo
    }
  } else if (filters.date) {
    const d = parseDateOnly(filters.date)
    where.assignedAt = {
      gte: startOfDay(d),
      lte: endOfDay(d)
    }
  } else if (filters.dateFrom || filters.dateTo) {
    where.assignedAt = {}
    if (filters.dateFrom) {
      where.assignedAt.gte = startOfDay(parseDateOnly(filters.dateFrom))
    }
    if (filters.dateTo) {
      where.assignedAt.lte = endOfDay(parseDateOnly(filters.dateTo))
    }
  }

  const tasks = await prisma.task.findMany({
    where: {
      ...where,
      ...(Object.keys(employeeWhere).length && {
        employee: employeeWhere
      })
    },
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
      }
    },
    orderBy: [
      { assignedAt: 'desc' },
      { employeeId: 'asc' }
    ]
  })

  return tasks.map(task => ({
    employeeId: task.employee.employeeId,
    employeeName: task.employee.name,
    role: task.employee.role,
    email: task.employee.email,
    phone: task.employee.phone,
    teamId: task.employee.teamId,
    isTeamLeader: task.employee.isTeamLeader,
    taskId: task.id,
    taskTitle: task.title,
    taskDescription: task.description,
    taskCategory: task.category,
    taskStatus: task.status,
    taskLocation: task.location,
    assignedAt: task.assignedAt.toISOString(),
    checkIn: task.checkIn?.toISOString(),
    checkOut: task.checkOut?.toISOString(),
    assignedBy: task.assignedBy,
    relatedTicketId: task.relatedTicketId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  }))
}

/* -------------------------------------------------------------------------- */
/*                          Work Hours Calculator                              */
/* -------------------------------------------------------------------------- */

function calculateTaskHours(checkIn?: string, checkOut?: string) {
  if (!checkIn) return { duration: '-', status: 'Not Started' }

  const start = new Date(checkIn)
  const end = checkOut ? new Date(checkOut) : new Date()
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) return { duration: '-', status: 'Invalid Time' }

  const totalMin = Math.floor(diff / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60

  return {
    duration: `${hours}h ${minutes}m`,
    status: checkOut ? 'Completed' : 'In Progress'
  }
}

/* -------------------------------------------------------------------------- */
/*                              Export Controller                              */
/* -------------------------------------------------------------------------- */

export const exportTasksToExcel = async (req: Request, res: Response) => {
  try {
    const filters: TaskExportFilters = {
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      date: req.query.date as string,
      employeeId: req.query.employeeId as string,
      status: req.query.status as string,
      role: req.query.role as any,
      quickRange: req.query.quickRange as any
    }

    const data = await getTaskDataForExport(filters)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Task Management')

    const headers = [
      'Employee ID', 'Employee Name', 'Role', 'Team ID', 'Team Leader',
      'Task ID', 'Task Title', 'Task Description', 'Category', 'Status',
      'Location', 'Assigned At', 'Check In', 'Check Out', 'Duration',
      'Assigned By', 'Related Ticket ID', 'Email', 'Phone'
    ]

    sheet.addRow(headers).eachCell(c => {
      c.font = { bold: true }
      c.alignment = { horizontal: 'center' }
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      }
    })

    data.forEach(task => {
      const taskHours = calculateTaskHours(task.checkIn, task.checkOut)
      sheet.addRow([
        task.employeeId,
        task.employeeName,
        task.role,
        task.teamId || 'No Team',
        task.isTeamLeader ? 'Yes' : 'No',
        task.taskId,
        task.taskTitle,
        task.taskDescription || '',
        task.taskCategory || '',
        task.taskStatus,
        task.taskLocation || '',
        task.assignedAt ? new Date(task.assignedAt).toLocaleString() : '',
        task.checkIn ? new Date(task.checkIn).toLocaleString() : 'Not Started',
        task.checkOut ? new Date(task.checkOut).toLocaleString() : 'Not Completed',
        taskHours.duration,
        task.assignedBy,
        task.relatedTicketId || '',
        task.email,
        task.phone || ''
      ])
    })

    // Auto-size columns
    sheet.columns.forEach(col => {
      if (!col || !col.eachCell) return
      let max = 12
      col.eachCell({ includeEmpty: true }, c => {
        max = Math.max(max, String(c.value ?? '').length)
      })
      col.width = Math.min(max + 2, 50)
    })

    // Add some styling
    sheet.getRow(1).height = 20
    sheet.views = [{ state: 'frozen', ySplit: 1 }]

    const filename = `task-management-${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    )

    await workbook.xlsx.write(res)
    res.end()
  } catch (err) {
    console.error('Task export error:', err)
    res.status(500).json({ success: false, message: 'Task export failed' })
  }
}