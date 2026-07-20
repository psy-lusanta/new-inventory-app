import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })
    res.json({ success: true, data: { notifications, unreadCount } })
  } catch (error) {
    console.error('GetNotifications error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    if (id === 'all') {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      })
    } else {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      })
    }

    res.json({ success: true, data: { message: 'Marked as read' } })
  } catch (error) {
    console.error('MarkAsRead error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    await prisma.notification.delete({ where: { id } })
    res.json({ success: true, data: { message: 'Deleted' } })
  } catch (error) {
    console.error('DeleteNotification error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// Helper to create notifications from other controllers
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  link?: string
) => {
  try {
    await prisma.notification.create({
      data: { userId, title, message, type, link },
    })
    // Auto-delete old notifications (keep last 100 per user)
    const count = await prisma.notification.count({ where: { userId } })
    if (count > 100) {
      const oldest = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: count - 100,
        select: { id: true },
      })
      await prisma.notification.deleteMany({
        where: { id: { in: oldest.map((n) => n.id) } },
      })
    }
  } catch (error) {
    console.error('CreateNotification error:', error)
  }
}