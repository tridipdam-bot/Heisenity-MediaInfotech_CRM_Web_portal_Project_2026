import { prisma } from '../lib/prisma'

export class SystemConfigService {
  static async getConfig(key: string): Promise<string | null> {
    try {
      const config = await prisma.systemConfiguration.findUnique({
        where: { key }
      })
      return config?.value || null
    } catch (error) {
      console.error('Error getting system config:', error)
      return null
    }
  }

  static async setConfig(key: string, value: string): Promise<boolean> {
    try {
      await prisma.systemConfiguration.upsert({
        where: { key },
        update: { value, updatedAt: new Date() },
        create: { key, value }
      })
      return true
    } catch (error) {
      console.error('Error setting system config:', error)
      return false
    }
  }

  static async getOfficeLocation(): Promise<string> {
    const location = await this.getConfig('office_location')
    return location || 'Main Office'
  }

  static async setOfficeLocation(location: string): Promise<boolean> {
    return await this.setConfig('office_location', location)
  }

  static async getOfficeCoordinates(): Promise<{ latitude: number; longitude: number; radius: number } | null> {
    try {
      const config = await prisma.systemConfiguration.findUnique({
        where: { key: 'office_location' }
      })
      
      if (config && config.latitude && config.longitude) {
        return {
          latitude: parseFloat(config.latitude.toString()),
          longitude: parseFloat(config.longitude.toString()),
          radius: config.radius || 100
        }
      }
      return null
    } catch (error) {
      console.error('Error getting office coordinates:', error)
      return null
    }
  }

  static async setOfficeCoordinates(
    location: string, 
    latitude: number, 
    longitude: number, 
    radius: number = 100
  ): Promise<boolean> {
    try {
      await prisma.systemConfiguration.upsert({
        where: { key: 'office_location' },
        update: { 
          value: location, 
          latitude, 
          longitude, 
          radius,
          updatedAt: new Date() 
        },
        create: { 
          key: 'office_location', 
          value: location, 
          latitude, 
          longitude, 
          radius 
        }
      })
      return true
    } catch (error) {
      console.error('Error setting office coordinates:', error)
      return false
    }
  }

  static async getAllConfigs(): Promise<Record<string, string>> {
    try {
      const configs = await prisma.systemConfiguration.findMany()
      return configs.reduce((acc, config) => {
        acc[config.key] = config.value
        return acc
      }, {} as Record<string, string>)
    } catch (error) {
      console.error('Error getting all configs:', error)
      return {}
    }
  }
}