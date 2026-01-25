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

      // Generate a ticket ID for the support request
      const ticketId = `SUP-${supportRequest.id.toString().padStart(6, '0')}`;

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
        ticketId: ticketId,
        data: supportRequest
      });
    } catch (error) {
      console.error('Error submitting support request:', error);
      res.status(500).json({ error: 'Failed to submit support request' });
    }
  }

  // Customer: Get own support requests
  static async getCustomerSupportRequests(req: Request, res: Response) {
    try {
      const customerId = (req as any).customer?.id;

      const requests = await prisma.customerSupportRequest.findMany({
        where: {
          customerId
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          message: true,
          documents: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Parse documents JSON for each request
      const requestsWithParsedDocs = requests.map(request => ({
        ...request,
        documents: request.documents ? JSON.parse(request.documents) : []
      }));

      res.json({
        success: true,
        data: requestsWithParsedDocs
      });
    } catch (error) {
      console.error('Error fetching customer support requests:', error);
      res.status(500).json({ error: 'Failed to fetch support requests' });
    }
  }

  // Employee: Get pending support requests
  static async getPendingSupportRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const employeeId = user?.id;
      const userType = user?.userType;

      // Allow admins and in-office employees to view support requests
      if (userType === 'ADMIN') {
        // Admin can view all support requests
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

        return res.json({
          success: true,
          data: requests
        });
      }

      // For employees, check if they are in-office
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { role: true }
      });

      if (!employee || employee.role !== 'IN_OFFICE') {
        return res.status(403).json({ 
          success: false,
          error: 'Only admins and in-office employees can view support requests' 
        });
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
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch support requests' 
      });
    }
  }

  // Employee: Accept support request
  static async acceptSupportRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const employeeId = user?.id;
      const userType = user?.userType;

      console.log('Accept request - User info:', { employeeId, userType, userId: user?.id });

      // Allow admins and in-office employees to accept support requests
      if (userType !== 'ADMIN') {
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          select: { role: true }
        });

        console.log('Employee lookup result:', employee);

        if (!employee || employee.role !== 'IN_OFFICE') {
          return res.status(403).json({ 
            success: false,
            error: 'Only admins and in-office employees can accept support requests' 
          });
        }
      }

      // Check if request is still pending
      const request = await prisma.customerSupportRequest.findUnique({
        where: { id },
        include: {
          customer: true
        }
      });

      console.log('Support request lookup:', { found: !!request, status: request?.status });

      if (!request) {
        return res.status(404).json({ 
          success: false,
          error: 'Support request not found' 
        });
      }

      if (request.status !== 'PENDING') {
        return res.status(400).json({ 
          success: false,
          error: 'Support request already accepted by another employee' 
        });
      }

      // Determine the acceptedBy ID based on user type
      let acceptedById = employeeId;

      if (userType === 'ADMIN') {
        console.log('Processing admin acceptance, looking up admin with ID:', employeeId);
        
        // For admins, create or find their employee record
        // The employeeId here is actually the admin's internal database ID
        const admin = await prisma.admin.findUnique({
          where: { id: employeeId }, // employeeId is actually the admin's internal ID
          select: { adminId: true, name: true, email: true }
        });

        console.log('Admin lookup result:', admin);

        if (admin) {
          const adminEmployeeId = `ADMIN_${admin.adminId}`;
          let adminEmployee = await prisma.employee.findUnique({
            where: { employeeId: adminEmployeeId },
            select: { id: true }
          });

          console.log('Admin employee lookup result:', adminEmployee);

          if (!adminEmployee) {
            console.log('Creating admin employee record...');
            adminEmployee = await prisma.employee.create({
              data: {
                name: `${admin.name} (Admin)`,
                employeeId: adminEmployeeId,
                email: admin.email,
                password: 'N/A',
                role: 'IN_OFFICE',
                status: 'ACTIVE'
              },
              select: { id: true }
            });
            console.log('Created admin employee:', adminEmployee);
          }

          acceptedById = adminEmployee.id;
        }
      }

      console.log('Final acceptedById:', acceptedById);

      // Accept the request
      const updatedRequest = await prisma.customerSupportRequest.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          acceptedBy: acceptedById
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

      console.log('Request updated successfully');

      res.json({
        success: true,
        message: 'Support request accepted',
        data: updatedRequest
      });
    } catch (error) {
      console.error('Error accepting support request:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to accept support request' 
      });
    }
  }

  // Employee: Get accepted support requests (for current employee)
  static async getMyAcceptedRequests(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const employeeId = user?.id;
      const userType = user?.userType;

      let whereClause: any = {
        status: 'ACCEPTED'
      };

      // If admin, show all accepted requests; if employee, show only their accepted requests
      if (userType !== 'ADMIN') {
        whereClause.acceptedBy = employeeId;
      }

      const requests = await prisma.customerSupportRequest.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              customerId: true,
              name: true,
              phone: true,
              email: true
            }
          },
          acceptedByEmployee: {
            select: {
              name: true,
              employeeId: true
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
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch accepted requests' 
      });
    }
  }

  // Employee: Create ticket from accepted support request
  static async createTicketFromRequest(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const employeeId = user?.id;
      const userType = user?.userType;
      const { title, category, priority, dueDate, estimatedHours } = req.body;

      console.log('Create ticket request:', { id, userType, employeeId, body: req.body });

      // Verify the request exists
      const request = await prisma.customerSupportRequest.findUnique({
        where: { id },
        include: {
          customer: true
        }
      });

      if (!request) {
        return res.status(404).json({ 
          success: false,
          error: 'Support request not found' 
        });
      }

      console.log('Found support request:', { id: request.id, status: request.status, acceptedBy: request.acceptedBy });

      // For admins, we need to handle the acceptedBy comparison differently
      let canCreateTicket = false;
      
      if (userType === 'ADMIN') {
        // Admins can create tickets from any accepted request
        canCreateTicket = true;
      } else {
        // Employees can only create tickets from requests they accepted
        canCreateTicket = request.acceptedBy === employeeId;
      }

      if (!canCreateTicket) {
        return res.status(403).json({ 
          success: false,
          error: 'You can only create tickets for requests you accepted' 
        });
      }

      if (request.status !== 'ACCEPTED') {
        return res.status(400).json({ 
          success: false,
          error: 'Request must be in ACCEPTED status' 
        });
      }

      // Find or create a default category
      let ticketCategory = await prisma.ticketCategory.findFirst({
        where: { name: 'Customer Support' }
      });

      if (!ticketCategory) {
        // Create a default category if it doesn't exist
        ticketCategory = await prisma.ticketCategory.create({
          data: {
            name: 'Customer Support',
            description: 'Tickets created from customer support requests',
            createdBy: employeeId
          }
        });
      }

      // Use provided category if valid, otherwise use default
      let finalCategoryId = ticketCategory.id;
      if (category) {
        const providedCategory = await prisma.ticketCategory.findUnique({
          where: { id: category }
        });
        if (providedCategory) {
          finalCategoryId = category;
        }
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

      // Determine reporter ID - use the person who accepted the request
      let reporterId = request.acceptedBy;

      // For admins creating tickets, we might need to handle this differently
      if (userType === 'ADMIN' && !reporterId) {
        // If no one accepted it yet (shouldn't happen), use the admin's employee record
        const admin = await prisma.admin.findUnique({
          where: { id: employeeId },
          select: { adminId: true, name: true, email: true }
        });

        if (admin) {
          const adminEmployeeId = `ADMIN_${admin.adminId}`;
          let adminEmployee = await prisma.employee.findUnique({
            where: { employeeId: adminEmployeeId },
            select: { id: true }
          });

          if (!adminEmployee) {
            adminEmployee = await prisma.employee.create({
              data: {
                name: `${admin.name} (Admin)`,
                employeeId: adminEmployeeId,
                email: admin.email,
                password: 'N/A',
                role: 'IN_OFFICE',
                status: 'ACTIVE'
              },
              select: { id: true }
            });
          }

          reporterId = adminEmployee.id;
        }
      }

      // Determine the assignee ID - use the person who accepted the request
      let assigneeId = request.acceptedBy;

      // For admins creating tickets, we need to use their employee record ID
      if (userType === 'ADMIN') {
        // The acceptedBy should already be the admin's employee record ID
        // But let's make sure we have the right ID
        const admin = await prisma.admin.findUnique({
          where: { id: employeeId }, // employeeId is actually the admin's internal ID
          select: { adminId: true, name: true, email: true }
        });

        if (admin) {
          const adminEmployeeId = `ADMIN_${admin.adminId}`;
          const adminEmployee = await prisma.employee.findUnique({
            where: { employeeId: adminEmployeeId },
            select: { id: true }
          });

          if (adminEmployee) {
            assigneeId = adminEmployee.id;
          }
        }
      }

      console.log('Creating ticket with:', { 
        ticketId, 
        categoryId: finalCategoryId, 
        reporterId, 
        assigneeId: assigneeId // Use the correct assigneeId
      });

      // Create ticket
      const ticket = await prisma.supportTicket.create({
        data: {
          ticketId,
          description: title ? `${title}: ${request.message}` : request.message,
          categoryId: finalCategoryId,
          priority: priority || 'MEDIUM',
          status: 'OPEN',
          assigneeId: assigneeId, // Use the correct assigneeId
          reporterId: reporterId,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
          // Add customer information
          customerName: request.customer.name,
          customerId: request.customer.customerId,
          customerPhone: request.customer.phone
        }
      });

      console.log('Ticket created successfully:', ticket.id);

      // Transfer documents from support request to ticket attachments
      if (request.documents) {
        try {
          const documents = JSON.parse(request.documents);
          if (Array.isArray(documents) && documents.length > 0) {
            const attachmentPromises = documents.map(doc => 
              prisma.ticketAttachment.create({
                data: {
                  ticketId: ticket.id,
                  fileName: doc.originalName || doc.filename,
                  filePath: doc.path,
                  fileSize: doc.size || 0,
                  mimeType: doc.mimetype || 'application/octet-stream',
                  uploadedBy: employeeId
                }
              })
            );
            
            await Promise.all(attachmentPromises);
            console.log(`Transferred ${documents.length} attachments to ticket ${ticketId}`);
          }
        } catch (parseError) {
          console.error('Error parsing support request documents:', parseError);
          // Continue without attachments rather than failing the entire operation
        }
      }

      // Update support request
      await prisma.customerSupportRequest.update({
        where: { id },
        data: {
          status: 'TICKET_CREATED',
          ticketId: ticket.id
        }
      });

      console.log('Support request updated to TICKET_CREATED status');

      res.json({
        success: true,
        message: 'Ticket created successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create ticket' 
      });
    }
  }
}
