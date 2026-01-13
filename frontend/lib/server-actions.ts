// lib/server-actions.ts
// Server-side functions that use next/headers
import { headers } from 'next/headers'

export type DeviceInfo = {
  os: string
  browser: string
  device: string
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
    try {
        // Generate device info on client side
        const userAgent = navigator.userAgent
        
        // Simple browser detection
        let browser = 'Unknown'
        if (userAgent.includes('Chrome')) browser = 'Chrome'
        else if (userAgent.includes('Firefox')) browser = 'Firefox'
        else if (userAgent.includes('Safari')) browser = 'Safari'
        else if (userAgent.includes('Edge')) browser = 'Edge'
        
        // Simple OS detection
        let os = 'Unknown'
        if (userAgent.includes('Windows')) os = 'Windows'
        else if (userAgent.includes('Mac')) os = 'macOS'
        else if (userAgent.includes('Linux')) os = 'Linux'
        else if (userAgent.includes('Android')) os = 'Android'
        else if (userAgent.includes('iOS')) os = 'iOS'
        
        // Simple device detection
        let device = 'Desktop'
        if (userAgent.includes('Mobile')) device = 'Mobile'
        else if (userAgent.includes('Tablet')) device = 'Tablet'
        
        return {
            browser,
            os,
            device
        }
    } catch (error) {
        console.error('getDeviceInfo error:', error)
        // Return fallback device info
        return {
            browser: 'Unknown',
            os: 'Unknown',
            device: 'Unknown'
        }
    }
}