import { LeaveService } from './leave.service';
import { LeaveType, LeaveStatus } from './leave.types';
export class LeaveController {
    leaveService;
    constructor() {
        this.leaveService = new LeaveService();
    }
    // Create leave application
    createLeaveApplication = async (req, res) => {
        try {
            const { employeeId, leaveType, startDate, endDate, reason } = req.body;
            // Validate required fields
            if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: employeeId, leaveType, startDate, endDate, reason'
                });
            }
            // Validate leave type
            if (!Object.values(LeaveType).includes(leaveType)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid leave type'
                });
            }
            const requestData = {
                employeeId,
                leaveType,
                startDate,
                endDate,
                reason: reason.trim()
            };
            const result = await this.leaveService.createLeaveApplication(requestData);
            if (result.success) {
                return res.status(201).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in createLeaveApplication:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
    // Get employee leave applications
    getEmployeeLeaveApplications = async (req, res) => {
        try {
            const { employeeId } = req.params;
            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Employee ID is required'
                });
            }
            const result = await this.leaveService.getEmployeeLeaveApplications(employeeId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(404).json(result);
            }
        }
        catch (error) {
            console.error('Error in getEmployeeLeaveApplications:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
    // Get all leave applications (admin)
    getAllLeaveApplications = async (req, res) => {
        try {
            const result = await this.leaveService.getAllLeaveApplications();
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(500).json(result);
            }
        }
        catch (error) {
            console.error('Error in getAllLeaveApplications:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
    // Review leave application (admin)
    reviewLeaveApplication = async (req, res) => {
        try {
            const { applicationId } = req.params;
            const { status, reviewNote, reviewedBy } = req.body;
            if (!applicationId) {
                return res.status(400).json({
                    success: false,
                    error: 'Application ID is required'
                });
            }
            if (!status || !reviewedBy) {
                return res.status(400).json({
                    success: false,
                    error: 'Status and reviewedBy are required'
                });
            }
            if (status !== LeaveStatus.APPROVED && status !== LeaveStatus.REJECTED) {
                return res.status(400).json({
                    success: false,
                    error: 'Status must be APPROVED or REJECTED'
                });
            }
            const requestData = {
                applicationId,
                status,
                reviewNote: reviewNote?.trim(),
                reviewedBy
            };
            const result = await this.leaveService.reviewLeaveApplication(requestData);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in reviewLeaveApplication:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
    // Cancel leave application
    cancelLeaveApplication = async (req, res) => {
        try {
            const { applicationId } = req.params;
            const { employeeId } = req.body;
            if (!applicationId || !employeeId) {
                return res.status(400).json({
                    success: false,
                    error: 'Application ID and Employee ID are required'
                });
            }
            const result = await this.leaveService.cancelLeaveApplication(applicationId, employeeId);
            if (result.success) {
                return res.status(200).json(result);
            }
            else {
                return res.status(400).json(result);
            }
        }
        catch (error) {
            console.error('Error in cancelLeaveApplication:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    };
}
