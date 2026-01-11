"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileText, Send } from "lucide-react"
import { showToast } from "@/lib/toast-utils"

interface LeaveApplicationFormProps {
  employeeId: string
  employeeName: string
  onSuccess?: () => void
}

export enum LeaveType {
  SICK_LEAVE = 'SICK_LEAVE',
  CASUAL_LEAVE = 'CASUAL_LEAVE',
  ANNUAL_LEAVE = 'ANNUAL_LEAVE',
  EMERGENCY_LEAVE = 'EMERGENCY_LEAVE',
  MATERNITY_LEAVE = 'MATERNITY_LEAVE',
  PATERNITY_LEAVE = 'PATERNITY_LEAVE',
  OTHER = 'OTHER'
}

const leaveTypeLabels = {
  [LeaveType.SICK_LEAVE]: 'Sick Leave',
  [LeaveType.CASUAL_LEAVE]: 'Casual Leave',
  [LeaveType.ANNUAL_LEAVE]: 'Annual Leave',
  [LeaveType.EMERGENCY_LEAVE]: 'Emergency Leave',
  [LeaveType.MATERNITY_LEAVE]: 'Maternity Leave',
  [LeaveType.PATERNITY_LEAVE]: 'Paternity Leave',
  [LeaveType.OTHER]: 'Other'
}

export function LeaveApplicationForm({ employeeId, employeeName, onSuccess }: LeaveApplicationFormProps) {
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  })
  const [loading, setLoading] = useState(false)

  const getTodayDateString = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
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

          {/* Leave Type */}
          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type *</Label>
            <Select value={formData.leaveType} onValueChange={(value) => setFormData(prev => ({ ...prev, leaveType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(leaveTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
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
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  Duration: {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
                </span>
              </div>
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
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
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