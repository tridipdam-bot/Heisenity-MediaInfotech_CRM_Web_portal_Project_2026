import { Router } from 'express'
import { TicketUploadController } from './upload.controller'
import { authenticateToken } from '../../middleware/auth.middleware'

const router = Router()
const uploadController = new TicketUploadController()

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Upload file for ticket
router.post('/upload', uploadController.uploadMiddleware, uploadController.uploadFile)

// Download file
router.get('/download/:filename', uploadController.downloadFile)

export { router as ticketUploadRouter }