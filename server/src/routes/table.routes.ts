import { Router } from 'express'
import {
  getTables, 
  getTable, 
  createTable, 
  updateTable,
  deleteTable, 
  addField, 
  updateField, deleteField, reorderFields
} from '../controllers/table.controller'
import { authenticate, requireAdmin } from '../middleware/auth.middleware'
import { validate } from '../lib/validate'
import { createTableSchema } from '../lib/schemas'

const router = Router()
router.use(authenticate)

router.get('/', getTables)
router.get('/:id', getTable)
router.post('/', requireAdmin, validate(createTableSchema), createTable)
router.put('/:id', requireAdmin, updateTable)
router.delete('/:id', requireAdmin, deleteTable)
router.post('/:id/fields', requireAdmin, addField)
router.put('/:id/fields/reorder', requireAdmin, reorderFields)  
router.put('/:id/fields/:fieldId', requireAdmin, updateField) 
router.delete('/:id/fields/:fieldId', requireAdmin, deleteField)

export default router