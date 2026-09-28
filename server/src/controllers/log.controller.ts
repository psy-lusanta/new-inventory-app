import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'
import { cache } from '../lib/cache'

export const getLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1', 10)
    const limit = parseInt((req.query.limit as string) ?? '50', 10)
    const skip = (page - 1) * limit
    const action = req.query.action as string | undefined
    const userId = req.query.userId as string | undefined
    const search = req.query.search as string | undefined

    const where: any = {}
    if (action) where.action = action
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { entityName: { contains: search, mode: 'insensitive' } },
        { tableName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.activityLog.count({ where }),
    ])

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('GetLogs error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const getLogStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = 'log-stats'

    // ✅ Now async
    const cached = await cache.get(cacheKey)
    if (cached) {
      res.json({ success: true, data: cached })
      return
    }

    const [total, byAction, byUser, last24h] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.groupBy({
        by: ['action'],
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),
      prisma.activityLog.groupBy({
        by: ['userId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
      prisma.activityLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    // Get user names for top users
    const topUserIds = byUser.map((u) => u.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, name: true },
    })

    const topUsers = byUser.map((u) => ({
      userId: u.userId,
      name: users.find((usr) => usr.id === u.userId)?.name ?? 'Unknown',
      count: u._count.userId,
    }))

    const result = { total, byAction, topUsers, last24h }

    // ✅ Now async
    await cache.set(cacheKey, result, 60)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('GetLogStats error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}