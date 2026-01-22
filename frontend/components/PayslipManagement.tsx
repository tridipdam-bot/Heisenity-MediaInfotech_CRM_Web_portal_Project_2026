"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, FileText, Calendar, User, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"

interface Employee {
  id: string
  name: string
  employeeId: string
  email: string
  salary: number | string
  role: string
  team?: {
    name: string
  }
}

interface PayrollRecord {
  id: string
  month: number
  year: number
  basicSalary: number | string
  allowances: number | string
  deductions: number | string
  overtime: number | string
  netSalary: number | string
  status: 'DRAFT' | 'PROCESSED' | 'PAID'
  processedAt?: string
  employee: {
    name: string
    employeeId: string
  }
}

interface PayslipFormData {
  employeeId: string
  month: number
  year: number
  basicSalary: number
  houseRentAllowance: number
  skillAllowance: number
  conveyanceAllowance: number
  medicalAllowance: number
  professionalTax: number
  providentFund: number
  esi: number
  incomeTax: number
  personalLoan: number
  otherAdvance: number
  medicalExp: number
  lta: number
  repairMaintenance: number
  fuelExp: number
}

interface PayslipManagementProps {
  adminId: string
  adminName: string
}

export function PayslipManagement({ adminId, adminName }: PayslipManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [formData, setFormData] = useState<PayslipFormData>({
    employeeId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basicSalary: 0,
    houseRentAllowance: 0,
    skillAllowance: 0,
    conveyanceAllowance: 0,
    medicalAllowance: 0,
    professionalTax: 0,
    providentFund: 0,
    esi: 0,
    incomeTax: 0,
    personalLoan: 0,
    otherAdvance: 0,
    medicalExp: 0,
    lta: 0,
    repairMaintenance: 0,
    fuelExp: 0
  })

  const { toast } = useToast()
  const { authenticatedFetch, isAuthenticated } = useAuthenticatedFetch()

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  useEffect(() => {
    if (isAuthenticated) {
      fetchEmployees()
      fetchPayrollRecords()
    }
  }, [isAuthenticated])

  const fetchEmployees = async () => {
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/employees`)
      const result = await response.json()
      
      if (result.success && result.data && Array.isArray(result.data.employees)) {
        setEmployees(result.data.employees)
      } else {
        console.error('Invalid employees data:', result)
        setEmployees([])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      setEmployees([])
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      })
    }
  }

  const fetchPayrollRecords = async () => {
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/payroll`)
      const result = await response.json()
      
      if (result.success && Array.isArray(result.data)) {
        setPayrollRecords(result.data)
      } else {
        console.error('Invalid payroll data:', result)
        setPayrollRecords([])
      }
    } catch (error) {
      console.error('Error fetching payroll records:', error)
      setPayrollRecords([])
    }
  }

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (employee) {
      setSelectedEmployee(employee)
      setFormData(prev => ({
        ...prev,
        employeeId: employee.id,
        basicSalary: Number(employee.salary) || 0
      }))
    }
  }

  const handleInputChange = (field: keyof PayslipFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? (parseFloat(value) || 0) : (Number(value) || 0)
    }))
  }

  const calculateTotals = () => {
    const totalIncome = (formData.basicSalary || 0) + (formData.houseRentAllowance || 0) + 
                       (formData.skillAllowance || 0) + (formData.conveyanceAllowance || 0) + 
                       (formData.medicalAllowance || 0)

    const totalDeductions = (formData.professionalTax || 0) + (formData.providentFund || 0) + 
                           (formData.esi || 0) + (formData.incomeTax || 0) + (formData.personalLoan || 0) + 
                           (formData.otherAdvance || 0)

    const totalReimbursements = (formData.medicalExp || 0) + (formData.lta || 0) + 
                               (formData.repairMaintenance || 0) + (formData.fuelExp || 0)

    const netPay = totalIncome - totalDeductions + totalReimbursements

    return { 
      totalIncome: Number(totalIncome) || 0, 
      totalDeductions: Number(totalDeductions) || 0, 
      totalReimbursements: Number(totalReimbursements) || 0, 
      netPay: Number(netPay) || 0 
    }
  }

  const generatePayslip = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive"
      })
      return
    }

    setGenerating(true)
    try {
      const { totalIncome, totalDeductions, netPay } = calculateTotals()
      
      const payrollData = {
        employeeId: formData.employeeId,
        month: formData.month,
        year: formData.year,
        basicSalary: formData.basicSalary,
        allowances: formData.houseRentAllowance + formData.skillAllowance + 
                   formData.conveyanceAllowance + formData.medicalAllowance,
        deductions: totalDeductions,
        overtime: 0,
        netSalary: netPay,
        processedBy: adminId,
        payslipDetails: formData
      }

      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/payroll/generate`, {
        method: 'POST',
        body: JSON.stringify(payrollData)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Payslip generated successfully and saved to employee documents"
        })
        
        // Reset form
        setFormData({
          employeeId: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          basicSalary: 0,
          houseRentAllowance: 0,
          skillAllowance: 0,
          conveyanceAllowance: 0,
          medicalAllowance: 0,
          professionalTax: 0,
          providentFund: 0,
          esi: 0,
          incomeTax: 0,
          personalLoan: 0,
          otherAdvance: 0,
          medicalExp: 0,
          lta: 0,
          repairMaintenance: 0,
          fuelExp: 0
        })
        setSelectedEmployee(null)
        
        // Refresh payroll records
        fetchPayrollRecords()
      } else {
        throw new Error(result.message || 'Failed to generate payslip')
      }
    } catch (error) {
      console.error('Error generating payslip:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate payslip",
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }

  const { totalIncome, totalDeductions, totalReimbursements, netPay } = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Payslip Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Payslip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Employee Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Select Employee</Label>
              <Select onValueChange={handleEmployeeSelect} value={formData.employeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(employees) && employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-2">
                        <span>{employee.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {employee.employeeId}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select onValueChange={(value) => handleInputChange('month', parseInt(value))} value={formData.month.toString()}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select onValueChange={(value) => handleInputChange('year', parseInt(value))} value={formData.year.toString()}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedEmployee && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">{selectedEmployee.name}</p>
                  <p className="text-sm text-blue-700">
                    ID: {selectedEmployee.employeeId} | Role: {selectedEmployee.role}
                    {selectedEmployee.team && ` | Team: ${selectedEmployee.team.name}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Income Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Income
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="basicSalary">Basic Salary</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => handleInputChange('basicSalary', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="houseRentAllowance">House Rent Allowance</Label>
                  <Input
                    id="houseRentAllowance"
                    type="number"
                    value={formData.houseRentAllowance}
                    onChange={(e) => handleInputChange('houseRentAllowance', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skillAllowance">Skill Allowance</Label>
                  <Input
                    id="skillAllowance"
                    type="number"
                    value={formData.skillAllowance}
                    onChange={(e) => handleInputChange('skillAllowance', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conveyanceAllowance">Conveyance Allowance</Label>
                  <Input
                    id="conveyanceAllowance"
                    type="number"
                    value={formData.conveyanceAllowance}
                    onChange={(e) => handleInputChange('conveyanceAllowance', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalAllowance">Medical Allowance</Label>
                  <Input
                    id="medicalAllowance"
                    type="number"
                    value={formData.medicalAllowance}
                    onChange={(e) => handleInputChange('medicalAllowance', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <Separator />
              <div className="flex justify-between items-center font-semibold text-green-700">
                <span>Total Income:</span>
                <span>₹{totalIncome.toFixed(2)}</span>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-red-700">Deductions</h3>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="professionalTax">Professional Tax</Label>
                  <Input
                    id="professionalTax"
                    type="number"
                    value={formData.professionalTax}
                    onChange={(e) => handleInputChange('professionalTax', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="providentFund">Provident Fund</Label>
                  <Input
                    id="providentFund"
                    type="number"
                    value={formData.providentFund}
                    onChange={(e) => handleInputChange('providentFund', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="esi">ESI</Label>
                  <Input
                    id="esi"
                    type="number"
                    value={formData.esi}
                    onChange={(e) => handleInputChange('esi', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incomeTax">Income Tax</Label>
                  <Input
                    id="incomeTax"
                    type="number"
                    value={formData.incomeTax}
                    onChange={(e) => handleInputChange('incomeTax', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalLoan">Personal Loan</Label>
                  <Input
                    id="personalLoan"
                    type="number"
                    value={formData.personalLoan}
                    onChange={(e) => handleInputChange('personalLoan', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherAdvance">Other Advance</Label>
                  <Input
                    id="otherAdvance"
                    type="number"
                    value={formData.otherAdvance}
                    onChange={(e) => handleInputChange('otherAdvance', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <Separator />
              <div className="flex justify-between items-center font-semibold text-red-700">
                <span>Total Deductions:</span>
                <span>₹{totalDeductions.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Reimbursements Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-700">Reimbursements</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medicalExp">Medical Exp.</Label>
                <Input
                  id="medicalExp"
                  type="number"
                  value={formData.medicalExp}
                  onChange={(e) => handleInputChange('medicalExp', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lta">LTA</Label>
                <Input
                  id="lta"
                  type="number"
                  value={formData.lta}
                  onChange={(e) => handleInputChange('lta', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repairMaintenance">Rep & Main. Of Car</Label>
                <Input
                  id="repairMaintenance"
                  type="number"
                  value={formData.repairMaintenance}
                  onChange={(e) => handleInputChange('repairMaintenance', e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuelExp">Fuel exp. Of Car</Label>
                <Input
                  id="fuelExp"
                  type="number"
                  value={formData.fuelExp}
                  onChange={(e) => handleInputChange('fuelExp', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-between items-center font-semibold text-blue-700">
              <span>Total Reimbursements:</span>
              <span>₹{totalReimbursements.toFixed(2)}</span>
            </div>
          </div>

          {/* Net Pay Summary */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Net Pay:</span>
              <span className="text-green-600">₹{netPay.toFixed(2)}</span>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button 
              onClick={generatePayslip} 
              disabled={!selectedEmployee || generating}
              className="px-8"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Payslip
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payroll Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Payroll Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(payrollRecords) || payrollRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payroll records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payrollRecords.slice(0, 10).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{record.employee.name}</p>
                      <p className="text-sm text-gray-500">
                        {record.employee.employeeId} | {months.find(m => m.value === record.month)?.label} {record.year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">₹{Number(record.netSalary || 0).toFixed(2)}</p>
                      <Badge 
                        variant={record.status === 'PAID' ? 'default' : record.status === 'PROCESSED' ? 'secondary' : 'outline'}
                      >
                        {record.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}