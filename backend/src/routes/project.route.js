import { Router } from 'express';
import { ProjectController } from '@/controllers/project.controller';
const router = Router();
// Project routes
router.get('/', ProjectController.getAllProjects);
router.get('/:id', ProjectController.getProjectById);
router.post('/', ProjectController.createProject);
router.put('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
// Project update routes
router.post('/:id/updates', ProjectController.addProjectUpdate);
router.get('/:id/updates', ProjectController.getProjectUpdates);
// Project payment routes
router.post('/:id/payments', ProjectController.addProjectPayment);
router.get('/:id/payments', ProjectController.getProjectPayments);
export default router;
