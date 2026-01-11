import { prisma } from '@/lib/prisma';
export class NotificationService {
    // Create a new admin notification
    async createAdminNotification(data) {
        try {
            const notification = await prisma.adminNotification.create({
                data: {
                    type: data.type,
                    title: data.title,
                    message: data.message,
                    data: data.data ? JSON.stringify(data.data) : null,
                    isRead: false
                }
            });
            return {
                success: true,
                data: notification
            };
        }
        catch (error) {
            console.error('Error creating admin notification:', error);
            return {
                success: false,
                error: 'Failed to create notification'
            };
        }
    }
    // Get all admin notifications
    async getAdminNotifications(filters) {
        try {
            const where = {};
            if (filters?.isRead !== undefined) {
                where.isRead = filters.isRead;
            }
            if (filters?.type) {
                where.type = filters.type;
            }
            const notifications = await prisma.adminNotification.findMany({
                where,
                orderBy: {
                    createdAt: 'desc'
                },
                take: filters?.limit || 50
            });
            return {
                success: true,
                data: notifications.map(notification => ({
                    ...notification,
                    data: notification.data ? JSON.parse(notification.data) : null
                }))
            };
        }
        catch (error) {
            console.error('Error fetching admin notifications:', error);
            return {
                success: false,
                error: 'Failed to fetch notifications'
            };
        }
    }
    // Mark notification as read
    async markAsRead(notificationId) {
        try {
            const notification = await prisma.adminNotification.update({
                where: { id: notificationId },
                data: { isRead: true }
            });
            return {
                success: true,
                data: notification
            };
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            return {
                success: false,
                error: 'Failed to mark notification as read'
            };
        }
    }
    // Mark all notifications as read
    async markAllAsRead() {
        try {
            await prisma.adminNotification.updateMany({
                where: { isRead: false },
                data: { isRead: true }
            });
            return {
                success: true,
                message: 'All notifications marked as read'
            };
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            return {
                success: false,
                error: 'Failed to mark all notifications as read'
            };
        }
    }
    // Delete notification
    async deleteNotification(notificationId) {
        try {
            await prisma.adminNotification.delete({
                where: { id: notificationId }
            });
            return {
                success: true,
                message: 'Notification deleted'
            };
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            return {
                success: false,
                error: 'Failed to delete notification'
            };
        }
    }
    // Get unread notification count
    async getUnreadCount() {
        try {
            const count = await prisma.adminNotification.count({
                where: { isRead: false }
            });
            return {
                success: true,
                data: { count }
            };
        }
        catch (error) {
            console.error('Error getting unread count:', error);
            return {
                success: false,
                error: 'Failed to get unread count'
            };
        }
    }
}
