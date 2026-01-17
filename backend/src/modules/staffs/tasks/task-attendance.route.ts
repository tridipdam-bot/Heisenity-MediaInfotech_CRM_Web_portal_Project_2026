import { Router } from 'express';
import { 
  taskCheckInController, 
  taskCheckOutController, 
  getTaskStatusController 
} from './task-attendance.controller';

/**
 * =============================================================================
 * TASK ATTENDANCE ROUTES
 * =============================================================================
 * Routes for task-level check-in/checkout operations only.
 * Completely separate from daily clock-in/clock-out functionality.
 * =============================================================================
 */

const router = Router();

/**
 * POST /tasks/check-in
 * Employee checks in to start working on a specific task
 * 
 * Body: {
 *   employeeId: string,
 *   taskId: string,
 *   photo?: string,
 *   location?: string
 * }
 */
router.post('/check-in', taskCheckInController);

/**
 * POST /tasks/check-out
 * Employee checks out after completing a specific task
 * 
 * Body: {
 *   employeeId: string,
 *   taskId: string
 * }
 */
router.post('/check-out', taskCheckOutController);

/**
 * GET /tasks/status/:employeeId
 * Get current task status for an employee
 */
router.get('/status/:employeeId', getTaskStatusController);

export default router;