"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Car, User, Clock, MapPin, CheckCircle } from "lucide-react"

interface VehicleUnassignedData {
  vehicleId: string
  vehicleNumber: string
  employeeId: string
  employeeName: string
  checkoutTime: string
  location: string
}

interface VehicleUnassignedPopupProps {
  isOpen: boolean
  onClose: () => void
  data: VehicleUnassignedData | null
}

export function VehicleUnassignedPopup({ isOpen, onClose, data }: VehicleUnassignedPopupProps) {
  if (!data) return null

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Car className="h-5 w-5" />
            Vehicle Auto-Unassigned
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
            <CheckCircle className="h-12 w-12 text-blue-600" />
          </div>
          
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              A vehicle has been automatically unassigned after employee checkout.
            </p>
          </div>
          
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Car className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-sm text-gray-500">Vehicle:</span>
                <p className="font-medium">{data.vehicleNumber}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-sm text-gray-500">Employee:</span>
                <p className="font-medium">{data.employeeName} ({data.employeeId})</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-sm text-gray-500">Checkout Time:</span>
                <p className="font-medium">{formatTime(data.checkoutTime)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-gray-500" />
              <div>
                <span className="text-sm text-gray-500">Location:</span>
                <p className="font-medium">{data.location}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <Badge className="bg-green-50 text-green-700 border-green-200">
              Vehicle is now available for assignment
            </Badge>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}