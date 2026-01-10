"use client"

import * as React from "react"
import { VehicleUnassignedPopup } from "@/components/VehicleUnassignedPopup"

interface VehicleUnassignedData {
  vehicleId: string
  vehicleNumber: string
  employeeId: string
  employeeName: string
  checkoutTime: string
  location: string
}

interface NotificationContextType {
  showVehicleUnassignedNotification: (data: VehicleUnassignedData) => void
}

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [vehicleUnassignedData, setVehicleUnassignedData] = React.useState<VehicleUnassignedData | null>(null)
  const [showVehiclePopup, setShowVehiclePopup] = React.useState(false)

  const showVehicleUnassignedNotification = React.useCallback((data: VehicleUnassignedData) => {
    setVehicleUnassignedData(data)
    setShowVehiclePopup(true)
  }, [])

  const closeVehiclePopup = React.useCallback(() => {
    setShowVehiclePopup(false)
    setVehicleUnassignedData(null)
  }, [])

  // Poll for new notifications every 10 seconds (only for admin users)
  React.useEffect(() => {
    let interval: NodeJS.Timeout

    const pollNotifications = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications?isRead=false&limit=1`)
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data && result.data.length > 0) {
            const latestNotification = result.data[0]
            
            // Check if it's a vehicle unassigned notification that we haven't shown yet
            if (latestNotification.type === 'VEHICLE_UNASSIGNED' && 
                latestNotification.data &&
                (!vehicleUnassignedData || vehicleUnassignedData.vehicleId !== latestNotification.data.vehicleId)) {
              
              showVehicleUnassignedNotification(latestNotification.data)
              
              // Mark as read
              await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/notifications/${latestNotification.id}/read`, {
                method: 'PUT'
              })
            }
          }
        }
      } catch (error) {
        console.error('Error polling notifications:', error)
      }
    }

    // Start polling after component mounts
    const startPolling = () => {
      interval = setInterval(pollNotifications, 10000) // Poll every 10 seconds
    }

    // Check if user is admin before starting polling
    const checkUserAndStartPolling = async () => {
      try {
        // This would typically check the user session
        // For now, we'll assume admin users are on the dashboard
        if (window.location.pathname.includes('/dashboard')) {
          startPolling()
        }
      } catch (error) {
        console.error('Error checking user type:', error)
      }
    }

    checkUserAndStartPolling()

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [vehicleUnassignedData, showVehicleUnassignedNotification])

  const value = React.useMemo(() => ({
    showVehicleUnassignedNotification
  }), [showVehicleUnassignedNotification])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <VehicleUnassignedPopup
        isOpen={showVehiclePopup}
        onClose={closeVehiclePopup}
        data={vehicleUnassignedData}
      />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = React.useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}