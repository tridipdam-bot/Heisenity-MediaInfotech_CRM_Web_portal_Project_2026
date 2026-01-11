import { Router, Request, Response } from 'express';
import attendanceRoutes from '@/modules/staffs/attendance/attendance.route';
import employeeRoutes from '@/modules/staffs/employee/employee.route';
import taskRoutes from '@/modules/staffs/tasks/task.route';
import teamRoutes from '@/modules/staffs/teams/team.route';
import vehicleRoutes from '@/modules/staffs/vehicles/vehicle.route';
import leaveRoutes from '@/modules/staffs/leave/leave.route';
import documentRoutes from '@/modules/staffs/documents/document.route';
import notificationRoutes from '@/modules/notifications/notification.routes';
import databaseRoutes from './database.route';
import { authRouter } from './auth.route';
import employeeIdRoutes from './employeeId.route';
import fieldEngineerRoutes from './fieldEngineer.route';
import systemConfigRoutes from './systemConfig.route';

const router = Router();

// Mount auth routes
router.use('/auth', authRouter);

// Mount attendance routes
router.use('/attendance', attendanceRoutes);

// Mount employee routes
router.use('/employees', employeeRoutes);

// Mount task routes
router.use('/tasks', taskRoutes);

// Mount team routes
router.use('/teams', teamRoutes);

// Mount vehicle routes
router.use('/', vehicleRoutes);

// Mount leave routes
router.use('/leave', leaveRoutes);

// Mount document routes
router.use('/documents', documentRoutes);

// Mount notification routes
router.use('/', notificationRoutes);

// Mount database management routes (development only)
router.use('/api', databaseRoutes);

// Mount employee ID generator routes
router.use('/employee-id', employeeIdRoutes);

// Mount field engineer routes
router.use('/field-engineers', fieldEngineerRoutes);

// Mount system configuration routes
router.use('/system-config', systemConfigRoutes);

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'CRM Backend API'
  });
});

// Test endpoint
router.get('/test', (_req: Request, res: Response) => {
  res.json({ 
    message: 'CRM Backend API is running!',
    version: '1.0.0'
  });
});

export default router;