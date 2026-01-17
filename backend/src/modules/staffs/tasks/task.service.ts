import { prisma } from "@/lib/prisma";
import { getTodayDate } from "@/utils/date";

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CreateTaskData {
  employeeId: string;
  title: string;
  description: string;
  category?: string;
  location?: string;
  assignedBy: string;
}

export interface TaskRecord {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  category?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  assignedBy: string;
  assignedAt: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * =============================================================================
 * CRITICAL BUSINESS RULES - DO NOT VIOLATE
 * =============================================================================
 * 1. Admin assigns task → Create task + Upsert attendance
 * 2. Task assignment MUST NOT modify clockIn, approvalStatus, or clockOut
 * 3. Task assignment only attaches taskId to attendance
 * 4. Attendance approval is INDEPENDENT from task assignment
 * 5. Tasks are INDEPENDENT from day-level attendance
 * =============================================================================
 */

/**
 * ADMIN: Assign task to employee
 * - Creates task record only
 * - Does NOT create or modify attendance records
 * - Attendance is managed separately through daily clock-in/clock-out
 */
export async function createTask(data: CreateTaskData): Promise<TaskRecord> {
  try {
    console.log('=== CREATE TASK CALLED ===');
    console.log('Task data:', JSON.stringify(data, null, 2));

    // Find employee by employeeId
    const employee = await prisma.employee.findUnique({
      where: { employeeId: data.employeeId }
    });

    if (!employee) {
      console.error(`Employee not found: ${data.employeeId}`);
      throw new Error(`Employee with employee ID ${data.employeeId} not found`);
    }

    console.log(`Found employee: ${employee.name} (DB ID: ${employee.id}, Role: ${employee.role})`);

    const now = new Date();

    // Create task only - no attendance manipulation
    const createdTask = await prisma.task.create({
      data: {
        employeeId: employee.id,
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        assignedBy: data.assignedBy,
        status: 'PENDING'
      }
    });

    console.log(`Task created with ID: ${createdTask.id}`);

    // Return created task
    return {
      id: createdTask.id,
      employeeId: data.employeeId,
      title: createdTask.title,
      description: createdTask.description,
      category: createdTask.category || undefined,
      location: createdTask.location || data.location || undefined,
      startTime: createdTask.checkIn?.toISOString() || undefined,
      endTime: createdTask.checkOut?.toISOString() || undefined,
      assignedBy: createdTask.assignedBy,
      assignedAt: createdTask.assignedAt ? createdTask.assignedAt.toISOString() : new Date().toISOString(),
      status: createdTask.status as TaskStatus,
      createdAt: createdTask.createdAt.toISOString(),
      updatedAt: createdTask.updatedAt.toISOString()
    };
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

/**
 * Get tasks for an employee
 */
export async function getEmployeeTasks(employeeId: string, status?: TaskStatus): Promise<TaskRecord[]> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      throw new Error(`Employee with employee ID ${employeeId} not found`);
    }

    const whereClause: any = {
      employeeId: employee.id
    };

    if (status) {
      whereClause.status = status;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: {
        assignedAt: 'desc'
      }
    });

    return tasks.map(task => ({
      id: task.id,
      employeeId: employeeId,
      title: task.title,
      description: task.description,
      category: task.category || undefined,
      location: task.location || undefined,
      startTime: task.checkIn?.toISOString() || undefined,
      endTime: task.checkOut?.toISOString() || undefined,
      assignedBy: task.assignedBy,
      assignedAt: task.assignedAt.toISOString(),
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }));
  } catch (error) {
    console.error('Error getting employee tasks:', error);
    throw error;
  }
}

/**
 * Update task status
 * - Updates task status only
 * - Sets checkOut when status is COMPLETED
 * - Does NOT modify attendance clockIn or clockOut
 */
export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<TaskRecord> {
  try {
    const updateData: any = {
      status: status,
      updatedAt: new Date()
    };

    // Set checkOut when task is completed
    if (status === 'COMPLETED') {
      updateData.checkOut = new Date();
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        employee: true
      }
    });

    return {
      id: task.id,
      employeeId: task.employee.employeeId,
      title: task.title,
      description: task.description,
      category: task.category || undefined,
      location: task.location || undefined,
      startTime: task.checkIn?.toISOString() || undefined,
      endTime: task.checkOut?.toISOString() || undefined,
      assignedBy: task.assignedBy,
      assignedAt: task.assignedAt.toISOString(),
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

/**
 * Get all tasks with pagination
 */
export async function getAllTasks(page: number = 1, limit: number = 50, status?: TaskStatus) {
  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          assignedAt: 'desc'
        },
        include: {
          employee: {
            select: {
              employeeId: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.task.count({ where: whereClause })
    ]);

    return {
      tasks: tasks.map(task => ({
        id: task.id,
        employeeId: task.employee.employeeId,
        employeeName: task.employee.name,
        employeeEmail: task.employee.email,
        title: task.title,
        description: task.description,
        category: task.category,
        location: task.location,
        startTime: task.checkIn?.toISOString() || undefined,
        endTime: task.checkOut?.toISOString() || undefined,
        assignedBy: task.assignedBy,
        assignedAt: task.assignedAt.toISOString(),
        status: task.status,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting all tasks:', error);
    throw error;
  }
}

/**
 * Reset attendance attempts (admin function)
 */
export async function resetAttendanceAttempts(employeeId: string): Promise<void> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { employeeId }
    });

    if (!employee) {
      throw new Error(`Employee with employee ID ${employeeId} not found`);
    }

    const today = getTodayDate();

    await prisma.attendance.updateMany({
      where: {
        employeeId: employee.id,
        date: today
      },
      data: {
        attemptCount: 'ZERO',
        locked: false,
        lockedReason: null,
        updatedAt: new Date()
      }
    });

    console.log(`Reset attendance attempts for employee ${employeeId}`);
  } catch (error) {
    console.error('Error resetting attendance attempts:', error);
    throw error;
  }
}
