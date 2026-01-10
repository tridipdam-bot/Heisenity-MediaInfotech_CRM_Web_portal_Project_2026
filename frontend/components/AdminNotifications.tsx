"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Bell, 
  BellRing, 
  Car, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  X,
  Trash2,
  MarkAsUnreadIcon
} from "lucide-react"
import { showToast } from "@/lib/toast-utils"

interface AdminNotification {
  id: string
  type: 'VEHICLE_UNASSIGNED' | 'TASK_COMPLETED' | 'ATTENDANCE_ALERT'
  title: string
  message: string
  data?: {
    vehicleId?: string
    vehicleNumber?: string
    employeeId?: string
    employeeName?: string
    checkoutTime?: string
    location?: string
  }
  isRead: boolean
  createdAt: string
  updatedAt: string
}

interface AdminNotificationsProps {
  onClose?: () => void
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'VEHICLE_UNASSIGNED':
      return <Car className="h-4 w-4" />
    case 'TASK_COMPLETED':
      return <CheckCircle className="h-4 w-4" />
    case 'ATTENDANCE_ALERT':
      return <Clock className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'VEHICLE_UNASSIGNED':
      return "bg-blue-50 text-blue-700 border-blue-200"
    case 'TASK_COMPLETED':
      return "bg-green-50 text-green-700 border-green-200"
    case 'ATTENDANCE_ALERT':
      return "bg-yellow-50 text-yellow-700 border-yellow-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

export function AdminNotifications({ onClose }: AdminNotificationsProps) {
  const [notifications, setNotifications] = React.useState<AdminNotification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedNotification, setSelectedNotification] = React.useState<AdminNotification | null>(null)

  // Fetch notifications
  React.useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications`)
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setNotifications(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      showToast.error('Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/read-all`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        )
        showToast.success('All notifications marked as read')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      showToast.error('Failed to mark all notifications as read')
    }
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setNotifications(prev => prev.filter(notification => notification.id !== notificationId))
        showToast.success('Notification deleted')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      showToast.error('Failed to delete notification')
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (loading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <BellRing className="h-5 w-5 text-blue-600" />
              ) : (
                <Bell className="h-5 w-5" />
              )}
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {notifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div 
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
                        !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedNotification(notification)
                        if (!notification.isRead) {
                          markAsRead(notification.id)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>{formatTime(notification.createdAt)}</span>
                              {notification.data?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {notification.data.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {index < notifications.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              {selectedNotification?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {selectedNotification.message}
              </p>
              
              {selectedNotification.data && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm">Details:</h4>
                  {selectedNotification.data.vehicleNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4" />
                      Vehicle: {selectedNotification.data.vehicleNumber}
                    </div>
                  )}
                  {selectedNotification.data.employeeName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      Employee: {selectedNotification.data.employeeName} ({selectedNotification.data.employeeId})
                    </div>
                  )}
                  {selectedNotification.data.checkoutTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      Checkout: {new Date(selectedNotification.data.checkoutTime).toLocaleString()}
                    </div>
                  )}
                  {selectedNotification.data.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      Location: {selectedNotification.data.location}
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                {formatTime(selectedNotification.createdAt)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}