import { Router } from 'express';
import { tenderController, upload } from './tender.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { adminOnly } from '../../middleware/adminOnly.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply admin-only middleware to all routes (since only admins manage tenders)
router.use(adminOnly);

// Tender CRUD operations
router.post('/', tenderController.createTender.bind(tenderController));
router.get('/', tenderController.getTenders.bind(tenderController));
router.get('/statistics', tenderController.getTenderStatistics.bind(tenderController));
router.get('/:id', tenderController.getTenderById.bind(tenderController));
router.put('/:id', tenderController.updateTender.bind(tenderController));
router.patch('/:id/status', tenderController.updateTenderStatus.bind(tenderController));
router.delete('/:id', tenderController.deleteTender.bind(tenderController));

// Document management
router.post('/:tenderId/documents', upload.single('document'), tenderController.uploadDocument.bind(tenderController));
router.patch('/documents/:documentId/status', tenderController.updateDocumentStatus.bind(tenderController));
router.get('/documents/:documentId/download', tenderController.downloadDocument.bind(tenderController));

// EMD management
router.post('/:tenderId/emd', tenderController.addEMDRecord.bind(tenderController));
router.patch('/emd/:emdId/status', tenderController.updateEMDStatus.bind(tenderController));
router.get('/emd/summary', tenderController.getEMDSummary.bind(tenderController));

export default router;