import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

export class CustomerSupportController {
  // Customer: Submit support request
  static async submitSupportRequest(req: Request, res: Response) {
    try {
      const customerId = (req as any).customer?.id;
      const { message, documents } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Create support request
      const supportRequest = await prisma.customerSupportRequest.create({
        data: {
          customerId,
          message,
          documents: documents ? JSON.stringify(documents) : null,
          status: 'PENDING'
        },
        include: {
          customer: {
            select: {
              customerId: true,
              name: true,
              phone: true,
              email: true
            }
          }
        }
      });

      // Create notification for all IN_OFFICE employees
      const inOfficeEmployees = await prisma.employee.findMany({
        where: {
          role: 'IN_OFFICE',
          status: 'ACTIVE'
        },
        select: { id: true }
      });

      // You can implement a notification system here
      // For now, we'll just return success

      res.status(201).json({
        success: true,
        message: 'Support request submitted successfully',
        data: supportRequest
      });
    } catch (error) {
      console.error('Error submitting support request:', error);
      res.status(500).json({ error: 'Failed to submit support request' });
    }
  }

  // Employee: Get pending support requests
  static async getPendingSupportRequests(req: Request, res: Response) {
    try {
      const employeeId = (req as any).user?.id;
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true }
      });

      if (employee?.role !== 'IN_OFFICE') {
        return res.status(403).json({ error: 'Only in-office employees can view support requests' });
      }

      const requests = await prisma.customerSupportRequest.findMany({
        where: {
          status: 'PENDING'
        },
        include: {
          customer: {
            select: {
              customerId: true,
              name: true,
              phone: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Error fetching support requests:', error);
      res.status(500).json({ error: 'Failed to fetch support requests' });
    }
  }

  // Employee: Accept support request
  static async acceptSupportRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const employeeId = (req as any).user?.id;

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true }
      });

      if (employee?.role !== 'IN_OFFICE') {
        return res.status(403).json({ error: 'Only in-office employees can accept support requests' });
      }

      // Check if request is still pending
      const request = await prisma.customerSupportRequest.findUnique({
        where: { id },
        include: {
          customer: true
        }
      });

      if (!request) {
        return res.status(404).json({ error: 'Support request not found' });
      }

      if (request.status !== 'PENDING') {
        return res.status(400).json({ error: 'Support request already accepted by another employee' });
      }

      // Accept the request
      const updatedRequest = await prisma.customerSupportRequest.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          acceptedBy: employeeId
        },
        include: {
          customer: {
            select: {
              customerId: true,
              name: true,
              phone: true,
              email: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Support request accepted',
        data: updatedRequest
      });
    } catch (error) {
      console.error('Error accepting support request:', error);
      res.status(500).json({ error: 'Failed to accept support request' });
    }
  }

  // Employee: Get accepted support requests (for current employee)
  static async getMyAcceptedRequests(req: Request, res: Response) {
    try {
      const employeeId = (req as any).user?.id;

      const requests = await prisma.customerSupportRequest.findMany({
        where: {
          acceptedBy: employeeId,
          status: 'ACCEPTED'
        },
        include: {
          customer: {
            select: {
              customerId: true,
              name: true,
              phone: true,
              email: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Error fetching accepted requests:', error);
      res.status(500).json({ error: 'Failed to fetch accepted requests' });
    }
  }

  // Employee: Create ticket from accepted support request
  static async createTicketFromRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const employeeId = (req as any).user?.id;
      const { title, category, priority, department, dueDate, estimatedHours } = req.body;

      // Verify the request is accepted by this employee
      const request = await prisma.customerSupportRequest.findUnique({
        where: { id },
        include: {
          customer: true
        }
      });

      if (!request) {
        return res.status(404).json({ error: 'Support request not found' });
      }

      if (request.acceptedBy !== employeeId) {
        return res.status(403).json({ error: 'You can only create tickets for requests you accepted' });
      }

      if (request.status !== 'ACCEPTED') {
        return res.status(400).json({ error: 'Request must be in ACCEPTED status' });
      }

      // Generate ticket ID
      const lastTicket = await prisma.supportTicket.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { ticketId: true }
      });

      let ticketNumber = 1;
      if (lastTicket) {
        const match = lastTicket.ticketId.match(/TKT-(\d+)/);
        if (match) {
          ticketNumber = parseInt(match[1], 10) + 1;
        }
      }
      const ticketId = `TKT-${ticketNumber.toString().padStart(3, '0')}`;

      // Create ticket
      const ticket = await prisma.supportTicket.create({
        data: {
          ticketId,
          title: title || `Support Request from ${request.customer.name}`,
          description: request.message,
          category: category || 'OTHER',
          priority: priority || 'MEDIUM',
          status: 'OPEN',
          department: department || 'Customer Support',
          assigneeId: employeeId,
          reporterId: employeeId,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
          // Add customer information
          customerName: request.customer.name,
          customerId: request.customer.customerId,
          customerPhone: request.customer.phone
        }
      });

      // Update support request
      await prisma.customerSupportRequest.update({
        where: { id },
        data: {
          status: 'TICKET_CREATED',
          ticketId: ticket.id
        }
      });

      res.json({
        success: true,
        message: 'Ticket created successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  }
}
