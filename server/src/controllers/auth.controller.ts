import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { logActivity, LOG_ACTIONS } from '../lib/logger.activity'
import { AuthenticatedRequest } from 'src/middleware/auth.middleware'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' })
      return
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      res.status(423).json({
        success: false,
        error: `Account locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`
      })
      return
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1
      const lockData = attempts >= 5
        ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } // lock 15 min
        : { failedLoginAttempts: attempts }

      await prisma.user.update({ where: { id: user.id }, data: lockData })

      const remaining = 5 - attempts
      res.status(401).json({
        success: false,
        error: attempts >= 5
          ? 'Too many failed attempts. Account locked for 15 minutes.'
          : `Invalid password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      })
      return
    }

    // Reset on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    })

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    await logActivity({
      userId: user.id,
      action: LOG_ACTIONS.LOGIN,
      entityType: 'user',
      entityId: user.id,
      entityName: user.email,
      ipAddress: req.ip,
    })

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    })

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          createdAt: user.createdAt,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Logout ────────────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  res.json({ success: true, data: { message: 'Logged out successfully' } })
}

// ─── Get current user ─────────────────────────────────────────────────────────
export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    res.json({ success: true, data: user })
  } catch (error) {
    console.error('GetMe error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Get all users (admin only) ───────────────────────────────────────────────
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ success: true, data: users })
  } catch (error) {
    console.error('GetUsers error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Create user (admin only) ─────────────────────────────────────────────────
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, error: 'All fields are required' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(400).json({ success: false, error: 'Email already in use' })
      return
    }

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, mustChangePassword: true },
      select: { id: true, name: true, email: true, role: true, mustChangePassword: true, createdAt: true },
    })

    res.status(201).json({ success: true, data: user })

    await logActivity({
      userId: (req as any).user.id,
      action: LOG_ACTIONS.CREATE_USER,
      entityType: 'user',
      entityId: user.id,
      entityName: user.email,
      details: { role: user.role },
      ipAddress: req.ip,
    })
  } catch (error) {
    console.error('CreateUser error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Reset user password (admin only) ────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { password } = req.body

    if (!password || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    await logActivity({
      userId: (req as any).user.id,
      action: LOG_ACTIONS.RESET_PASSWORD,
      entityType: 'user',
      entityId: userId,
      ipAddress: req.ip,
    })

    res.json({ success: true, data: { message: 'Password reset successfully' } })
  } catch (error) {
    console.error('ResetPassword error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Change own password ──────────────────────────────────────────────────────
export const changeOwnPassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { currentPassword, newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'New password must be at least 6 characters' })
      return
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      res.status(401).json({ success: false, error: 'Current password is incorrect' })
      return
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    })

    await logActivity({
      userId,
      action: LOG_ACTIONS.CHANGE_PASSWORD,
      entityType: 'user',
      entityId: userId,
      ipAddress: req.ip,
    })

    res.json({ success: true, data: { message: 'Password changed successfully' } })
  } catch (error) {
    console.error('ChangeOwnPassword error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Delete user (admin only) ─────────────────────────────────────────────────
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params
    const requestingUserId = req.user!.id

    // Cannot delete yourself
    if (userId === requestingUserId) {
      res.status(400).json({ success: false, error: 'You cannot delete your own account' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            inventoryRows: true,
            pafForms: true,
          }
        }
      }
    })

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    // Warn if user has data — but still allow deletion
    // ActivityLogs and Notifications will cascade automatically
    await prisma.user.delete({ where: { id: userId } })

    await logActivity({
      userId: requestingUserId,
      action: LOG_ACTIONS.DELETE_USER,
      entityType: 'user',
      entityId: userId,
      entityName: user.email,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      data: {
        message: `User "${user.name}" deleted successfully`,
        rowsAffected: user._count.inventoryRows,
      }
    })
  } catch (error) {
    console.error('DeleteUser error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Update own profile (authenticated user only) ───────────────────────────────
export const updateOwnProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { name, email } = req.body

    if (!name?.trim()) {
      res.status(400).json({ success: false, error: 'Name is required' })
      return
    }

    if (!email?.trim()) {
      res.status(400).json({ success: false, error: 'Email is required' })
      return
    }

    // Check email not taken by another user
    const existing = await prisma.user.findFirst({
      where: { email: email.trim(), id: { not: userId } },
    })
    if (existing) {
      res.status(400).json({ success: false, error: 'Email already in use by another account' })
      return
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim(), email: email.trim() },
      select: { id: true, name: true, email: true, role: true, mustChangePassword: true, createdAt: true },
    })

    await logActivity({
      userId,
      action: 'UPDATE_PROFILE',
      entityType: 'user',
      entityId: userId,
      entityName: user.email,
      ipAddress: req.ip,
    })

    res.json({ success: true, data: user })
  } catch (error) {
    console.error('UpdateOwnProfile error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}