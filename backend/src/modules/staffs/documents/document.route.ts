import { Router } from 'express'
import { DocumentController } from './document.controller'

const router = Router()
const documentController = new DocumentController()

// Admin routes
router.post('/upload', documentController.uploadMiddleware, documentController.uploadDocument)
router.get('/all', documentController.getAllDocuments)
router.delete('/:documentId', documentController.deleteDocument)

// Employee routes
router.get('/employee/:employeeId', documentController.getEmployeeDocuments)
router.get('/download/:documentId', documentController.downloadDocument)

export default router