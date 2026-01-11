"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, FileText, Check, X, Eye, User } from "lucide-react"
import { showToast } from "@/lib/toast-utils"

interface LeaveApplication {
  id: string
  employeeId: string
  employeeName?: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  appliedAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  createdAt: string
  updatedAt: string
}

interface AdminLeaveManagementProps {
  adminId: string
  adminName: string
}

const leaveTypeLabels: Record<string, string> = {
  'SICK_LEAVE': 'Sick Leave',
  'CASUAL_LEAVE': 'Casual Leave',
  'ANNUAL_LEAVE': 'Annual Leave',
  'EMERGENCY_LEAVE': 'Emergency Leave',
  'MATERNITY_LEAVE': 'Maternity Leave',
  'PATERNITY_LEAVE': 'Paternity Leave',
  'OTHER': 'Other'
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300'
}

export function AdminLeaveManagement({ adminId, adminName }: AdminLeaveManagementProps) {
  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/leave/applications`)
      const result = await response.json()

      if (result.success) {
        setApplications(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch leave applications')
      }
    } catch (error) {
      console.error('Error fetching leave applications:', error)
      showToast.error('Failed to fetch leave applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleReviewApplication = async (applicationId: string, status: 'APPROVED' | 'REJECTED') => {
    setReviewLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/leave/applications/${applicationId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          reviewNote: reviewNote.trim() || undefined,
          reviewedBy: adminName
        })
      })

      const result = await response.json()

      if (result.success) {
        showToast.success(`Leave application ${status.toLowerCase()} successfully`)
        setSelectedApplication(null)
        setReviewNote('')
        fetchApplications()
      } else {
        throw new Error(result.error || 'Failed to review leave application')
      }
    } catch (error) {
      console.error('Error reviewing leave application:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showToast.error(`Failed to review leave application: ${errorMessage}`)
    } finally {
      setReviewLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const filteredApplications = applications.filter(app => {
    if (filter === 'ALL') return true
    return app.status === filter
  })

  const pendingCount = applications.filter(app => app.status === 'PENDING').length

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading leave applications...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span>Leave Applications Management</span>
                {pendingCount > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {pendingCount} Pending
                  </Badge>
                )}
              </CardTitle>
              <p className="text-gray-600">
                Review and manage employee leave applications
              </p>
            </div>
            <div className="flex space-x-2">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(status)}
                >
                  {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                  {status !== 'ALL' && (
                    <span className="ml-1">
                      ({applications.filter(app => app.status === status).length})
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'ALL' ? 'No Leave Applications' : `No ${filter.toLowerCase()} applications`}
              </h3>
              <p className="text-gray-600">
                {filter === 'ALL' 
                  ? 'No leave applications have been submitted yet.'
                  : `There are no ${filter.toLowerCase()} leave applications.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <div
                  key={application.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {application.employeeName} ({application.employeeId})
                          </span>
                        </div>
                        <Badge className={statusColors[application.status]}>
                          {application.status}
                        </Badge>
                      </div>
                      
                      <div className="mb-2">
                        <span className="font-medium text-gray-900">
                          {leaveTypeLabels[application.leaveType] || application.leaveType}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(application.startDate)} - {formatDate(application.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {calculateDays(application.startDate, application.endDate)} day{calculateDays(application.startDate, application.endDate) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Applied: {formatDate(application.appliedAt)}
                        </div>
                      </div>

                      <div className="text-sm text-gray-700 mb-3">
                        <span className="font-medium">Reason:</span> 
                        <span className="ml-1">
                          {application.reason.length > 100 
                            ? `${application.reason.substring(0, 100)}...` 
                            : application.reason
                          }
                        </span>
                      </div>

                      {application.reviewNote && (
                        <div className="bg-gray-50 rounded p-3 text-sm">
                          <span className="font-medium text-gray-900">Review Note:</span>
                          <p className="text-gray-700 mt-1">{application.reviewNote}</p>
                          {application.reviewedBy && application.reviewedAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Reviewed by {application.reviewedBy} on {formatDate(application.reviewedAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application)
                          setReviewNote(application.reviewNote || '')
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {application.status === 'PENDING' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReviewApplication(application.id, 'APPROVED')}
                            disabled={reviewLoading}
                            className="text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReviewApplication(application.id, 'REJECTED')}
                            disabled={reviewLoading}
                            className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Review Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Review Leave Application</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedApplication(null)
                    setReviewNote('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Employee Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Employee Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Employee ID:</span>
                      <span className="ml-2 font-medium">{selectedApplication.employeeId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedApplication.employeeName}</span>
                    </div>
                  </div>
                </div>

                {/* Leave Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Leave Type</label>
                    <p className="text-gray-900">{leaveTypeLabels[selectedApplication.leaveType] || selectedApplication.leaveType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <Badge className={statusColors[selectedApplication.status]}>
                        {selectedApplication.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Start Date</label>
                    <p className="text-gray-900">{formatDate(selectedApplication.startDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">End Date</label>
                    <p className="text-gray-900">{formatDate(selectedApplication.endDate)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <p className="text-gray-900">
                    {calculateDays(selectedApplication.startDate, selectedApplication.endDate)} day{calculateDays(selectedApplication.startDate, selectedApplication.endDate) !== 1 ? 's' : ''}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Reason</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 rounded p-3 mt-1">
                    {selectedApplication.reason}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Applied On</label>
                  <p className="text-gray-900">{formatDate(selectedApplication.appliedAt)}</p>
                </div>

                {/* Review Section */}
                {selectedApplication.status === 'PENDING' && (
                  <div className="border-t pt-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="reviewNote">Review Note (Optional)</Label>
                        <Textarea
                          id="reviewNote"
                          placeholder="Add a note for the employee (optional)..."
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => handleReviewApplication(selectedApplication.id, 'REJECTED')}
                          disabled={reviewLoading}
                          className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                        >
                          {reviewLoading ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <X className="h-4 w-4 mr-2" />
                          )}
                          Reject
                        </Button>
                        <Button
                          onClick={() => handleReviewApplication(selectedApplication.id, 'APPROVED')}
                          disabled={reviewLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {reviewLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Review */}
                {selectedApplication.reviewNote && selectedApplication.status !== 'PENDING' && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-600">Admin Review</label>
                    <div className="bg-gray-50 rounded p-3 mt-1">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedApplication.reviewNote}</p>
                      {selectedApplication.reviewedBy && selectedApplication.reviewedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Reviewed by {selectedApplication.reviewedBy} on {formatDate(selectedApplication.reviewedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}