import { prisma } from '../lib/prisma'
import { randomBytes } from 'crypto'

export class SessionService {
  // Create a new session
  async createSession(userId: string, userType: 'ADMIN' | 'EMPLOYEE', deviceInfo?: string, ipAddress?: string) {
    const sessionToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const sessionData: any = {
      sessionToken,
      userType,
      deviceInfo,
      ipAddress,
      expiresAt
    }

    // Set the appropriate foreign key based on user type
    if (userType === 'ADMIN') {
      sessionData.adminId = userId
    } else {
      sessionData.employeeId = userId
    }

    const session = await prisma.userSession.create({
      data: sessionData
    })

    return session
  }

  // Get active sessions for a user
  async getActiveSessions(userId: string, userType: 'ADMIN' | 'EMPLOYEE') {
    const whereClause: any = {
      isActive: true,
      expiresAt: {
        gt: new Date()
      }
    }

    if (userType === 'ADMIN') {
      whereClause.adminId = userId
    } else {
      whereClause.employeeId = userId
    }

    return await prisma.userSession.findMany({
      where: whereClause,
      orderBy: {
        lastActivity: 'desc'
      }
    })
  }

  // Update session activity
  async updateSessionActivity(sessionToken: string) {
    return await prisma.userSession.update({
      where: { sessionToken },
      data: { lastActivity: new Date() }
    })
  }

  // Validate session
  async validateSession(sessionToken: string) {
    const session = await prisma.userSession.findUnique({
      where: { sessionToken },
      include: {
        admin: true,
        employee: true
      }
    })

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return null
    }

    // Update last activity
    await this.updateSessionActivity(sessionToken)

    return session
  }

  // Invalidate a specific session
  async invalidateSession(sessionToken: string) {
    return await prisma.userSession.update({
      where: { sessionToken },
      data: { isActive: false }
    })
  }

  // Invalidate all sessions for a user (logout from all devices)
  async invalidateAllUserSessions(userId: string, userType: 'ADMIN' | 'EMPLOYEE') {
    const whereClause: any = {}

    if (userType === 'ADMIN') {
      whereClause.adminId = userId
    } else {
      whereClause.employeeId = userId
    }

    return await prisma.userSession.updateMany({
      where: whereClause,
      data: { isActive: false }
    })
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    return await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false }
        ]
      }
    })
  }

  // Get session count for user
  async getActiveSessionCount(userId: string, userType: 'ADMIN' | 'EMPLOYEE') {
    const whereClause: any = {
      isActive: true,
      expiresAt: { gt: new Date() }
    }

    if (userType === 'ADMIN') {
      whereClause.adminId = userId
    } else {
      whereClause.employeeId = userId
    }

    return await prisma.userSession.count({
      where: whereClause
    })
  }
}

export const sessionService = new SessionService()