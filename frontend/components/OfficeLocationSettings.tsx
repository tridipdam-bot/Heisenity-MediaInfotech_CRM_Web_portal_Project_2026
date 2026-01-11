"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { showToast } from "@/lib/toast-utils"
import { getOfficeLocation, setOfficeLocation } from "@/lib/server-api"
import { Settings, Loader2, Save, X, Navigation, MapPin } from "lucide-react"

interface OfficeLocationSettingsProps {
  onClose: () => void
}

export function OfficeLocationSettings({ onClose }: OfficeLocationSettingsProps) {
  const [coordinates, setCoordinates] = React.useState<{
    latitude: number
    longitude: number
    radius: number
  } | null>(null)
  const [currentAddress, setCurrentAddress] = React.useState<string>('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [gettingLocation, setGettingLocation] = React.useState(false)
  const [originalData, setOriginalData] = React.useState({
    coordinates: null as { latitude: number; longitude: number; radius: number } | null,
    address: ''
  })

  React.useEffect(() => {
    fetchCurrentLocation()
  }, [])

  const fetchCurrentLocation = async () => {
    try {
      setLoading(true)
      const response = await getOfficeLocation()
      
      if (response.success && response.data) {
        const coords = response.data.coordinates
        const address = response.data.location
        
        const data = {
          coordinates: coords || null,
          address: address || ''
        }
        
        setCoordinates(data.coordinates)
        setCurrentAddress(data.address)
        setOriginalData(data)
      } else {
        showToast.error(response.error || 'Failed to load office location')
      }
    } catch (error) {
      console.error('Error fetching office location:', error)
      showToast.error('Failed to load office location')
    } finally {
      setLoading(false)
    }
  }

  const getCurrentLocation = async () => {
    try {
      setGettingLocation(true)
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'))
          return
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        })
      })

      // Get address using existing backend geolocation service
      let address = `Office Location (${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)})`
      
      try {
        // Use the existing getHumanReadableLocation from backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/attendance/get-location-name`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.locationName) {
            address = data.locationName
          }
        }
      } catch (error) {
        console.log('Using coordinates as address')
      }

      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        radius: coordinates?.radius || 100
      })
      setCurrentAddress(address)
      showToast.success('Current location captured successfully')
    } catch (error) {
      console.error('Error getting current location:', error)
      showToast.error('Failed to get current location. Please enable location services.')
    } finally {
      setGettingLocation(false)
    }
  }

  const handleSave = async () => {
    if (!coordinates) {
      showToast.error('Office coordinates are required. Please use "Set Current Location" to capture coordinates.')
      return
    }

    const currentData = {
      coordinates,
      address: currentAddress
    }

    if (JSON.stringify(currentData) === JSON.stringify(originalData)) {
      showToast.info('No changes to save')
      return
    }

    try {
      setSaving(true)
      const response = await setOfficeLocation({
        location: currentAddress,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radius: coordinates.radius
      })
      
      if (response.success) {
        setOriginalData(currentData)
        showToast.success('Office location updated successfully')
        onClose()
      } else {
        showToast.error(response.error || 'Failed to update office location')
      }
    } catch (error) {
      console.error('Error saving office location:', error)
      showToast.error('Failed to update office location')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setCoordinates(originalData.coordinates)
    setCurrentAddress(originalData.address)
    onClose()
  }

  const hasChanges = JSON.stringify({
    coordinates,
    address: currentAddress
  }) !== JSON.stringify(originalData)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Office Location Settings
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {currentAddress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Current Office Location</p>
                  <p className="text-xs text-blue-700 mt-1">{currentAddress}</p>
                </div>
              </div>
            </div>
          )}

          {coordinates && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700">
                <strong>Coordinates:</strong> {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)} 
                (Radius: {coordinates.radius}m)
              </p>
            </div>
          )}

          {!coordinates && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                <strong>Setup Required:</strong> Click "Set Current Location" to capture office coordinates for attendance validation.
              </p>
            </div>
          )}

          <Button
            onClick={getCurrentLocation}
            disabled={gettingLocation || loading || saving}
            variant="outline"
            className="w-full border-gray-300 hover:bg-gray-50"
          >
            {gettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                {coordinates ? 'Update Current Location' : 'Set Current Location'}
              </>
            )}
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Loading current settings...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges || !coordinates}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <strong>How it works:</strong> Click "Set Current Location" while at the office. The system will automatically capture the address and coordinates. Office employees must be within {coordinates?.radius || 100}m to check in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}