import { Router } from 'express';
import { CustomerSupportController } from './customerSupport.controller';
import { authenticateToken } from '@/middleware/auth.middleware';
import { authenticateCustomer } from '@/middleware/customerAuth.middleware';

const router = Router();

// Customer routes
router.post('/submit', authenticateCustomer, CustomerSupportController.submitSupportRequest);

// Employee routes
router.get('/pending', authenticateToken, CustomerSupportController.getPendingSupportRequests);
router.post('/:id/accept', authenticateToken, CustomerSupportController.acceptSupportRequest);
router.get('/my-accepted', authenticateToken, CustomerSupportController.getMyAcceptedRequests);
router.post('/:id/create-ticket', authenticateToken, CustomerSupportController.createTicketFromRequest);

export default router;
