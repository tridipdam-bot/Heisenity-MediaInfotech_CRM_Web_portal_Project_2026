"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { showToast } from "@/lib/toast-utils"
import { playNotificationSound } from "@/lib/notification-sound"
import { Camera, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useEffect, useRef, useState, useCallback } from "react"
import { dailyClockIn, dailyClockOut, getDailyAttendanceStatus } from "@/lib/server-api"

/**
 * =============================================================================
 * DAILY CLOCK-IN/CLOCK-OUT COMPONENT
 * =============================================================================
 * This component handles ONLY daily clock-in/clock-out operations for field engineers.
 * It is completely separate from task-level check-in/checkout functionality.
 * 
 * Purpose: Track daily work hours and attendance approval for field engineers
 * Scope: Daily attendance management only
 * =============================================================================
 */

interface DailyClockInOutProps {
  employeeId: string
  employeeRole: 'FIELD_ENGINEER' | 'IN_OFFICE' | null
  onAttendanceStatusChange?: (status: DailyAttendanceStatus) => void
}

interface DailyAttendanceStatus {
  hasAttendance: boolean
  clockIn: string | null
  clockOut: string | null
  approvalStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  needsApproval: boolean
  isPendingApproval: boolean
  canClockOut: boolean
  workHours: string | null
}

export function DailyClockInOut({ employeeId, employeeRole, onAttendanceStatusChange }: DailyClockInOutProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [attendanceStatus, setAttendanceStatus] = useState<DailyAttendanceStatus | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch daily attendance status
  const fetchAttendanceStatus = useCallback(async () => {
    if (!employeeId.trim()) return

    try {
      const result = await getDailyAttendanceStatus(employeeId)

      if (result.success) {
        setAttendanceStatus(result.data!)
        onAttendanceStatusChange?.(result.data!)
      } else {
        console.error('Failed to fetch attendance status:', result.message)
      }
    } catch (error) {
      console.error('Error fetching attendance status:', error)
    }
  }, [employeeId, onAttendanceStatusChange])

  // Initial load and periodic refresh
  useEffect(() => {
    if (employeeId.trim()) {
      fetchAttendanceStatus()
    }
  }, [employeeId, fetchAttendanceStatus])

  // Refresh every 10 seconds for pending approvals
  useEffect(() => {
    const interval = setInterval(() => {
      if (employeeId.trim() && attendanceStatus?.isPendingApproval) {
        fetchAttendanceStatus()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [employeeId, attendanceStatus?.isPendingApproval, fetchAttendanceStatus])

  // Show for both field engineers and office employees
  if (!employeeRole || (employeeRole !== 'FIELD_ENGINEER' && employeeRole !== 'IN_OFFICE')) {
    return null
  }

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      setCameraLoading(true)
      setCameraActive(false)

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve(true)
          }
        })
      }

      setCameraActive(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      setCameraActive(false)

      let errorMessage = 'Failed to access camera. '
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow camera permissions and try again.'
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.'
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Camera is not supported in this browser.'
        } else {
          errorMessage += error.message
        }
      }

      showToast.error(errorMessage)
    } finally {
      setCameraLoading(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const capturePhoto = (): string | null => {
    if (!videoRef.current || !cameraActive) return null

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return null

    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    context.drawImage(videoRef.current, 0, 0)

    return canvas.toDataURL('image/jpeg', 0.8)
  }

  const handleClockIn = async () => {
    if (!employeeId.trim()) {
      showToast.error('Please enter your Employee ID')
      return
    }

    if (!cameraActive) {
      showToast.error('Please start the camera first')
      return
    }

    setIsLoading(true)
    try {
      const photo = capturePhoto()
      
      const result = await dailyClockIn({
        employeeId: employeeId.trim(),
        photo: photo || undefined,
        locationText: 'Field Location'
      })

      if (result.success) {
        showToast.success(result.message)
        // Play notification sound for successful clock-in
        playNotificationSound()
        fetchAttendanceStatus() // Refresh status
        stopCamera() // Stop camera after successful clock-in
      } else {
        showToast.error(result.message || 'Failed to clock in')
      }
    } catch (error) {
      console.error('Clock-in error:', error)
      showToast.error('Failed to clock in. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!employeeId.trim()) {
      showToast.error('Please enter your Employee ID')
      return
    }

    setIsLoading(true)
    try {
      const result = await dailyClockOut({
        employeeId: employeeId.trim()
      })

      if (result.success) {
        showToast.success(result.message)
        // Play notification sound for successful clock-out
        playNotificationSound()
        fetchAttendanceStatus() // Refresh status
      } else {
        showToast.error(result.message || 'Failed to clock out')
      }
    } catch (error) {
      console.error('Clock-out error:', error)
      showToast.error('Failed to clock out. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Not set'
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusBadge = () => {
    if (!attendanceStatus) return null

    if (attendanceStatus.isPendingApproval) {
      return (
        <Badge variant="secondary">
          <AlertTriangle className="h-4 w-4 mr-1" />
          Pending Approval
        </Badge>
      )
    }

    if (attendanceStatus.clockIn && !attendanceStatus.clockOut) {
      return (
        <Badge variant="default">
          <CheckCircle className="h-4 w-4 mr-1" />
          Clocked In
        </Badge>
      )
    }

    if (attendanceStatus.clockIn && attendanceStatus.clockOut) {
      return (
        <Badge variant="outline">
          <XCircle className="h-4 w-4 mr-1" />
          Clocked Out
        </Badge>
      )
    }

    return (
      <Badge variant="secondary">
        Not Clocked In
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Time */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-3xl font-bold">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daily Attendance
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceStatus?.isPendingApproval ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your clock-in is pending admin approval. Please wait for confirmation before starting tasks.
              </AlertDescription>
            </Alert>
          ) : attendanceStatus?.clockIn ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Clocked In:</span>
                  <p className="text-muted-foreground">{formatTime(attendanceStatus.clockIn)}</p>
                </div>
                <div>
                  <span className="font-medium">Clocked Out:</span>
                  <p className="text-muted-foreground">{formatTime(attendanceStatus.clockOut)}</p>
                </div>
              </div>
              
              {attendanceStatus.workHours && (
                <div className="text-sm">
                  <span className="font-medium">Total Hours:</span>
                  <p className="text-muted-foreground">{attendanceStatus.workHours}</p>
                </div>
              )}

              {attendanceStatus.canClockOut && (
                <Button 
                  onClick={handleClockOut}
                  disabled={isLoading}
                  className="w-full"
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {isLoading ? 'Clocking Out...' : 'Clock Out for Day'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Camera Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Camera for Clock-in</span>
                  <Button
                    onClick={cameraActive ? stopCamera : startCamera}
                    disabled={cameraLoading}
                    variant="outline"
                    size="sm"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {cameraLoading ? 'Loading...' : cameraActive ? 'Stop Camera' : 'Start Camera'}
                  </Button>
                </div>

                {cameraActive && (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-w-md mx-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <Button 
                onClick={handleClockIn}
                disabled={isLoading || !cameraActive}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isLoading ? 'Clocking In...' : 'Clock In for Day'}
              </Button>

              {!cameraActive && (
                <p className="text-sm text-muted-foreground text-center">
                  Please start the camera before clocking in
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}