import { Request, Response } from 'express';
import { taskCheckIn, taskCheckOut, getCurrentTaskStatus } from './task-attendance.service';

/**
 * =============================================================================
 * TASK ATTENDANCE CONTROLLER
 * =============================================================================
 * Handles API endpoints for task-level check-in/checkout operations only.
 * Completely separate from daily clock-in/clock-out functionality.
 * =============================================================================
 */

/**
 * POST /tasks/check-in
 * Employee checks in to start working on a specific task
 */
export const taskCheckInController = async (req: Request, res: Response) => {
  try {
    const { employeeId, taskId, photo, location } = req.body;

    if (!employeeId || !taskId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID and Task ID are required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || '';

    const result = await taskCheckIn({
      employeeId,
      taskId,
      ipAddress,
      userAgent,
      photo,
      location
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    console.error('Task check-in controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during task check-in'
    });
  }
};

/**
 * POST /tasks/check-out
 * Employee checks out after completing a specific task
 */
export const taskCheckOutController = async (req: Request, res: Response) => {
  try {
    const { employeeId, taskId } = req.body;

    if (!employeeId || !taskId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID and Task ID are required'
      });
    }

    const result = await taskCheckOut({
      employeeId,
      taskId
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    console.error('Task check-out controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during task check-out'
    });
  }
};

/**
 * GET /tasks/status/:employeeId
 * Get current task status for an employee
 */
export const getTaskStatusController = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const result = await getCurrentTaskStatus(employeeId);

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    console.error('Get task status controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while getting task status'
    });
  }
};