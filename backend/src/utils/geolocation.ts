// lib/geolocation.ts
import { LocationData, GeolocationCoordinates } from '@/modules/staffs/attendance/attendance.types'

// Helper: Haversine distance (meters)
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // meters
  const toRadians = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export type ForwardGeocodeResult = {
  latitude: number
  longitude: number
  displayName?: string
  osmType?: string
  osmClass?: string
  type?: string
  boundingbox?: [string, string, string, string] // lat_min, lat_max, lon_min, lon_max
  granularity: 'exact' | 'street' | 'neighbourhood' | 'city' | 'region' | 'country' | 'unknown'
  estimatedRadiusMeters?: number // derived from boundingbox if available
  raw?: any
}

// Reverse geocode to friendly address
export async function getLocationFromCoordinates(
  coordinates: GeolocationCoordinates
): Promise<LocationData | null> {
  try {
    const { latitude, longitude } = coordinates
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
        String(latitude)
      )}&lon=${encodeURIComponent(String(longitude))}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AttendanceApp/1.0 (+https://your-org.example)'
        },
        // Nominatim rate-limits aggressively — ensure you cache results in production
      }
    )

    if (!res.ok) {
      console.error({ event: 'geocode_reverse_error', status: res.status, statusText: res.statusText })
      throw new Error('LOCATION_SERVICE_ERROR')
    }

    const data = await res.json()
    if (!data || !data.address) return null
    const address = data.address

    return {
      address: data.display_name || '',
      city: address.city || address.town || address.village || address.municipality || '',
      state: address.state || address.region || address.province || ''
    }
  } catch (err) {
    console.error({ event: 'geolocation_reverse_failure', error: err instanceof Error ? err.message : err })
    return null
  }
}

export async function getHumanReadableLocation(coordinates: GeolocationCoordinates): Promise<string> {
  try {
    const location = await getLocationFromCoordinates(coordinates)
    if (!location) return `Coordinates: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
    const parts = [location.address, location.city, location.state].filter(Boolean)
    return parts.join(', ')
  } catch (err) {
    console.error({ event: 'human_readable_failure', error: err instanceof Error ? err.message : err })
    return `Coordinates: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
  }
}

// Forward geocoding with granularity detection.
// Returns coordinates + granularity + estimated bounding radius (meters) when possible.
export async function getCoordinatesFromLocation(locationText: string): Promise<ForwardGeocodeResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AttendanceApp/1.0 (+https://your-org.example)'
        }
      }
    )

    if (!res.ok) {
      console.error({ event: 'geocode_forward_error', status: res.status, statusText: res.statusText })
      throw new Error('LOCATION_SERVICE_ERROR')
    }

    const arr = await res.json()
    if (!arr || arr.length === 0) return null
    const result = arr[0]

    // Determine granularity by result.type and class
    const t: string | undefined = result.type
    const c: string | undefined = result.class

    let granularity: ForwardGeocodeResult['granularity'] = 'unknown'
    const exactTypes = new Set(['house', 'building', 'residential', 'yes', 'commercial', 'apartments'])
    const streetTypes = new Set(['street', 'road', 'pedestrian'])
    const neighbourhoodTypes = new Set(['neighbourhood', 'suburb', 'quarter'])
    const cityTypes = new Set(['city', 'town', 'village', 'municipality'])
    const regionTypes = new Set(['state', 'region', 'province', 'county'])
    const countryTypes = new Set(['country'])

    if (t && exactTypes.has(t)) granularity = 'exact'
    else if (t && streetTypes.has(t)) granularity = 'street'
    else if (t && neighbourhoodTypes.has(t)) granularity = 'neighbourhood'
    else if (t && cityTypes.has(t)) granularity = 'city'
    else if (t && regionTypes.has(t)) granularity = 'region'
    else if (t && countryTypes.has(t)) granularity = 'country'
    else if (c && c === 'place' && t === 'house') granularity = 'exact'

    // Estimate bounding radius using boundingbox if available
    let estimatedRadiusMeters: number | undefined
    if (result.boundingbox && result.boundingbox.length === 4) {
      // boundingbox is [lat_min, lat_max, lon_min, lon_max] sometimes returned as strings
      const [latMinStr, latMaxStr, lonMinStr, lonMaxStr] = result.boundingbox
      const latMin = parseFloat(latMinStr)
      const latMax = parseFloat(latMaxStr)
      const lonMin = parseFloat(lonMinStr)
      const lonMax = parseFloat(lonMaxStr)
      // use half-diagonal as an approximate radius
      estimatedRadiusMeters = Math.round(
        calculateDistanceMeters(latMin, lonMin, latMax, lonMax) / 2
      )
    }

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      osmType: result.osm_type,
      osmClass: result.class,
      type: result.type,
      boundingbox: result.boundingbox as any,
      granularity,
      estimatedRadiusMeters,
      raw: result
    }
  } catch (err) {
    console.error({ event: 'geocode_forward_failure', error: err instanceof Error ? err.message : err })
    return null
  }
}

// convenience format
export function formatCoordinates(coordinates: GeolocationCoordinates): string {
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
}
