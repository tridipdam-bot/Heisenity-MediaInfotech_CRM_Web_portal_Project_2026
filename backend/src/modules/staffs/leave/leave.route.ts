import { Router } from 'express'
import { LeaveController } from './leave.controller'

const router = Router()
const leaveController = new LeaveController()

// Employee routes
router.post('/applications', leaveController.createLeaveApplication)
router.get('/applications/employee/:employeeId', leaveController.getEmployeeLeaveApplications)
router.put('/applications/:applicationId/cancel', leaveController.cancelLeaveApplication)

// Admin routes
router.get('/applications', leaveController.getAllLeaveApplications)
router.put('/applications/:applicationId/review', leaveController.reviewLeaveApplication)

export default router