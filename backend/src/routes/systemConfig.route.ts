import { Router } from 'express'
import { SystemConfigController } from '../controllers/systemConfig.controller'

const router = Router()

// Get office location
router.get('/office-location', SystemConfigController.getOfficeLocation)

// Set office location
router.post('/office-location', SystemConfigController.setOfficeLocation)

// Get all system configurations
router.get('/all', SystemConfigController.getAllConfigs)

export default router