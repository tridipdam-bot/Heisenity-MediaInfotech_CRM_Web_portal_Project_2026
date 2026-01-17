import { PrismaClient, TicketCategory, TicketPriority, TicketStatus, TicketHistoryAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';

interface CreateTicketInput {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  department?: string;
  assigneeId?: string;
  reporterId: string;
  dueDate?: Date;
  estimatedHours?: number;
  tags?: string[];
  customerName?: string;
  customerId?: string;
  customerPhone?: string;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    filePath: string;
  }>;
}

interface UpdateTicketInput {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  department?: string;
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  tags?: string[];
}

export class TicketService {
  public prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async generateTicketId(): Promise<string> {
    const lastTicket = await this.prisma.supportTicket.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { ticketId: true }
    });

    if (!lastTicket) {
      return 'TKT-001';
    }

    const lastNumber = parseInt(lastTicket.ticketId.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `TKT-${String(newNumber).padStart(3, '0')}`;
  }

  async createTicket(data: CreateTicketInput, changedBy: string) {
    const ticketId = await this.generateTicketId();

    // Find reporter by employeeId to get internal ID
    const reporter = await this.prisma.employee.findUnique({
      where: { employeeId: data.reporterId },
      select: { id: true }
    });

    if (!reporter) {
      throw new Error('Reporter employee not found');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        department: data.department,
        assigneeId: data.assigneeId,
        reporterId: reporter.id, // Use internal ID
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        // Customer information
        customerName: data.customerName,
        customerId: data.customerId,
        customerPhone: data.customerPhone,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        }
      }
    });

    // Create attachments if provided
    if (data.attachments && data.attachments.length > 0) {
      await this.prisma.ticketAttachment.createMany({
        data: data.attachments.map(attachment => ({
          ticketId: ticket.id,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          uploadedBy: reporter.id,
        }))
      });
    }

    // Create history entry - find changedBy employee
    const changedByEmployee = await this.prisma.employee.findUnique({
      where: { employeeId: changedBy },
      select: { id: true }
    });

    if (changedByEmployee) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: TicketHistoryAction.CREATED,
          changedBy: changedByEmployee.id,
        }
      });
    }

    return ticket;
  }

  async getTickets(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
    reporterId?: string;
    assigneeId?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.reporterId) {
      where.reporterId = filters.reporterId;
    }

    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { ticketId: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            filePath: true,
            uploadedAt: true,
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tickets;
  }

  async getTicketById(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                employeeId: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                employeeId: true,
              }
            }
          },
          orderBy: { uploadedAt: 'desc' }
        },
        history: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                employeeId: true,
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    return ticket;
  }

  async updateTicket(id: string, data: UpdateTicketInput, changedBy: string) {
    const existingTicket = await this.prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!existingTicket) {
      throw new Error('Ticket not found');
    }

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        status: data.status,
        department: data.department,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        resolvedAt: data.status === TicketStatus.RESOLVED ? new Date() : undefined,
        closedAt: data.status === TicketStatus.CLOSED ? new Date() : undefined,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
          }
        }
      }
    });

    // Create history entries for changes
    if (data.status && data.status !== existingTicket.status) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: id,
          action: TicketHistoryAction.STATUS_CHANGED,
          field: 'status',
          oldValue: existingTicket.status,
          newValue: data.status,
          changedBy,
        }
      });
    }

    if (data.priority && data.priority !== existingTicket.priority) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: id,
          action: TicketHistoryAction.PRIORITY_CHANGED,
          field: 'priority',
          oldValue: existingTicket.priority,
          newValue: data.priority,
          changedBy,
        }
      });
    }

    if (data.assigneeId && data.assigneeId !== existingTicket.assigneeId) {
      await this.prisma.ticketHistory.create({
        data: {
          ticketId: id,
          action: TicketHistoryAction.ASSIGNED,
          field: 'assigneeId',
          oldValue: existingTicket.assigneeId || '',
          newValue: data.assigneeId,
          changedBy,
        }
      });
    }

    return ticket;
  }

  async deleteTicket(id: string) {
    await this.prisma.supportTicket.delete({
      where: { id }
    });
  }

  async addComment(ticketId: string, authorId: string, content: string, isInternal: boolean = false) {
    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        authorId,
        content,
        isInternal,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            employeeId: true,
          }
        }
      }
    });

    // Create history entry
    await this.prisma.ticketHistory.create({
      data: {
        ticketId,
        action: TicketHistoryAction.COMMENTED,
        changedBy: authorId,
      }
    });

    return comment;
  }
}

export const ticketService = new TicketService();
