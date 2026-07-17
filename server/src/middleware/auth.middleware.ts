import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET not set')

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
  }
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Read from cookie first, fall back to Authorization header
  const token = req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null)

  if (!token) {
    res.status(401).json({ success: false, error: 'No token provided' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string
      email: string
      role: string
    }
    req.user = decoded
    next()
  } catch {
    res.clearCookie('token')
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

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