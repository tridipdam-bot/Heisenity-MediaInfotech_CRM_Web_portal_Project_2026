import { Request, Response } from 'express'
import { prisma } from '../../../lib/prisma'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

export const getPayrollRecords = async (req: Request, res: Response) => {
  try {
    const records = await prisma.payrollRecord.findMany({
      include: {
        employee: {
          select: {
            name: true,
            employeeId: true,
            email: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    res.json({
      success: true,
      data: records
    })
  } catch (error) {
    console.error('Error fetching payroll records:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll records'
    })
  }
}

export const generatePayslip = async (req: Request, res: Response) => {
  try {
    console.log('=== PAYSLIP GENERATION START ===')
    console.log('Request body:', req.body)
    
    const {
      employeeId,
      month,
      year,
      basicSalary,
      allowances,
      deductions,
      overtime,
      netSalary,
      processedBy,
      payslipDetails
    } = req.body

    console.log('Employee ID:', employeeId)
    console.log('Month/Year:', month, year)

    // Check if payroll record already exists
    const existingRecord = await prisma.payrollRecord.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month,
          year
        }
      }
    })

    if (existingRecord) {
      console.log('Payroll record already exists:', existingRecord.id)
      return res.status(400).json({
        success: false,
        message: 'Payroll record already exists for this employee and month'
      })
    }

    // Get employee details
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        team: true
      }
    })

    if (!employee) {
      console.log('Employee not found with ID:', employeeId)
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      })
    }

    console.log('Found employee:', employee.name, employee.employeeId)

    // Create payroll record
    const payrollRecord = await prisma.payrollRecord.create({
      data: {
        employeeId,
        month,
        year,
        basicSalary: parseFloat(basicSalary.toString()),
        allowances: parseFloat(allowances.toString()),
        deductions: parseFloat(deductions.toString()),
        overtime: parseFloat(overtime.toString()) || 0,
        netSalary: parseFloat(netSalary.toString()),
        status: 'PROCESSED',
        processedBy,
        processedAt: new Date()
      }
    })

    console.log('Created payroll record:', payrollRecord.id)

    // Generate PDF payslip
    console.log('Generating PDF...')
    const pdfBuffer = await generatePayslipPDF(employee, payrollRecord, payslipDetails)
    console.log('PDF generated, size:', pdfBuffer.length, 'bytes')
    
    // Save PDF to employee documents
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const fileName = `${employee.employeeId}_payslip_${month}_${year}.pdf`
    const filePath = path.join(uploadsDir, fileName)
    
    fs.writeFileSync(filePath, pdfBuffer)
    console.log('PDF saved to:', filePath)

    // Create document record
    const documentRecord = await prisma.employeeDocument.create({
      data: {
        employeeId, // This is the internal UUID
        title: `Payslip - ${getMonthName(month)} ${year}`,
        description: `Payslip for ${employee.name} for ${getMonthName(month)} ${year}`,
        fileName,
        filePath: fileName, // Store relative path
        fileSize: pdfBuffer.length,
        mimeType: 'application/pdf',
        uploadedBy: processedBy
      }
    })

    console.log('Created document record:', documentRecord.id)
    console.log('Document associated with employee UUID:', employeeId)
    console.log('Employee string ID:', employee.employeeId)
    console.log('=== PAYSLIP GENERATION SUCCESS ===')

    res.json({
      success: true,
      message: 'Payslip generated successfully',
      data: payrollRecord
    })

  } catch (error) {
    console.error('=== PAYSLIP GENERATION ERROR ===')
    console.error('Error generating payslip:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate payslip'
    })
  }
}

const generatePayslipPDF = async (employee: any, payrollRecord: any, payslipDetails: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      // Add logo
      const logoPath = path.join(process.cwd(), 'logo', 'Media_Infotech.png')
      console.log('=== LOGO DEBUG ===')
      console.log('Current working directory:', process.cwd())
      console.log('Logo path:', logoPath)
      console.log('Logo file exists:', fs.existsSync(logoPath))
      
      if (fs.existsSync(logoPath)) {
        try {
          console.log('Attempting to add logo to PDF...')
          doc.image(logoPath, 50, 50, { width: 100 })
          console.log('Logo added successfully!')
        } catch (logoError) {
          console.error('Error adding logo to PDF:', logoError)
          // Add a placeholder for logo space if logo fails to load
          doc.rect(50, 50, 100, 60).stroke()
          doc.fontSize(8).text('LOGO', 85, 75)
        }
      } else {
        console.log('Logo file not found, using placeholder')
        // Add a placeholder for logo space if logo not found
        doc.rect(50, 50, 100, 60).stroke()
        doc.fontSize(8).text('LOGO', 85, 75)
      }
      console.log('=== END LOGO DEBUG ===')

      // Company header
      doc.fontSize(20).font('Helvetica-Bold')
      doc.text('MEDIA INFOTECH', 170, 70)
      
      doc.fontSize(14).font('Helvetica')
      doc.text(`Pay Slip for the month Of ${getMonthName(payrollRecord.month)}' ${payrollRecord.year}`, 50, 120)

      // Employee details table
      let yPos = 160
      const tableWidth = 500
      const colWidth = tableWidth / 2

      // Employee info section
      const employeeInfo = [
        ['Employee No.', employee.employeeId],
        ['Employee Name', employee.name],
        ['Designation', employee.role],
        ['Location', employee.team?.name || 'N/A'],
        ['UAN no.', 'N/A'],
        ['ESI No.', 'N/A'],
        ['Days Paid', '30']
      ]

      employeeInfo.forEach(([label, value]) => {
        doc.rect(50, yPos, colWidth, 25).stroke()
        doc.rect(50 + colWidth, yPos, colWidth, 25).stroke()
        
        doc.fontSize(10).font('Helvetica-Bold')
        doc.text(label, 55, yPos + 8)
        doc.font('Helvetica')
        doc.text(value, 55 + colWidth, yPos + 8)
        
        yPos += 25
      })

      // Income and Deductions table
      yPos += 20
      
      // Headers
      doc.rect(50, yPos, colWidth / 2, 25).stroke()
      doc.rect(50 + colWidth / 2, yPos, colWidth / 2, 25).stroke()
      doc.rect(50 + colWidth, yPos, colWidth / 2, 25).stroke()
      doc.rect(50 + colWidth + colWidth / 2, yPos, colWidth / 2, 25).stroke()

      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Income', 55, yPos + 8)
      doc.text('(Rs.)', 55 + colWidth / 2, yPos + 8)
      doc.text('Deductions', 55 + colWidth, yPos + 8)
      doc.text('(Rs.)', 55 + colWidth + colWidth / 2, yPos + 8)

      yPos += 25

      // Income and deduction rows
      const incomeItems = [
        ['Basic', payslipDetails.basicSalary],
        ['House Rent Allowances', payslipDetails.houseRentAllowance],
        ['Skill Allowances', payslipDetails.skillAllowance],
        ['Conveyance Allowances', payslipDetails.conveyanceAllowance],
        ['Medial Allowances', payslipDetails.medicalAllowance]
      ]

      const deductionItems = [
        ['Professional Tax', payslipDetails.professionalTax],
        ['Provident Fund', payslipDetails.providentFund],
        ['ESI', payslipDetails.esi],
        ['Income Tax', payslipDetails.incomeTax],
        ['Personal Loan', payslipDetails.personalLoan],
        ['Other Advance', payslipDetails.otherAdvance]
      ]

      const maxRows = Math.max(incomeItems.length, deductionItems.length)

      for (let i = 0; i < maxRows; i++) {
        doc.rect(50, yPos, colWidth / 2, 25).stroke()
        doc.rect(50 + colWidth / 2, yPos, colWidth / 2, 25).stroke()
        doc.rect(50 + colWidth, yPos, colWidth / 2, 25).stroke()
        doc.rect(50 + colWidth + colWidth / 2, yPos, colWidth / 2, 25).stroke()

        doc.fontSize(9).font('Helvetica')
        
        if (i < incomeItems.length) {
          doc.text(incomeItems[i][0], 55, yPos + 8)
          doc.text(incomeItems[i][1].toString(), 55 + colWidth / 2, yPos + 8)
        }
        
        if (i < deductionItems.length) {
          doc.text(deductionItems[i][0], 55 + colWidth, yPos + 8)
          doc.text(deductionItems[i][1].toString(), 55 + colWidth + colWidth / 2, yPos + 8)
        }

        yPos += 25
      }

      // Totals row
      doc.rect(50, yPos, colWidth / 2, 25).stroke()
      doc.rect(50 + colWidth / 2, yPos, colWidth / 2, 25).stroke()
      doc.rect(50 + colWidth, yPos, colWidth / 2, 25).stroke()
      doc.rect(50 + colWidth + colWidth / 2, yPos, colWidth / 2, 25).stroke()

      const totalIncome = payslipDetails.basicSalary + payslipDetails.houseRentAllowance + 
                         payslipDetails.skillAllowance + payslipDetails.conveyanceAllowance + 
                         payslipDetails.medicalAllowance

      const totalDeductions = payslipDetails.professionalTax + payslipDetails.providentFund + 
                             payslipDetails.esi + payslipDetails.incomeTax + 
                             payslipDetails.personalLoan + payslipDetails.otherAdvance

      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Total Erning', 55, yPos + 8)
      doc.text(totalIncome.toString(), 55 + colWidth / 2, yPos + 8)
      doc.text('Total Deduction:', 55 + colWidth, yPos + 8)
      doc.text(totalDeductions.toString(), 55 + colWidth + colWidth / 2, yPos + 8)

      yPos += 25

      // Reimbursements section
      yPos += 10
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Reimbursements:', 50, yPos)
      yPos += 20

      const reimbursements = [
        ['Medical Exp.', payslipDetails.medicalExp],
        ['LTA', payslipDetails.lta],
        ['Rep & Main. Of Car', payslipDetails.repairMaintenance],
        ['Fuel exp. Of Car', payslipDetails.fuelExp]
      ]

      reimbursements.forEach(([label, value]) => {
        doc.rect(50, yPos, colWidth, 25).stroke()
        doc.rect(50 + colWidth, yPos, colWidth, 25).stroke()
        
        doc.fontSize(9).font('Helvetica')
        doc.text(label, 55, yPos + 8)
        doc.text(value.toString(), 55 + colWidth, yPos + 8)
        
        yPos += 25
      })

      // Net Pay
      yPos += 10
      doc.rect(50, yPos, colWidth / 2, 25).stroke()
      doc.rect(50 + colWidth / 2, yPos, colWidth / 2, 25).stroke()
      doc.rect(50 + colWidth, yPos, colWidth, 25).stroke()

      doc.fontSize(10).font('Helvetica-Bold')
      doc.text('Net Pay', 55, yPos + 8)
      doc.text('-', 55 + colWidth / 2, yPos + 8)
      doc.text('Transferred to Bank A/c No.', 55 + colWidth, yPos + 8)

      yPos += 25
      doc.rect(50, yPos, colWidth, 25).stroke()
      doc.rect(50 + colWidth, yPos, colWidth, 25).stroke()

      doc.text(`₹${payrollRecord.netSalary.toFixed(2)}`, 55, yPos + 8)

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

const getMonthName = (month: number): string => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  return months[month - 1] || 'Jan'
}