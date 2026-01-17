"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { showToast } from "@/lib/toast-utils"
import { CheckCircle, XCircle, Clock, MapPin, RefreshCw } from "lucide-react"
import { useEffect, useState, useCallback } from "react"
import { taskCheckIn, taskCheckOut, getTaskStatus, getEmployeeTasks, AssignedTask } from "@/lib/server-api"

/**
 * =============================================================================
 * TASK CHECK-IN/CHECK-OUT COMPONENT
 * =============================================================================
 * This component handles ONLY task-level check-in/checkout operations.
 * It is completely separate from daily clock-in/clock-out functionality.
 * 
 * Purpose: Allow employees to start and complete specific tasks
 * Scope: Task management only
 * =============================================================================
 */

interface AssignedTask {
  id: string
  title: string
  description: string
  category?: string
  location?: string
  startTime?: string
  endTime?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  assignedAt: string
  assignedBy: string
}

interface TaskCheckInOutProps {
  employeeId: string
  onTaskStatusChange?: (hasActiveTask: boolean) => void
  refreshTrigger?: number // Add refresh trigger prop
}

interface TaskStatus {
  hasActiveTask: boolean
  currentTask: AssignedTask | null
  taskStartTime: string | null
  taskEndTime: string | null
}

export function TaskCheckInOut({ employeeId, onTaskStatusChange, refreshTrigger }: TaskCheckInOutProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null)
  const [availableTasks, setAvailableTasks] = useState<AssignedTask[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch current task status
  const fetchTaskStatus = useCallback(async () => {
    if (!employeeId.trim()) return

    try {
      setIsRefreshing(true)
      const result = await getTaskStatus(employeeId)

      if (result.success) {
        setTaskStatus(result.data!)
        onTaskStatusChange?.(result.data!.hasActiveTask)
      } else {
        console.error('Failed to fetch task status:', result.message)
      }
    } catch (error) {
      console.error('Error fetching task status:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [employeeId, onTaskStatusChange])

  // Fetch available tasks for employee
  const fetchAvailableTasks = useCallback(async () => {
    if (!employeeId.trim()) return

    try {
      setIsRefreshing(true)
      const result = await getEmployeeTasks(employeeId)

      if (result.success) {
        // Filter for pending tasks only
        const pendingTasks = result.data.tasks.filter((task: AssignedTask) => task.status === 'PENDING')
        setAvailableTasks(pendingTasks)
      } else {
        console.error('Failed to fetch tasks:', result.message)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [employeeId])

  // Initial load and periodic refresh
  useEffect(() => {
    if (employeeId.trim()) {
      fetchTaskStatus()
      fetchAvailableTasks()
    }
  }, [employeeId, refreshKey, refreshTrigger, fetchTaskStatus, fetchAvailableTasks])

  // Refresh every 30 seconds, or every 10 seconds if no tasks available
  useEffect(() => {
    const refreshInterval = availableTasks.length === 0 ? 10000 : 30000 // 10s if no tasks, 30s if tasks exist
    
    const interval = setInterval(() => {
      if (employeeId.trim()) {
        fetchTaskStatus()
        fetchAvailableTasks()
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [employeeId, availableTasks.length, fetchTaskStatus, fetchAvailableTasks])

  const handleTaskCheckIn = async (taskId: string) => {
    if (!employeeId.trim()) {
      showToast.error('Employee ID is required')
      return
    }

    setIsLoading(true)
    try {
      const result = await taskCheckIn({
        employeeId: employeeId.trim(),
        taskId: taskId
      })

      if (result.success) {
        showToast.success(result.message)
        setRefreshKey(prev => prev + 1) // Trigger refresh
      } else {
        showToast.error(result.message || 'Failed to check in to task')
      }
    } catch (error) {
      console.error('Task check-in error:', error)
      showToast.error('Failed to check in to task. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleTaskCheckOut = async () => {
    if (!employeeId.trim() || !taskStatus?.currentTask) {
      showToast.error('No active task to check out from')
      return
    }

    setIsLoading(true)
    try {
      const result = await taskCheckOut({
        employeeId: employeeId.trim(),
        taskId: taskStatus.currentTask.id
      })

      if (result.success) {
        showToast.success(result.message)
        setRefreshKey(prev => prev + 1) // Trigger refresh
      } else {
        showToast.error(result.message || 'Failed to check out from task')
      }
    } catch (error) {
      console.error('Task check-out error:', error)
      showToast.error('Failed to check out from task. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Not set'
    return new Date(timeString).toLocaleTimeString()
  }

  return (
    <div className="space-y-6">
      {/* Current Task Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Task Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {taskStatus?.hasActiveTask && taskStatus.currentTask ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{taskStatus.currentTask.title}</h3>
                  <p className="text-sm text-muted-foreground">{taskStatus.currentTask.description}</p>
                  {taskStatus.currentTask.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{taskStatus.currentTask.location}</span>
                    </div>
                  )}
                </div>
                <Badge variant="default">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  In Progress
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Started at:</span>
                  <p className="text-muted-foreground">{taskStatus.currentTask.checkIn ? new Date(taskStatus.currentTask.checkIn).toLocaleTimeString() : 'Not started'}</p>
                </div>
                <div>
                  <span className="font-medium">Category:</span>
                  <p className="text-muted-foreground">{taskStatus.currentTask.category || 'General'}</p>
                </div>
              </div>

              <Button 
                onClick={handleTaskCheckOut}
                disabled={isLoading}
                className="w-full"
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {isLoading ? 'Checking Out...' : 'Check Out from Task'}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active task</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check in to a task below to start working
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Available Tasks</CardTitle>
              {isRefreshing && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Updating...</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {availableTasks.length > 0 ? (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              {availableTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge variant="outline">
                      {task.status}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {task.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{task.location}</span>
                        </div>
                      )}
                      {task.checkIn && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Started: {new Date(task.checkIn).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleTaskCheckIn(task.id)}
                      disabled={isLoading || taskStatus?.hasActiveTask}
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Check In
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-xs text-muted-foreground mb-4">
                Last checked: {new Date().toLocaleTimeString()}
              </div>
              <Alert>
                <AlertDescription>
                  No tasks assigned. Please contact your supervisor for task assignments.
                </AlertDescription>
              </Alert>
              <div className="mt-4 text-xs text-muted-foreground">
                This page refreshes automatically every {availableTasks.length === 0 ? '10' : '30'} seconds
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}