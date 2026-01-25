import { Router } from 'express'
import { NotificationController } from './notification.controller'

const router = Router()
const notificationController = new NotificationController()

// Admin notification routes
router.get('/admin/notifications', notificationController.getAdminNotifications.bind(notificationController))
router.put('/admin/notifications/:id/read', notificationController.markAsRead.bind(notificationController))
router.put('/admin/notifications/read-all', notificationController.markAllAsRead.bind(notificationController))
router.delete('/admin/notifications/:id', notificationController.deleteNotification.bind(notificationController))
router.get('/admin/notifications/unread-count', notificationController.getUnreadCount.bind(notificationController))
router.post('/admin/notifications/:id/accept-ticket', notificationController.acceptTicketFromNotification.bind(notificationController))

export default router