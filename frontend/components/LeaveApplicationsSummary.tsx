"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, Eye, Clock } from "lucide-react"
import Link from "next/link"

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
}

const leaveTypeLabels: Record<string, string> = {
  'SICK_LEAVE': 'Sick Leave',
  'CASUAL_LEAVE': 'Casual Leave'
}

export function LeaveApplicationsSummary() {
  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  })

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/leave/applications`)
        const result = await response.json()
        
        if (result.success) {
          const allApplications = result.data || []
          
          // Get recent pending applications
          const pendingApplications = allApplications
            .filter((app: LeaveApplication) => app.status === 'PENDING')
            .sort((a: LeaveApplication, b: LeaveApplication) => 
              new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
            )
            .slice(0, 3)
          
          setApplications(pendingApplications)
          
          // Calculate stats
          const stats = allApplications.reduce((acc: any, app: LeaveApplication) => {
            acc.total++
            acc[app.status.toLowerCase()]++
            return acc
          }, { pending: 0, approved: 0, rejected: 0, total: 0 })
          
          setStats(stats)
        }
      } catch (error) {
        console.error('Error fetching leave applications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  if (loading) {
    return (
      <Card className="bg-white shadow-sm border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <FileText className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pending Applications */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Recent Pending Applications
            </CardTitle>
            <Link href="/leave-management">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No pending leave applications</p>
            </div>
          ) : (
            applications.map((application) => (
              <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {application.employeeName} ({application.employeeId})
                    </p>
                    <p className="text-sm text-gray-500">
                      {leaveTypeLabels[application.leaveType] || application.leaveType} - {formatDate(application.startDate)} to {formatDate(application.endDate)} ({calculateDays(application.startDate, application.endDate)} days)
                    </p>
                  </div>
                </div>
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Pending
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}