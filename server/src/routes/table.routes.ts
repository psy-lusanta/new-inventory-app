import { Router } from 'express'
import {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  addField,
  updateField,
  deleteField,
} from '../controllers/table.controller'
import { authenticate, requireAdmin, requireStaffOrAdmin } from '../middleware/auth.middleware'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ─── Table Routes ─────────────────────────────────────────────────────────────
router.get('/', getTables)                          // all roles
router.get('/:id', getTable)                        // all roles
router.post('/', requireAdmin, createTable)         // admin only
router.put('/:id', requireAdmin, updateTable)       // admin only
router.delete('/:id', requireAdmin, deleteTable)    // admin only

// ─── Field Routes ─────────────────────────────────────────────────────────────
router.post('/:id/fields', requireAdmin, addField)              // admin only
router.put('/:id/fields/:fieldId', requireAdmin, updateField)   // admin only
router.delete('/:id/fields/:fieldId', requireAdmin, deleteField)// admin only

export default router
