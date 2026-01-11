import { prisma } from '../lib/prisma';
export class EmployeeIdGeneratorService {
    /**
     * Generate the next available employee ID based on role
     * Field Engineers: FE001, FE002, etc.
     * In-Office Employees: IO001, IO002, etc.
     */
    static async generateNextEmployeeId(role = 'FIELD_ENGINEER') {
        try {
            const prefix = role === 'FIELD_ENGINEER' ? 'FE' : 'IO';
            // Get all existing employee IDs that match the role pattern
            const existingEmployees = await prisma.employee.findMany({
                select: {
                    employeeId: true
                },
                where: {
                    employeeId: {
                        startsWith: prefix
                    },
                    role: role
                },
                orderBy: {
                    employeeId: 'desc'
                }
            });
            // Extract numeric parts and find the highest number
            let highestNumber = 0;
            for (const employee of existingEmployees) {
                const match = employee.employeeId.match(new RegExp(`^${prefix}(\\d+)$`));
                if (match) {
                    const number = parseInt(match[1], 10);
                    if (number > highestNumber) {
                        highestNumber = number;
                    }
                }
            }
            // Generate next ID
            const nextNumber = highestNumber + 1;
            const nextId = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
            return nextId;
        }
        catch (error) {
            console.error('Error generating employee ID:', error);
            throw new Error('Failed to generate employee ID');
        }
    }
    /**
     * Generate the next available employee ID in format EMP001, EMP002, etc. (Legacy method)
     * @deprecated Use generateNextEmployeeId with role parameter instead
     */
    static async generateNextLegacyEmployeeId() {
        try {
            // Get all existing employee IDs that match the EMP pattern
            const existingEmployees = await prisma.employee.findMany({
                select: {
                    employeeId: true
                },
                where: {
                    employeeId: {
                        startsWith: 'EMP'
                    }
                },
                orderBy: {
                    employeeId: 'desc'
                }
            });
            // Extract numeric parts and find the highest number
            let highestNumber = 0;
            for (const employee of existingEmployees) {
                const match = employee.employeeId.match(/^EMP(\d+)$/);
                if (match) {
                    const number = parseInt(match[1], 10);
                    if (number > highestNumber) {
                        highestNumber = number;
                    }
                }
            }
            // Generate next ID
            const nextNumber = highestNumber + 1;
            const nextId = `EMP${nextNumber.toString().padStart(3, '0')}`;
            return nextId;
        }
        catch (error) {
            console.error('Error generating employee ID:', error);
            throw new Error('Failed to generate employee ID');
        }
    }
    /**
     * Check if an employee ID is available
     */
    static async isEmployeeIdAvailable(employeeId) {
        try {
            const existingEmployee = await prisma.employee.findUnique({
                where: {
                    employeeId: employeeId
                }
            });
            return !existingEmployee;
        }
        catch (error) {
            console.error('Error checking employee ID availability:', error);
            throw new Error('Failed to check employee ID availability');
        }
    }
    /**
     * Validate employee ID format for role-based IDs
     */
    static validateEmployeeIdFormat(employeeId, role) {
        if (role === 'FIELD_ENGINEER') {
            return /^FE\d{3}$/.test(employeeId);
        }
        else if (role === 'IN_OFFICE') {
            return /^IO\d{3}$/.test(employeeId);
        }
        else {
            // Legacy format or any valid format
            return /^(EMP|FE|IO)\d{3}$/.test(employeeId);
        }
    }
    /**
     * Get the next few available employee IDs for a specific role (for preview)
     */
    static async getNextAvailableIds(role = 'FIELD_ENGINEER', count = 5) {
        try {
            const nextId = await this.generateNextEmployeeId(role);
            const prefix = role === 'FIELD_ENGINEER' ? 'FE' : 'IO';
            const baseNumber = parseInt(nextId.substring(2), 10);
            const ids = [];
            for (let i = 0; i < count; i++) {
                const number = baseNumber + i;
                ids.push(`${prefix}${number.toString().padStart(3, '0')}`);
            }
            return ids;
        }
        catch (error) {
            console.error('Error getting next available IDs:', error);
            throw new Error('Failed to get next available IDs');
        }
    }
}
