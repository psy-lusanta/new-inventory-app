import { Router } from 'express'
import {
  getLowStockAlerts,
  getDashboard,
  getRowMovements,
  globalSearch,
} from '../controllers/report.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/dashboard', getDashboard)
router.get('/low-stock', getLowStockAlerts)
router.get('/movements/:rowId', getRowMovements)
router.get('/search', globalSearch)

export default router