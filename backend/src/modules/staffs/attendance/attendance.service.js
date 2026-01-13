import { prisma } from '@/lib/prisma';
import { getDeviceInfo } from '@/utils/deviceinfo';
import { VehicleService } from '../vehicles/vehicle.service';
import { NotificationService } from '../../notifications/notification.service';
// Environment-configurable defaults
const DEFAULT_FLEXIBLE_WINDOW_MINUTES = Number(process.env.DEFAULT_FLEXIBLE_WINDOW_MINUTES || 120);
const MAX_ATTEMPTS = 3;
// Helper functions to convert between AttemptCount enum and numbers
function attemptCountToNumber(attemptCount) {
    if (attemptCount === 'ZERO')
        return 0;
    if (attemptCount === 'ONE')
        return 1;
    if (attemptCount === 'TWO')
        return 2;
    if (attemptCount === 'THREE')
        return 3;
    return 0;
}
function numberToAttemptCount(num) {
    if (num <= 0)
        return 'ZERO';
    if (num === 1)
        return 'ONE';
    if (num === 2)
        return 'TWO';
    if (num >= 3)
        return 'THREE';
    return 'ZERO';
}
// Create attendance record without location validation
export async function createAttendanceRecord(data) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const employee = await prisma.employee.findUnique({ where: { employeeId: data.employeeId } });
    if (!employee)
        throw new Error('EMPLOYEE_NOT_FOUND');
    // Get existing attendance record
    const existing = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: today } }
    });
    if (existing && existing.locked)
        throw new Error('ATTENDANCE_LOCKED');
    const deviceInfo = getDeviceInfo(data.userAgent);
    const deviceString = `${deviceInfo.os} - ${deviceInfo.browser} - ${deviceInfo.device}`;
    // Use provided location text or default
    const locationText = data.locationText || 'Office Location';
    const updateData = {
        ipAddress: data.ipAddress,
        deviceInfo: deviceString,
        photo: data.photo ?? existing?.photo,
        status: data.status,
        source: 'SELF',
        updatedAt: new Date(),
        attemptCount: 'ZERO'
    };
    // Handle check-in/check-out logic
    if (data.action === 'check-in') {
        if (!existing?.clockIn) {
            updateData.clockIn = new Date();
        }
        const taskCheckinTime = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        updateData.taskStartTime = taskCheckinTime;
        if (existing && existing.source === 'ADMIN' && !existing.clockIn) {
            updateData.clockOut = null;
        }
    }
    else if (data.action === 'check-out') {
        const checkoutTime = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        updateData.clockOut = new Date();
        updateData.taskEndTime = checkoutTime;
        if (existing && existing.source === 'ADMIN' && !existing.clockIn) {
            throw new Error('CANNOT_CHECKOUT_WITHOUT_CHECKIN');
        }
    }
    else if (data.action === 'task-checkout') {
        const taskCheckoutTime = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        updateData.taskEndTime = taskCheckoutTime;
    }
    else {
        if (!existing?.clockIn && (data.status === 'PRESENT' || data.status === 'LATE')) {
            updateData.clockIn = new Date();
        }
    }
    const saved = existing
        ? await prisma.attendance.update({
            where: { id: existing.id },
            data: {
                ...updateData,
                clockIn: updateData.clockIn !== undefined ? updateData.clockIn : existing.clockIn,
                clockOut: updateData.clockOut !== undefined ? updateData.clockOut : existing.clockOut
            }
        })
        : await prisma.attendance.create({
            data: {
                employeeId: employee.id,
                date: today,
                clockIn: updateData.clockIn || (data.status === 'PRESENT' || data.status === 'LATE' ? new Date() : null),
                clockOut: updateData.clockOut || null,
                ipAddress: data.ipAddress,
                deviceInfo: deviceString,
                photo: data.photo,
                status: data.status,
                source: 'SELF',
                lockedReason: '',
                locked: false,
                attemptCount: 'ZERO'
            }
        });
    // Auto-unassign vehicle on checkout
    if (data.action === 'check-out') {
        try {
            const vehicleService = new VehicleService();
            const notificationService = new NotificationService();
            const vehicleResult = await vehicleService.getEmployeeVehicle(data.employeeId);
            if (vehicleResult.success && vehicleResult.data) {
                const vehicle = vehicleResult.data;
                const unassignResult = await vehicleService.unassignVehicle(vehicle.id);
                if (unassignResult.success) {
                    await notificationService.createAdminNotification({
                        type: 'VEHICLE_UNASSIGNED',
                        title: 'Vehicle Auto-Unassigned',
                        message: `Vehicle ${vehicle.vehicleNumber} (${vehicle.make} ${vehicle.model}) has been automatically unassigned from ${employee.name} (${data.employeeId}) after checkout.`,
                        data: {
                            vehicleId: vehicle.id,
                            vehicleNumber: vehicle.vehicleNumber,
                            employeeId: data.employeeId,
                            employeeName: employee.name,
                            checkoutTime: saved.clockOut?.toISOString()
                        }
                    });
                    console.log(`Vehicle ${vehicle.vehicleNumber} auto-unassigned from employee ${data.employeeId} after checkout`);
                }
            }
        }
        catch (error) {
            console.error('Error auto-unassigning vehicle on checkout:', error);
        }
    }
    return {
        employeeId: data.employeeId,
        timestamp: saved.createdAt.toISOString(),
        location: locationText,
        ipAddress: saved.ipAddress || data.ipAddress || '',
        deviceInfo: saved.deviceInfo || deviceString || '',
        photo: saved.photo || data.photo || undefined,
        status: saved.status
    };
}
// Get remaining attempts (updated to numeric)
export async function getRemainingAttempts(employeeId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const employee = await prisma.employee.findUnique({ where: { employeeId } });
    if (!employee)
        throw new Error('EMPLOYEE_NOT_FOUND');
    const attendance = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: today } }
    });
    if (!attendance) {
        return { remainingAttempts: MAX_ATTEMPTS, isLocked: false };
    }
    if (attendance.locked) {
        return { remainingAttempts: 0, isLocked: true, status: attendance.status };
    }
    const used = attemptCountToNumber(attendance.attemptCount);
    return { remainingAttempts: Math.max(0, MAX_ATTEMPTS - used), isLocked: false, status: attendance.status };
}
const STANDARD_WORK_MINUTES = 8 * 60;
export function calculateWorkAndOvertimeFromAttendance(clockIn, clockOut) {
    if (!clockIn || !clockOut)
        return null;
    const diffMs = clockOut.getTime() - clockIn.getTime();
    if (diffMs <= 0)
        return null;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const workedMinutes = Math.min(totalMinutes, STANDARD_WORK_MINUTES);
    const overtimeMinutes = Math.max(totalMinutes - STANDARD_WORK_MINUTES, 0);
    return {
        workedMinutes,
        overtimeMinutes
    };
}
export function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}
