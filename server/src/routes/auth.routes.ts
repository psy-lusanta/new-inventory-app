import { Router } from 'express'
import { login, logout, getMe, getUsers, createUser, resetPassword, deleteUser, changeOwnPassword, updateOwnProfile } from '../controllers/auth.controller'
import { authenticate, requireAdmin } from '../middleware/auth.middleware'
import { validate } from '../lib/validate'
import { loginSchema, createUserSchema, resetPasswordSchema } from '../lib/schemas'

const router = Router()

router.post('/login', validate(loginSchema), login)
router.post('/logout', logout)
router.get('/me', authenticate, getMe)
router.get('/users', authenticate, requireAdmin, getUsers)
router.post('/users', authenticate, requireAdmin, validate(createUserSchema), createUser)
router.patch('/users/:userId/reset-password', authenticate, requireAdmin, validate(resetPasswordSchema), resetPassword)
router.post('/change-password', authenticate, changeOwnPassword)
router.delete('/users/:userId', authenticate, requireAdmin, deleteUser)
router.patch('/profile', authenticate, updateOwnProfile)

export default router