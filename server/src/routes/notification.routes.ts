import { Router } from 'express'
import { getNotifications, markAsRead, deleteNotification } from '../controllers/notification.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/', getNotifications)
router.patch('/:id/read', markAsRead) 
router.delete('/:id', deleteNotification)

export default router