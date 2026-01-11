import { createTask, getEmployeeTasks, updateTaskStatus, getAllTasks, updateAttendanceStatus, resetAttendanceAttempts, fixDailyLocationTimes, completeTask } from './task.service';
import { createTeamTask } from '../teams/team.service';
// Assign a new task to an employee or team
export const assignTask = async (req, res) => {
    try {
        const { employeeId, teamId, title, description, category, location, startTime, endTime } = req.body;
        // Validate required fields
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                error: 'Title and description are required'
            });
        }
        // Must have either employeeId or teamId, but not both
        if (!employeeId && !teamId) {
            return res.status(400).json({
                success: false,
                error: 'Either employeeId or teamId is required'
            });
        }
        if (employeeId && teamId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot assign to both individual employee and team simultaneously'
            });
        }
        const assignedBy = 'admin'; // This should be replaced with actual admin ID from auth
        // Team assignment
        if (teamId) {
            const result = await createTeamTask(teamId, title, description, category, location, startTime, assignedBy);
            return res.status(201).json({
                success: true,
                message: `Task assigned to team "${result.teamName}" with ${result.memberCount} members`,
                data: {
                    type: 'team',
                    teamName: result.teamName,
                    memberCount: result.memberCount,
                    tasks: result.tasks
                }
            });
        }
        // Individual employee assignment
        const taskData = {
            employeeId,
            title,
            description,
            category,
            location,
            startTime,
            assignedBy,
        };
        const task = await createTask(taskData);
        return res.status(201).json({
            success: true,
            message: 'Task assigned successfully and attendance status updated automatically',
            data: {
                type: 'individual',
                task
            }
        });
    }
    catch (error) {
        console.error('Error assigning task:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to assign task'
        });
    }
};
// Get tasks for a specific employee
export const getTasksForEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { status } = req.query;
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID is required'
            });
        }
        const taskStatus = status ? status : undefined;
        const tasks = await getEmployeeTasks(employeeId, taskStatus);
        return res.status(200).json({
            success: true,
            data: {
                tasks,
                total: tasks.length
            }
        });
    }
    catch (error) {
        console.error('Error getting employee tasks:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get employee tasks'
        });
    }
};
// Update task status
export const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        if (!taskId || !status) {
            return res.status(400).json({
                success: false,
                error: 'Task ID and status are required'
            });
        }
        // Validate status
        const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid task status'
            });
        }
        const task = await updateTaskStatus(taskId, status);
        return res.status(200).json({
            success: true,
            message: 'Task status updated successfully and attendance status updated automatically',
            data: task
        });
    }
    catch (error) {
        console.error('Error updating task:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update task'
        });
    }
};
// Get all tasks with pagination
export const getTasks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const status = req.query.status;
        const result = await getAllTasks(page, limit, status);
        return res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error getting tasks:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get tasks'
        });
    }
};
// Update attendance status for an employee
export const updateEmployeeAttendanceStatus = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { status } = req.body;
        if (!employeeId || !status) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID and status are required'
            });
        }
        // Validate status
        const validStatuses = ['PRESENT', 'LATE', 'ABSENT', 'MARKDOWN'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid attendance status. Must be one of: PRESENT, LATE, ABSENT, MARKDOWN'
            });
        }
        await updateAttendanceStatus(employeeId, status);
        return res.status(200).json({
            success: true,
            message: `Attendance status updated to ${status} for employee ${employeeId}`
        });
    }
    catch (error) {
        console.error('Error updating attendance status:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update attendance status'
        });
    }
};
// Reset attendance attempts for an employee
export const resetEmployeeAttendanceAttempts = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID is required'
            });
        }
        await resetAttendanceAttempts(employeeId);
        return res.status(200).json({
            success: true,
            message: `Attendance attempts reset for employee ${employeeId}`
        });
    }
    catch (error) {
        console.error('Error resetting attendance attempts:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to reset attendance attempts'
        });
    }
};
// Fix daily location time issues
export const fixLocationTimes = async (req, res) => {
    try {
        await fixDailyLocationTimes();
        return res.status(200).json({
            success: true,
            message: 'Daily location times fixed successfully'
        });
    }
    catch (error) {
        console.error('Error fixing location times:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fix location times'
        });
    }
};
// Complete a task (updates task end time without affecting attendance clock out)
export const completeTaskEndpoint = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { employeeId } = req.body;
        if (!taskId) {
            return res.status(400).json({
                success: false,
                error: 'Task ID is required'
            });
        }
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                error: 'Employee ID is required'
            });
        }
        await completeTask(taskId, employeeId);
        return res.status(200).json({
            success: true,
            message: 'Task completed successfully'
        });
    }
    catch (error) {
        console.error('Error completing task:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to complete task'
        });
    }
};
