import { Router } from 'express'
import { getRows, getRow, createRow, updateRow, deleteRow } from '../controllers/row.controller'
import { authenticate, requireStaffOrAdmin } from '../middleware/auth.middleware'

const router = Router({ mergeParams: true })

// All routes require authentication
router.use(authenticate)

router.get('/', getRows)                              // all roles
router.get('/:rowId', getRow)                         // all roles
router.post('/', requireStaffOrAdmin, createRow)      // staff + admin
router.put('/:rowId', requireStaffOrAdmin, updateRow) // staff + admin
router.delete('/:rowId', requireStaffOrAdmin, deleteRow) // staff + admin

export default router