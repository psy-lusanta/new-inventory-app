import { Router } from 'express'
import { getLogs, getLogStats } from '../controllers/log.controller'
import { authenticate, requireAdmin } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate, requireAdmin) // Admin only

router.get('/', getLogs)
router.get('/stats', getLogStats)

export default router