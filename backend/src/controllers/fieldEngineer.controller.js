import { prisma } from '../lib/prisma';
import { EmployeeIdGeneratorService } from '../services/employeeIdGenerator.service';
import bcrypt from 'bcryptjs';
export class FieldEngineerController {
    /**
     * Get all field engineers
     */
    static async getAllFieldEngineers(req, res) {
        try {
            const { status = 'ACTIVE', search } = req.query;
            const whereClause = {};
            if (status && status !== 'ALL') {
                whereClause.status = status;
            }
            if (search) {
                whereClause.OR = [
                    { name: { contains: search } },
                    { employeeId: { contains: search } },
                    { email: { contains: search } }
                ];
            }
            const fieldEngineers = await prisma.employee.findMany({
                where: {
                    ...whereClause,
                    role: 'FIELD_ENGINEER'
                },
                select: {
                    id: true,
                    name: true,
                    employeeId: true,
                    email: true,
                    phone: true,
                    teamId: true,
                    isTeamLeader: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true
                },
                orderBy: [
                    { employeeId: 'asc' }
                ]
            });
            res.status(200).json({
                success: true,
                data: {
                    fieldEngineers,
                    total: fieldEngineers.length
                },
                message: 'Field engineers retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error getting field engineers:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get field engineers'
            });
        }
    }
    /**
     * Get field engineer by employee ID
     */
    static async getFieldEngineerByEmployeeId(req, res) {
        try {
            const { employeeId } = req.params;
            if (!employeeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID is required'
                });
            }
            const fieldEngineer = await prisma.employee.findUnique({
                where: {
                    employeeId: employeeId
                },
                select: {
                    id: true,
                    name: true,
                    employeeId: true,
                    email: true,
                    phone: true,
                    teamId: true,
                    isTeamLeader: true,
                    status: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            if (!fieldEngineer || fieldEngineer.role !== 'FIELD_ENGINEER') {
                return res.status(404).json({
                    success: false,
                    message: 'Field engineer not found'
                });
            }
            res.status(200).json({
                success: true,
                data: fieldEngineer,
                message: 'Field engineer retrieved successfully'
            });
        }
        catch (error) {
            console.error('Error getting field engineer:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to get field engineer'
            });
        }
    }
    /**
     * Create new field engineer
     */
    static async createFieldEngineer(req, res) {
        try {
            const { name, email, password, phone, teamId, isTeamLeader, assignedBy } = req.body;
            // Validate required fields
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, and password are required'
                });
            }
            // Generate field engineer ID
            const employeeId = await EmployeeIdGeneratorService.generateNextEmployeeId('FIELD_ENGINEER');
            // Check if email already exists
            const existingEmployee = await prisma.employee.findFirst({
                where: {
                    email: email
                }
            });
            if (existingEmployee) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);
            // If assignedBy is provided, verify the admin exists
            if (assignedBy) {
                const adminExists = await prisma.admin.findUnique({
                    where: { id: assignedBy }
                });
                if (!adminExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid admin ID provided'
                    });
                }
            }
            const newFieldEngineer = await prisma.employee.create({
                data: {
                    name,
                    employeeId,
                    email,
                    password: hashedPassword,
                    phone: phone || null,
                    teamId: teamId || null,
                    isTeamLeader: isTeamLeader || false,
                    assignedBy: assignedBy || null,
                    role: 'FIELD_ENGINEER'
                },
                select: {
                    id: true,
                    name: true,
                    employeeId: true,
                    email: true,
                    phone: true,
                    teamId: true,
                    isTeamLeader: true,
                    assignedBy: true,
                    status: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            res.status(201).json({
                success: true,
                data: newFieldEngineer,
                message: 'Field engineer created successfully'
            });
        }
        catch (error) {
            console.error('Error creating field engineer:', error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create field engineer',
                details: process.env.NODE_ENV === 'development' ? error : undefined
            });
        }
    }
}
