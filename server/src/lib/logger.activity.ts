import prisma from './prisma'

interface LogParams {
  userId: string
  action: string
  entityType: string
  entityId?: string
  entityName?: string
  tableName?: string
  details?: Record<string, any>
  ipAddress?: string
}

export const logActivity = async (params: LogParams) => {
  try {
    await prisma.activityLog.create({ data: params })

    // Auto-delete logs older than 90 days (runs async, doesn't block)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    prisma.activityLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    }).catch(() => {}) // silent fail
  } catch (error) {
    // Never let logging crash the main request
    console.error('Failed to log activity:', error)
  }
}

export const LOG_ACTIONS = {
  // Rows
  CREATE_ROW: 'CREATE_ROW',
  UPDATE_ROW: 'UPDATE_ROW',
  DELETE_ROW: 'DELETE_ROW',
  // Tables
  CREATE_TABLE: 'CREATE_TABLE',
  UPDATE_TABLE: 'UPDATE_TABLE',
  DELETE_TABLE: 'DELETE_TABLE',
  // Fields
  ADD_FIELD: 'ADD_FIELD',
  UPDATE_FIELD: 'UPDATE_FIELD',
  DELETE_FIELD: 'DELETE_FIELD',
  // Users
  CREATE_USER: 'CREATE_USER',
  DELETE_USER: 'DELETE_USER',
  RESET_PASSWORD: 'RESET_PASSWORD',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  LOGIN: 'LOGIN',
  // PAF
  CREATE_PAF: 'CREATE_PAF',
  UPDATE_PAF: 'UPDATE_PAF',
  DELETE_PAF: 'DELETE_PAF',
} as const