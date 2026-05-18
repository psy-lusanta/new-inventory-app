import { Router } from 'express'
import { login, getMe, getUsers, createUser } from '../controllers/auth.controller'
import { authenticate, requireAdmin } from '../middleware/auth.middleware'

const router = Router()

// Public
router.post('/login', login)

// Protected
router.get('/me', authenticate, getMe)

// Admin only
router.get('/users', authenticate, requireAdmin, getUsers)
router.post('/users', authenticate, requireAdmin, createUser)

export default router
