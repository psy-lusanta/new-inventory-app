import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    updatedAt: Date
    updatedBy: string
  }
}

// ─── Verify JWT Token ─────────────────────────────────────────────────────────
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string
      email: string
      role: string
      updatedAt: Date
      updatedBy: string
    }
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

// ─── Role Guards ──────────────────────────────────────────────────────────────
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' })
    return
  }
  next()
}

export const requireStaffOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!['admin', 'staff'].includes(req.user?.role || '')) {
    res.status(403).json({ success: false, error: 'Staff or admin access required' })
    return
  }
  next()
}
