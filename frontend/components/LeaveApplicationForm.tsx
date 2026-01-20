"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileText, Send, AlertCircle } from "lucide-react"
import { showToast } from "@/lib/toast-utils"

interface LeaveApplicationFormProps {
  employeeId: string
  employeeName: string
  onSuccess?: () => void
}

interface LeaveBalance {
  sickLeaveBalance: number
  casualLeaveBalance: number
  employeeId: string
  employeeName: string
}

export enum LeaveType {
  SICK_LEAVE = 'SICK_LEAVE',
  CASUAL_LEAVE = 'CASUAL_LEAVE'
}

const leaveTypeLabels = {
  [LeaveType.SICK_LEAVE]: 'Sick Leave',
  [LeaveType.CASUAL_LEAVE]: 'Casual Leave'
}

export function LeaveApplicationForm({ employeeId, employeeName, onSuccess }: LeaveApplicationFormProps) {
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  })
  const [loading, setLoading] = useState(false)
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  // Fetch leave balance on component mount
  useEffect(() => {
    fetchLeaveBalance()
  }, [employeeId])

  const fetchLeaveBalance = async () => {
    try {
      setBalanceLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/leave/balance/${employeeId}`)
      const result = await response.json()

      if (result.success) {
        setLeaveBalance(result.data)
      } else {
        console.error('Failed to fetch leave balance:', result.error)
      }
    } catch (error) {
      console.error('Error fetching leave balance:', error)
    } finally {
      setBalanceLoading(false)
    }
  }

  const getTodayDateString = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const calculateDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      return diffDays
    }
    return 0
  }

  const getAvailableBalance = (leaveType: string) => {
    if (!leaveBalance) return 0
    if (leaveType === LeaveType.SICK_LEAVE) return leaveBalance.sickLeaveBalance
    if (leaveType === LeaveType.CASUAL_LEAVE) return leaveBalance.casualLeaveBalance
    return 0 // No other leave types allowed
  }

  const canApplyForLeave = () => {
    if (!leaveBalance) return false
    if (leaveBalance.sickLeaveBalance === 0 && leaveBalance.casualLeaveBalance === 0) return false
    
    const requestedDays = calculateDays()
    const availableBalance = getAvailableBalance(formData.leaveType)
    
    // Only sick and casual leave are allowed, both require balance check
    return availableBalance >= requestedDays
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason.trim()) {
      showToast.error('Please fill in all required fields')
      return
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      showToast.error('End date cannot be before start date')
      return
    }

    // Compare dates properly by setting time to start of day
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startDate = new Date(formData.startDate)
    startDate.setHours(0, 0, 0, 0)
    
    if (startDate < today) {
      showToast.error('Start date cannot be in the past')
      return
    }

    // Check leave balance
    if (!canApplyForLeave()) {
      const requestedDays = calculateDays()
      const availableBalance = getAvailableBalance(formData.leaveType)
      
      if (leaveBalance?.sickLeaveBalance === 0 && leaveBalance?.casualLeaveBalance === 0) {
        showToast.error('No leave balance available. Cannot apply for any leave.')
        return
      }
      
      // Both sick and casual leave require balance check
      showToast.error(`Insufficient ${formData.leaveType === LeaveType.SICK_LEAVE ? 'sick' : 'casual'} leave balance. Available: ${availableBalance} days, Required: ${requestedDays} days`)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/leave/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          leaveType: formData.leaveType,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        showToast.success('Leave application submitted successfully!', 'Application Submitted')
        setFormData({
          leaveType: '',
          startDate: '',
          endDate: '',
          reason: ''
        })
        // Refresh leave balance after successful application
        fetchLeaveBalance()
        onSuccess?.()
      } else {
        throw new Error(result.error || 'Failed to submit leave application')
      }
    } catch (error) {
      console.error('Error submitting leave application:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showToast.error(`Failed to submit leave application: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <span>Apply for Leave</span>
        </CardTitle>
        <p className="text-gray-600">
          Submit a leave application for approval
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Employee Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Employee ID:</span>
                <span className="ml-2 font-medium">{employeeId}</span>
              </div>
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{employeeName}</span>
              </div>
            </div>
          </div>

          {/* Leave Balance */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-3">Leave Balance</h4>
            {balanceLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-700">Loading balance...</span>
              </div>
            ) : leaveBalance ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Sick Leave:</span>
                  <span className={`font-medium ${leaveBalance.sickLeaveBalance === 0 ? 'text-red-600' : 'text-blue-900'}`}>
                    {leaveBalance.sickLeaveBalance} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Casual Leave:</span>
                  <span className={`font-medium ${leaveBalance.casualLeaveBalance === 0 ? 'text-red-600' : 'text-blue-900'}`}>
                    {leaveBalance.casualLeaveBalance} days
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Failed to load leave balance</span>
              </div>
            )}
          </div>

          {/* No Leave Balance Warning */}
          {leaveBalance && leaveBalance.sickLeaveBalance === 0 && leaveBalance.casualLeaveBalance === 0 && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-900">No Leave Balance Available</h4>
                  <p className="text-red-700 text-sm mt-1">
                    You have no sick leave or casual leave balance remaining. You cannot apply for these leave types.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leave Type */}
          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type *</Label>
            <Select value={formData.leaveType} onValueChange={(value) => setFormData(prev => ({ ...prev, leaveType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leaveTypeLabels).map(([value, label]) => {
                  const isDisabled = leaveBalance ? 
                    ((value === LeaveType.SICK_LEAVE && leaveBalance.sickLeaveBalance === 0) ||
                     (value === LeaveType.CASUAL_LEAVE && leaveBalance.casualLeaveBalance === 0)) : false
                  
                  return (
                    <SelectItem key={value} value={value} disabled={isDisabled}>
                      <div className="flex items-center justify-between w-full">
                        <span>{label}</span>
                        {isDisabled && <span className="text-red-500 text-xs ml-2">(No balance)</span>}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                min={getTodayDateString()}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                min={formData.startDate || getTodayDateString()}
                required
              />
            </div>
          </div>

          {/* Duration Display */}
          {formData.startDate && formData.endDate && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    Duration: {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
                  </span>
                </div>
                {formData.leaveType && (
                  <div className="text-sm">
                    <span className="text-blue-700">Available: </span>
                    <span className={`font-medium ${getAvailableBalance(formData.leaveType) < calculateDays() ? 'text-red-600' : 'text-blue-900'}`}>
                      {getAvailableBalance(formData.leaveType)} days
                    </span>
                  </div>
                )}
              </div>
              {formData.leaveType && 
               getAvailableBalance(formData.leaveType) < calculateDays() && (
                <div className="mt-2 flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Insufficient leave balance for this duration</span>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Leave *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for your leave application..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              rows={4}
              required
            />
            <p className="text-xs text-gray-500">
              This information will be visible to the admin reviewing your application
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading || !canApplyForLeave()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}