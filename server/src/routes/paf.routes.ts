import { Router } from 'express'
import {
  getNextPafNo,
  getForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
} from '../controllers/paf.controller'
import { authenticate, requireStaffOrAdmin } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/next-paf-no', getNextPafNo)
router.get('/', getForms)
router.get('/:id', getForm)
router.post('/', requireStaffOrAdmin, createForm)
router.put('/:id', requireStaffOrAdmin, updateForm)
router.delete('/:id', requireStaffOrAdmin, deleteForm)

export default router