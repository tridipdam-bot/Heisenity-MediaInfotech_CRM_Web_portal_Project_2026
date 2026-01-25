import { Request, Response } from 'express'
import ExcelJS from 'exceljs'
import { prisma } from '../../../lib/prisma'

interface ExportFilters {
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
/*                      Fetch Attendance Data for Export                       */
/* -------------------------------------------------------------------------- */

async function getAttendanceDataForExport(filters: ExportFilters) {
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
    where.date = {
      gte: quickRange.dateFrom,
      lte: quickRange.dateTo
    }
  } else if (filters.date) {
    const d = parseDateOnly(filters.date)
    where.date = {
      gte: startOfDay(d),
      lte: endOfDay(d)
    }
  } else if (filters.dateFrom || filters.dateTo) {
    where.date = {}
    if (filters.dateFrom) {
      where.date.gte = startOfDay(parseDateOnly(filters.dateFrom))
    }
    if (filters.dateTo) {
      where.date.lte = endOfDay(parseDateOnly(filters.dateTo))
    }
  }

  const attendances = await prisma.attendance.findMany({
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
      },
      sessions: {
        orderBy: {
          clockIn: 'asc'
        }
      }
    },
    orderBy: [
      { date: 'asc' },
      { employeeId: 'asc' }
    ]
  })

  // Flatten attendance records with sessions
  const flattenedData: any[] = []
  
  attendances.forEach(a => {
    if (a.sessions.length > 0) {
      // Create a record for each session
      a.sessions.forEach((session, index) => {
        flattenedData.push({
          employeeId: a.employee.employeeId,
          employeeName: a.employee.name,
          role: a.employee.role,
          email: a.employee.email,
          phone: a.employee.phone,
          teamId: a.employee.teamId,
          isTeamLeader: a.employee.isTeamLeader,
          date: a.date.toISOString().split('T')[0],
          status: a.status,
          approvalStatus: a.approvalStatus,
          sessionNumber: index + 1,
          totalSessions: a.sessions.length,
          clockIn: session.clockIn?.toISOString(),
          clockOut: session.clockOut?.toISOString(),
          location: session.location || a.location,
          deviceInfo: session.deviceInfo || a.deviceInfo,
          ipAddress: session.ipAddress || a.ipAddress,
          source: a.source,
          createdAt: a.createdAt.toISOString(),
          sessionCreatedAt: session.createdAt.toISOString()
        })
      })
    } else {
      // Fallback to legacy clockIn/clockOut if no sessions
      flattenedData.push({
        employeeId: a.employee.employeeId,
        employeeName: a.employee.name,
        role: a.employee.role,
        email: a.employee.email,
        phone: a.employee.phone,
        teamId: a.employee.teamId,
        isTeamLeader: a.employee.isTeamLeader,
        date: a.date.toISOString().split('T')[0],
        status: a.status,
        approvalStatus: a.approvalStatus,
        sessionNumber: 1,
        totalSessions: 1,
        clockIn: a.clockIn?.toISOString(),
        clockOut: a.clockOut?.toISOString(),
        location: a.location,
        deviceInfo: a.deviceInfo,
        ipAddress: a.ipAddress,
        source: a.source,
        createdAt: a.createdAt.toISOString(),
        sessionCreatedAt: a.createdAt.toISOString()
      })
    }
  })

  return flattenedData
}

/* -------------------------------------------------------------------------- */
/*                          Work Hours Calculator                              */
/* -------------------------------------------------------------------------- */

function calculateWorkHours(clockIn?: string, clockOut?: string) {
  if (!clockIn) return { worked: '-', overtime: '-' }

  const start = new Date(clockIn)
  const end = clockOut ? new Date(clockOut) : new Date()
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) return { worked: '-', overtime: '-' }

  const totalMin = Math.floor(diff / 60000)
  const standard = 8 * 60

  const worked = Math.min(totalMin, standard)
  const overtime = Math.max(totalMin - standard, 0)

  const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`

  return {
    worked: fmt(worked),
    overtime: fmt(overtime)
  }
}

function calculateSessionDuration(clockIn?: string, clockOut?: string) {
  if (!clockIn) return '-'

  const start = new Date(clockIn)
  const end = clockOut ? new Date(clockOut) : new Date()
  const diff = end.getTime() - start.getTime()
  
  if (diff <= 0) return '-'

  const totalMin = Math.floor(diff / 60000)
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60

  if (!clockOut) {
    return `${hours}h ${minutes}m (Active)`
  }

  return `${hours}h ${minutes}m`
}

/* -------------------------------------------------------------------------- */
/*                              Export Controller                              */
/* -------------------------------------------------------------------------- */

export const exportAttendanceToExcel = async (req: Request, res: Response) => {
  try {
    const filters: ExportFilters = {
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      date: req.query.date as string,
      employeeId: req.query.employeeId as string,
      status: req.query.status as string,
      role: req.query.role as any,
      quickRange: req.query.quickRange as any
    }

    const data = await getAttendanceDataForExport(filters)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Attendance')

    const headers = [
      'Employee ID', 'Name', 'Role', 'Date', 'Status',
      'Approval', 'Session #', 'Total Sessions', 'Clock In', 'Clock Out',
      'Session Duration', 'Location', 'Device', 'IP', 'Source'
    ]

    sheet.addRow(headers).eachCell(c => {
      c.font = { bold: true }
      c.alignment = { horizontal: 'center' }
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }
      }
      c.font = { bold: true, color: { argb: 'FFFFFF' } }
    })

    data.forEach(r => {
      const sessionDuration = calculateSessionDuration(r.clockIn, r.clockOut)
      const row = sheet.addRow([
        r.employeeId,
        r.employeeName,
        r.role,
        r.date,
        r.status,
        r.approvalStatus,
        r.sessionNumber,
        r.totalSessions,
        r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : '-',
        r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : 'Active',
        sessionDuration,
        r.location || '',
        r.deviceInfo || '',
        r.ipAddress || '',
        r.source
      ])

      // Color code status
      const statusCell = row.getCell(5) // Status column
      switch (r.status) {
        case 'PRESENT':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E8' } }
          break
        case 'LATE':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3CD' } }
          break
        case 'ABSENT':
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8D7DA' } }
          break
      }

      // Highlight multiple sessions
      if (r.totalSessions > 1) {
        const sessionCell = row.getCell(7) // Session # column
        sessionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E3F2FD' } }
      }
    })

    // Add summary sheet
    const summarySheet = workbook.addWorksheet('Summary')
    
    // Calculate summary statistics
    const uniqueAttendances = new Map()
    data.forEach(r => {
      const key = `${r.employeeId}-${r.date}`
      if (!uniqueAttendances.has(key)) {
        uniqueAttendances.set(key, r)
      }
    })

    const stats = {
      totalRecords: data.length,
      totalSessions: data.length,
      uniqueAttendances: uniqueAttendances.size,
      present: Array.from(uniqueAttendances.values()).filter(r => r.status === 'PRESENT').length,
      late: Array.from(uniqueAttendances.values()).filter(r => r.status === 'LATE').length,
      absent: Array.from(uniqueAttendances.values()).filter(r => r.status === 'ABSENT').length,
      multipleSessionDays: data.filter(r => r.totalSessions > 1).length
    }

    summarySheet.addRow(['Attendance Export Summary']).eachCell(c => {
      c.font = { bold: true, size: 16 }
    })
    summarySheet.addRow([])
    summarySheet.addRow(['Generated on:', new Date().toLocaleString()])
    summarySheet.addRow(['Total Attendance Records:', stats.uniqueAttendances])
    summarySheet.addRow(['Total Clock-in/out Sessions:', stats.totalSessions])
    summarySheet.addRow(['Present:', stats.present])
    summarySheet.addRow(['Late:', stats.late])
    summarySheet.addRow(['Absent:', stats.absent])
    summarySheet.addRow(['Sessions with Multiple Clock-ins:', stats.multipleSessionDays])

    // Auto-fit columns for both sheets
    ;[sheet, summarySheet].forEach(ws => {
      ws.columns.forEach(col => {
        if (!col || !col.eachCell) return
        let max = 12
        col.eachCell({ includeEmpty: true }, c => {
          max = Math.max(max, String(c.value ?? '').length)
        })
        col.width = Math.min(max + 2, 40)
      })
    })

    const filename = `attendance-sessions-${new Date().toISOString().split('T')[0]}.xlsx`
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
    console.error(err)
    res.status(500).json({ success: false, message: 'Export failed' })
  }
}
