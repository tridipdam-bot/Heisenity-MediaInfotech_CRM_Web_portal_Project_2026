import { Router } from 'express';
import { 
  dailyClockInController, 
  dailyClockOutController, 
  getDailyStatusController,
  getRejectedAttendancesController,
  reEnableAttendanceController
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

/**
 * =============================================================================
 * ADMIN ATTENDANCE ROUTES
 * =============================================================================
 * Used to recover attendance if rejected by mistake
 * =============================================================================
 */

/**
 * GET /attendance/admin/rejected
 * Get today's rejected attendance records
 */
router.get('/admin/rejected', getRejectedAttendancesController);

/**
 * POST /attendance/admin/re-enable
 * Re-enable a rejected attendance so employee can clock in again
 *
 * Body: {
 *   attendanceId: string,
 *   adminId: string,
 *   reason?: string
 * }
 */
router.post('/admin/re-enable', reEnableAttendanceController);


export default router;