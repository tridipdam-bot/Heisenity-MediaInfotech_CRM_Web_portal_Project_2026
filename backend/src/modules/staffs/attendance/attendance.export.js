import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { prisma } from '@/lib/prisma';
// Helper function to get attendance data for export
async function getAttendanceDataForExport(filters) {
    const where = {};
    const employeeWhere = {};

    if (filters.employeeId) {
        const employee = await prisma.employee.findUnique({
            where: { employeeId: filters.employeeId }
        });
        if (employee) {
            where.employeeId = employee.id;
        }
    }
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.role) {
        employeeWhere.role = filters.role;
    }
    if (filters.date) {
        const targetDate = new Date(filters.date);
        targetDate.setHours(0, 0, 0, 0);
        where.date = targetDate;
    }
    else if (filters.dateFrom || filters.dateTo) {
        where.date = {};
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            where.date.gte = fromDate;
        }
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            where.date.lte = toDate;
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
            { date: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    // Flatten attendance records with sessions
    const flattenedData = [];
    
    attendances.forEach(attendance => {
        if (attendance.sessions.length > 0) {
            // Create a record for each session
            attendance.sessions.forEach((session, index) => {
                flattenedData.push({
                    employeeId: attendance.employee.employeeId,
                    employeeName: attendance.employee.name,
                    role: attendance.employee.role,
                    email: attendance.employee.email,
                    phone: attendance.employee.phone,
                    teamId: attendance.employee.teamId,
                    isTeamLeader: attendance.employee.isTeamLeader,
                    date: attendance.date.toISOString().split('T')[0],
                    status: attendance.status,
                    approvalStatus: attendance.approvalStatus,
                    sessionNumber: index + 1,
                    totalSessions: attendance.sessions.length,
                    clockIn: session.clockIn?.toISOString(),
                    clockOut: session.clockOut?.toISOString(),
                    location: session.location || attendance.location,
                    deviceInfo: session.deviceInfo || attendance.deviceInfo,
                    ipAddress: session.ipAddress || attendance.ipAddress,
                    source: attendance.source,
                    createdAt: attendance.createdAt.toISOString(),
                    sessionCreatedAt: session.createdAt.toISOString(),
                    latitude: attendance.latitude ? Number(attendance.latitude) : undefined,
                    longitude: attendance.longitude ? Number(attendance.longitude) : undefined,
                    locked: attendance.locked,
                    lockedReason: attendance.lockedReason,
                    attemptCount: attendance.attemptCount,
                    updatedAt: attendance.updatedAt.toISOString()
                });
            });
        } else {
            // Fallback to legacy clockIn/clockOut if no sessions
            flattenedData.push({
                employeeId: attendance.employee.employeeId,
                employeeName: attendance.employee.name,
                role: attendance.employee.role,
                email: attendance.employee.email,
                phone: attendance.employee.phone,
                teamId: attendance.employee.teamId,
                isTeamLeader: attendance.employee.isTeamLeader,
                date: attendance.date.toISOString().split('T')[0],
                status: attendance.status,
                approvalStatus: attendance.approvalStatus,
                sessionNumber: 1,
                totalSessions: 1,
                clockIn: attendance.clockIn?.toISOString(),
                clockOut: attendance.clockOut?.toISOString(),
                location: attendance.location,
                deviceInfo: attendance.deviceInfo,
                ipAddress: attendance.ipAddress,
                source: attendance.source,
                createdAt: attendance.createdAt.toISOString(),
                sessionCreatedAt: attendance.createdAt.toISOString(),
                latitude: attendance.latitude ? Number(attendance.latitude) : undefined,
                longitude: attendance.longitude ? Number(attendance.longitude) : undefined,
                locked: attendance.locked,
                lockedReason: attendance.lockedReason,
                attemptCount: attendance.attemptCount,
                updatedAt: attendance.updatedAt.toISOString()
            });
        }
    });

    return flattenedData;
}
// Helper function to calculate work hours
function calculateWorkHours(clockIn, clockOut) {
    if (!clockIn)
        return { worked: '-', overtime: '-' };
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0)
        return { worked: '-', overtime: '-' };
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const standardMinutes = 8 * 60; // 8 hours
    const workedMinutes = Math.min(totalMinutes, standardMinutes);
    const overtimeMinutes = Math.max(totalMinutes - standardMinutes, 0);
    const format = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };
    return {
        worked: format(workedMinutes),
        overtime: overtimeMinutes > 0 ? format(overtimeMinutes) : '0h 0m'
    };
}

// Helper function to calculate session duration
function calculateSessionDuration(clockIn, clockOut) {
    if (!clockIn) return '-';
    
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const diffMs = end.getTime() - start.getTime();
    
    if (diffMs <= 0) return '-';
    
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (!clockOut) {
        return `${hours}h ${minutes}m (Active)`;
    }
    
    return `${hours}h ${minutes}m`;
}
export const exportAttendanceToExcel = async (req, res) => {
    try {
        const filters = {
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            date: req.query.date,
            employeeId: req.query.employeeId,
            status: req.query.status,
            role: req.query.role
        };
        const attendanceData = await getAttendanceDataForExport(filters);
        // Create a new workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Sessions');
        // Set up the header row
        const headers = [
            'Employee ID',
            'Employee Name',
            'Role',
            'Email',
            'Phone',
            'Team ID',
            'Team Leader',
            'Date',
            'Status',
            'Approval Status',
            'Session #',
            'Total Sessions',
            'Clock In',
            'Clock Out',
            'Session Duration',
            'Location',
            'Device Info',
            'IP Address',
            'Source',
            'Created At'
        ];
        // Add headers with styling
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '366092' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        // Add data rows
        attendanceData.forEach((record) => {
            const sessionDuration = calculateSessionDuration(record.clockIn, record.clockOut);
            const row = worksheet.addRow([
                record.employeeId,
                record.employeeName,
                record.role || '',
                record.email,
                record.phone || '',
                record.teamId || '',
                record.isTeamLeader ? 'Yes' : 'No',
                record.date,
                record.status,
                record.approvalStatus || 'PENDING',
                record.sessionNumber,
                record.totalSessions,
                record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '-',
                record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : 'Active',
                sessionDuration,
                record.location || '',
                record.deviceInfo || '',
                record.ipAddress || '',
                record.source,
                new Date(record.createdAt).toLocaleString()
            ]);
            // Add borders to data cells
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            // Color code status
            const statusCell = row.getCell(9); // Status column
            switch (record.status) {
                case 'PRESENT':
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E8' } };
                    break;
                case 'LATE':
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3CD' } };
                    break;
                case 'ABSENT':
                    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8D7DA' } };
                    break;
            }
            // Highlight multiple sessions
            if (record.totalSessions > 1) {
                const sessionCell = row.getCell(11); // Session # column
                sessionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E3F2FD' } };
            }
        });

        // Add summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        
        // Calculate summary statistics
        const uniqueAttendances = new Map();
        attendanceData.forEach(r => {
            const key = `${r.employeeId}-${r.date}`;
            if (!uniqueAttendances.has(key)) {
                uniqueAttendances.set(key, r);
            }
        });

        const stats = {
            totalRecords: attendanceData.length,
            totalSessions: attendanceData.length,
            uniqueAttendances: uniqueAttendances.size,
            present: Array.from(uniqueAttendances.values()).filter(r => r.status === 'PRESENT').length,
            late: Array.from(uniqueAttendances.values()).filter(r => r.status === 'LATE').length,
            absent: Array.from(uniqueAttendances.values()).filter(r => r.status === 'ABSENT').length,
            multipleSessionDays: attendanceData.filter(r => r.totalSessions > 1).length
        };

        const summaryHeaderRow = summarySheet.addRow(['Attendance Export Summary']);
        summaryHeaderRow.getCell(1).font = { bold: true, size: 16 };
        summarySheet.addRow([]);
        summarySheet.addRow(['Generated on:', new Date().toLocaleString()]);
        summarySheet.addRow(['Total Attendance Records:', stats.uniqueAttendances]);
        summarySheet.addRow(['Total Clock-in/out Sessions:', stats.totalSessions]);
        summarySheet.addRow(['Present:', stats.present]);
        summarySheet.addRow(['Late:', stats.late]);
        summarySheet.addRow(['Absent:', stats.absent]);
        summarySheet.addRow(['Sessions with Multiple Clock-ins:', stats.multipleSessionDays]);

        // Auto-fit columns
        [worksheet, summarySheet].forEach((ws) => {
            ws.columns.forEach((column) => {
                if (column && column.eachCell) {
                    let maxLength = 0;
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        const columnLength = cell.value ? cell.value.toString().length : 10;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    });
                    column.width = Math.min(maxLength + 2, 50); // Max width of 50
                }
            });
        });

        // Add summary at the top of main sheet
        worksheet.insertRow(1, []);
        worksheet.insertRow(1, ['Attendance Sessions Report Summary']);
        worksheet.insertRow(2, [`Generated on: ${new Date().toLocaleString()}`]);
        worksheet.insertRow(3, [`Total Sessions: ${attendanceData.length}`]);
        worksheet.insertRow(4, [`Unique Attendance Records: ${stats.uniqueAttendances}`]);
        worksheet.insertRow(5, []);
        // Style the summary
        const summaryRow = worksheet.getRow(1);
        summaryRow.getCell(1).font = { bold: true, size: 16 };
        const dateRow = worksheet.getRow(2);
        dateRow.getCell(1).font = { italic: true };
        // Set response headers
        const filename = `attendance-sessions-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({ success: false, error: 'Failed to export to Excel' });
    }
};
export const exportAttendanceToPDF = async (req, res) => {
    try {
        const filters = {
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            date: req.query.date,
            employeeId: req.query.employeeId,
            status: req.query.status
        };
        const attendanceData = await getAttendanceDataForExport(filters);
        // Generate HTML content for PDF
        const htmlContent = generateHTMLReport(attendanceData, filters);
        // Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            },
            printBackground: true
        });
        await browser.close();
        // Set response headers
        const filename = `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error exporting to PDF:', error);
        res.status(500).json({ success: false, error: 'Failed to export to PDF' });
    }
};
function generateHTMLReport(attendanceData, filters) {
    const currentDate = new Date().toLocaleString();
    // Generate filter summary
    let filterSummary = '';
    if (filters.date) {
        filterSummary += `Date: ${filters.date}<br>`;
    }
    else if (filters.dateFrom || filters.dateTo) {
        filterSummary += `Date Range: ${filters.dateFrom || 'Start'} to ${filters.dateTo || 'End'}<br>`;
    }
    if (filters.employeeId) {
        filterSummary += `Employee ID: ${filters.employeeId}<br>`;
    }
    if (filters.status) {
        filterSummary += `Status: ${filters.status}<br>`;
    }
    if (filters.role) {
        filterSummary += `Role: ${filters.role}<br>`;
    }
    // Calculate statistics
    const uniqueAttendances = new Map();
    attendanceData.forEach(r => {
        const key = `${r.employeeId}-${r.date}`;
        if (!uniqueAttendances.has(key)) {
            uniqueAttendances.set(key, r);
        }
    });

    const stats = {
        totalSessions: attendanceData.length,
        uniqueAttendances: uniqueAttendances.size,
        present: Array.from(uniqueAttendances.values()).filter(r => r.status === 'PRESENT').length,
        late: Array.from(uniqueAttendances.values()).filter(r => r.status === 'LATE').length,
        absent: Array.from(uniqueAttendances.values()).filter(r => r.status === 'ABSENT').length,
        multipleSessionDays: attendanceData.filter(r => r.totalSessions > 1).length
    };
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Attendance Sessions Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 12px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #366092;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #366092;
          margin: 0;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0;
          color: #666;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-item .number {
          font-size: 24px;
          font-weight: bold;
          color: #366092;
        }
        .summary-item .label {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        .filters {
          background: #e9ecef;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .filters h3 {
          margin: 0 0 10px 0;
          color: #366092;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 9px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: left;
        }
        th {
          background-color: #366092;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .status-present { background-color: #d4edda !important; }
        .status-late { background-color: #fff3cd !important; }
        .status-absent { background-color: #f8d7da !important; }
        .multiple-sessions { background-color: #e3f2fd !important; }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Employee Attendance Sessions Report</h1>
        <p>Generated on: ${currentDate}</p>
        <p>Total Sessions: ${attendanceData.length} | Unique Attendance Records: ${stats.uniqueAttendances}</p>
      </div>

      <div class="summary">
        <div class="summary-item">
          <div class="number">${stats.present}</div>
          <div class="label">Present</div>
        </div>
        <div class="summary-item">
          <div class="number">${stats.late}</div>
          <div class="label">Late</div>
        </div>
        <div class="summary-item">
          <div class="number">${stats.absent}</div>
          <div class="label">Absent</div>
        </div>
        <div class="summary-item">
          <div class="number">${stats.multipleSessionDays}</div>
          <div class="label">Multi-Session Days</div>
        </div>
      </div>

      ${filterSummary ? `
        <div class="filters">
          <h3>Applied Filters:</h3>
          ${filterSummary}
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Role</th>
            <th>Date</th>
            <th>Status</th>
            <th>Session #</th>
            <th>Total Sessions</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Duration</th>
            <th>Location</th>
            <th>Device</th>
          </tr>
        </thead>
        <tbody>
          ${attendanceData.map(record => {
        const sessionDuration = calculateSessionDuration(record.clockIn, record.clockOut);
        const statusClass = `status-${record.status.toLowerCase()}`;
        const multipleSessionClass = record.totalSessions > 1 ? 'multiple-sessions' : '';
        return `
              <tr class="${statusClass} ${multipleSessionClass}">
                <td>${record.employeeId}</td>
                <td>${record.employeeName}</td>
                <td>${record.role || ''}</td>
                <td>${record.date}</td>
                <td>${record.status}</td>
                <td>${record.sessionNumber}</td>
                <td>${record.totalSessions}</td>
                <td>${record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : '-'}</td>
                <td>${record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : 'Active'}</td>
                <td>${sessionDuration}</td>
                <td>${record.location || '-'}</td>
                <td>${record.deviceInfo || '-'}</td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>This report shows individual clock-in/clock-out sessions for each attendance record.</p>
        <p>Multiple sessions per day are highlighted in blue. For questions, contact your system administrator.</p>
      </div>
    </body>
    </html>
  `;
}
