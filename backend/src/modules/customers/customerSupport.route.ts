import { Router } from 'express';
import { CustomerSupportController } from './customerSupport.controller';
import { CustomerSupportUploadController } from './customerSupportUpload.controller';
import { authenticateToken } from '@/middleware/auth.middleware';
import { authenticateCustomer } from '@/middleware/customerAuth.middleware';

const router = Router();
const uploadController = new CustomerSupportUploadController();

// Customer routes
router.post('/submit', authenticateCustomer, CustomerSupportController.submitSupportRequest);
router.get('/my-requests', authenticateCustomer, CustomerSupportController.getCustomerSupportRequests);
router.post('/upload', authenticateCustomer, uploadController.uploadMiddleware, uploadController.uploadFiles);
router.get('/download/:filename', uploadController.downloadFile);

// Employee routes
router.get('/pending', authenticateToken, CustomerSupportController.getPendingSupportRequests);
router.post('/:id/accept', authenticateToken, CustomerSupportController.acceptSupportRequest);
router.get('/my-accepted', authenticateToken, CustomerSupportController.getMyAcceptedRequests);
router.post('/:id/create-ticket', authenticateToken, CustomerSupportController.createTicketFromRequest);

export default router;
