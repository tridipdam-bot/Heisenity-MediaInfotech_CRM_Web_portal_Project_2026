import { Router, Request, Response } from 'express';
import { assignTask, getTasksForEmployee, updateTask, getTasks, resetEmployeeAttendanceAttempts } from './task.controller';
import { exportTasksToExcel } from './task.export';
import taskAttendanceRoutes from './task-attendance.route';

const router = Router();

// Export tasks to Excel
router.get('/export/excel', (req: Request, res: Response) => {
  return exportTasksToExcel(req, res);
});

// Assign a new task
router.post('/assign', (req: Request, res: Response) => {
  return assignTask(req, res);
});

// Get all tasks with pagination
router.get('/', (req: Request, res: Response) => {
  return getTasks(req, res);
});

// Get tasks for a specific employee
router.get('/employee/:employeeId', (req: Request, res: Response) => {
  return getTasksForEmployee(req, res);
});

// Update task status
router.put('/:taskId', (req: Request, res: Response) => {
  return updateTask(req, res);
});

// Reset attendance attempts for an employee
router.post('/reset-attempts/:employeeId', (req: Request, res: Response) => {
  return resetEmployeeAttendanceAttempts(req, res);
});

// Task attendance routes (check-in/check-out for tasks)
router.use('/', taskAttendanceRoutes);

export default router;