import { Router } from 'express';
import { 
  dailyClockInController, 
  dailyClockOutController, 
  getDailyStatusController 
} from './daily-attendance.controller';

/**
 * =============================================================================
 * DAILY ATTENDANCE ROUTES
 * =============================================================================
 * Routes for daily clock-in/clock-out operations only.
 * Completely separate from task-level check-in/checkout functionality.
 * =============================================================================
 */

const router = Router();

/**
 * POST /attendance/clock-in
 * Field engineer clocks in to start their workday
 * 
 * Body: {
 *   employeeId: string,
 *   photo?: string,
 *   locationText?: string
 * }
 */
router.post('/clock-in', dailyClockInController);

/**
 * POST /attendance/clock-out
 * Field engineer clocks out to end their workday
 * 
 * Body: {
 *   employeeId: string
 * }
 */
router.post('/clock-out', dailyClockOutController);

/**
 * GET /attendance/daily-status/:employeeId
 * Get current daily attendance status for an employee
 */
router.get('/daily-status/:employeeId', getDailyStatusController);

export default router;