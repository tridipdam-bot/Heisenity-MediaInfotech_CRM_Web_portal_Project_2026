"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { User, Clock, CheckSquare } from "lucide-react"
import { TaskCheckInOut } from "./TaskCheckInOut"
import { DailyClockInOut } from "./DailyClockInOut"
import { getEmployeeByEmployeeId } from "@/lib/server-api"

/**
 * =============================================================================
 * EMPLOYEE SELF ATTENDANCE - MAIN COMPONENT
 * =============================================================================
 * This component now serves as a container for two separate systems:
 * 1. Daily Clock-in/Clock-out (for field engineers)
 * 2. Task Check-in/Check-out (for task management)
 * 
 * The two systems are completely independent and use separate APIs.
 * =============================================================================
 */

interface CustomUser {
  id: string
  email: string
  name: string
  userType: string
  employeeId?: string
}

export function EmployeeSelfAttendance() {
  const { data: session } = useSession()
  const [employeeId, setEmployeeId] = useState("")
  const [employeeRole, setEmployeeRole] = useState<'FIELD_ENGINEER' | 'IN_OFFICE' | null>(null)
  const [employeeName, setEmployeeName] = useState("")
  const [isDailyApproved, setIsDailyApproved] = useState(false)

  // Auto-fill employee ID from session
  useEffect(() => {
    if (session?.user) {
      const user = session.user as CustomUser
      if (user.userType === 'EMPLOYEE' && user.employeeId) {
        // Use a callback to avoid direct setState in effect
        setTimeout(() => {
          setEmployeeId(user.employeeId!)
          setEmployeeName(user.name)
        }, 0)
      }
    }
  }, [session])

  // Get employee role and details
  useEffect(() => {
    const getEmployeeRole = async (empId: string) => {
      try {
        const response = await getEmployeeByEmployeeId(empId)
        if (response.success && response.data && response.data.role) {
          const role = response.data.role as 'FIELD_ENGINEER' | 'IN_OFFICE'
          setEmployeeRole(role)
          setEmployeeName(response.data.name)
        }
      } catch (error) {
        console.error('Error getting employee role:', error)
      }
    }

    if (employeeId.trim()) {
      getEmployeeRole(employeeId.trim())
    }
  }, [employeeId])

  const handleTaskStatusChange = (hasTask: boolean) => {
    // Task status change handler - can be used for future features
    console.log('Task status changed:', hasTask)
  }

  const handleAttendanceStatusChange = (status: { clockIn: string | null; approvalStatus: string }) => {
    setIsDailyApproved(!!(status.clockIn && status.approvalStatus === 'APPROVED'))
  }

  const getRoleDisplay = () => {
    switch (employeeRole) {
      case 'FIELD_ENGINEER':
        return (
          <Badge variant="default">
            <User className="h-4 w-4 mr-1" />
            Field Engineer
          </Badge>
        )
      case 'IN_OFFICE':
        return (
          <Badge variant="secondary">
            <User className="h-4 w-4 mr-1" />
            In-Office Staff
          </Badge>
        )
      default:
        return null
    }
  }

  const getTabsForRole = () => {
    if (employeeRole === 'FIELD_ENGINEER') {
      return (
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Daily Clock-in/out
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Task Check-in/out
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="mt-6">
            <DailyClockInOut 
              employeeId={employeeId}
              employeeRole={employeeRole}
              onAttendanceStatusChange={handleAttendanceStatusChange}
            />
          </TabsContent>
          
          <TabsContent value="tasks" className="mt-6">
            {!isDailyApproved ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Please clock in for the day and wait for admin approval before accessing tasks.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <TaskCheckInOut 
                employeeId={employeeId}
                onTaskStatusChange={handleTaskStatusChange}
              />
            )}
          </TabsContent>
        </Tabs>
      )
    } else if (employeeRole === 'IN_OFFICE') {
      // In-office staff only need daily clock-in/clock-out
      return (
        <DailyClockInOut 
          employeeId={employeeId}
          employeeRole={employeeRole}
        />
      )
    }

    return null
  }

  if (!employeeId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Please log in with your employee account to access attendance features.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Employee Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Employee Attendance</h1>
              <p className="text-muted-foreground">Welcome, {employeeName}</p>
            </div>
            <div className="flex items-center gap-2">
              {getRoleDisplay()}
              <Badge variant="outline">ID: {employeeId}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Role-specific Content */}
      {getTabsForRole()}

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            {employeeRole === 'FIELD_ENGINEER' ? (
              <>
                <p><strong>Daily Clock-in/out:</strong> Use this to start and end your workday. Requires admin approval.</p>  
                <p><strong>Task Check-in/out:</strong> Use this to start and complete specific assigned tasks.</p>
                <p><strong>Note:</strong> You must be approved for daily attendance before you can work on tasks.</p>
              </>
            ) : employeeRole === 'IN_OFFICE' ? (
              <>
                <p><strong>Daily Clock-in/out:</strong> Use this to start and end your workday. Requires admin approval.</p>
              </>
            ) : (
              <p>Loading employee information...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}