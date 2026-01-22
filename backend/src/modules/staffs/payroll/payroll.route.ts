import { Router } from 'express'
import { getPayrollRecords, generatePayslip } from './payroll.controller'
import { authenticateToken } from '../../../middleware/auth.middleware'
import { adminOnly } from '../../../middleware/adminOnly.middleware'

const router = Router()

// Apply authentication middleware to all routes
router.use(authenticateToken)

// Admin only routes
router.get('/', adminOnly, getPayrollRecords)
router.post('/generate', adminOnly, generatePayslip)

export default router