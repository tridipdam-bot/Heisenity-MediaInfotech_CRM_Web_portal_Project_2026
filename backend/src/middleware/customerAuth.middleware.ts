import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/lib/prisma';

export async function authenticateCustomer(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const sessionToken = authHeader.replace('Bearer ', '');

    // Find active session
    const session = await prisma.customerSession.findFirst({
      where: {
        sessionToken,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        customer: true
      }
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if customer is active
    if (session.customer.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Update last activity
    await prisma.customerSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    // Attach customer to request
    (req as any).customer = session.customer;
    (req as any).session = session;

    next();
  } catch (error) {
    console.error('Customer authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
