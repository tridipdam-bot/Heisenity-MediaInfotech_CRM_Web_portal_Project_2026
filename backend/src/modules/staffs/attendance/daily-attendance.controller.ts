import { Request, Response } from 'express';
import { dailyClockIn, dailyClockOut, getDailyAttendanceStatus } from './daily-attendance.service';

/**
 * =============================================================================
 * DAILY ATTENDANCE CONTROLLER
 * =============================================================================
 * Handles API endpoints for daily clock-in/clock-out operations only.
 * Completely separate from task-level check-in/checkout functionality.
 * =============================================================================
 */

/**
 * POST /attendance/clock-in
 * Field engineer clocks in to start their workday
 */
export const dailyClockInController = async (req: Request, res: Response) => {
  try {
    const { employeeId, photo, locationText } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || '';

    const result = await dailyClockIn({
      employeeId,
      ipAddress,
      userAgent,
      photo,
      locationText
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    console.error('Daily clock-in controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during daily clock-in'
    });
  }
};

/**
 * POST /attendance/clock-out
 * Field engineer clocks out to end their workday
 */
export const dailyClockOutController = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const result = await dailyClockOut(employeeId);

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    console.error('Daily clock-out controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during daily clock-out'
    });
  }
};

/**
 * GET /attendance/daily-status/:employeeId
 * Get current daily attendance status for an employee
 */
export const getDailyStatusController = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    const result = await getDailyAttendanceStatus(employeeId);

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);

  } catch (error) {
    console.error('Get daily status controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while getting daily status'
    });
  }
};