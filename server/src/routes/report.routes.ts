import { Router } from 'express'
import {
  getLowStockAlerts,
  getDashboard,
  getRowMovements,
  globalSearch,
  getMonthlyMovements,
  getDropdownStats,
  getAssetTagStats,
  getCostStats
} from '../controllers/report.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/dashboard', getDashboard)
router.get('/low-stock', getLowStockAlerts)
router.get('/movements/:rowId', getRowMovements)
router.get('/search', globalSearch)
router.get('/monthly-movements', getMonthlyMovements)
router.get('/dropdown-stats', getDropdownStats)
router.get('/asset-tag-stats', getAssetTagStats)
router.get('/cost-stats', getCostStats)

export default router