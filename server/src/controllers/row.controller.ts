import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'
import { cache } from '../lib/cache'
import { logActivity, LOG_ACTIONS } from '../lib/logger.activity'
import { createNotification } from './notification.controller'

// ─── Helper: check unique fields ──────────────────────────────────────────────
const checkUniqueFields = async (
  tableId: string,
  fields: any[],
  data: Record<string, any>,
  excludeRowId?: string
) => {
  for (const field of fields) {
    if (!field.required) continue
    const value = data[field.fieldName]
    if (value === undefined || value === null || value === '') continue

    const existingRows = await prisma.inventoryRow.findMany({
      where: { tableId },
    })

    const duplicate = existingRows.find((row) => {
      if (excludeRowId && row.id === excludeRowId) return false
      const rowData = row.data as Record<string, any>
      return String(rowData[field.fieldName]).toLowerCase() === String(value).toLowerCase()
    })

    if (duplicate) {
      return `"${value}" already exists — duplicate values are not allowed`
    }
  }
  return null
}

// ─── Get all rows for a table ─────────────────────────────────────────────────
export const getRows = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tableId } = req.params
    const page = parseInt(req.query.page as string ?? '1', 10)
    const limit = parseInt(req.query.limit as string ?? '50', 10)
    const skip = (page - 1) * limit

    const [rows, total] = await Promise.all([
      prisma.inventoryRow.findMany({
        where: { tableId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.inventoryRow.count({ where: { tableId } }),
    ])

    // Collect all unique updatedBy IDs in ONE query instead of N queries
    const updatedByIds = [...new Set(rows.map((r) => r.updatedBy).filter(Boolean))] as string[]
    const updatedByUsers = updatedByIds.length > 0
      ? await prisma.user.findMany({
        where: { id: { in: updatedByIds } },
        select: { id: true, name: true, email: true },
      })
      : []

    const updatedByMap = Object.fromEntries(updatedByUsers.map((u) => [u.id, u]))

    const rowsWithUsers = rows.map((row) => ({
      ...row,
      updatedByUser: row.updatedBy ? (updatedByMap[row.updatedBy] ?? null) : null,
    }))

    res.json({
      success: true,
      data: rowsWithUsers,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('GetRows error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Get single row ───────────────────────────────────────────────────────────
export const getRow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rowId } = req.params

    const row = await prisma.inventoryRow.findUnique({
      where: { id: rowId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    if (!row) {
      res.status(404).json({ success: false, error: 'Row not found' })
      return
    }

    let updatedByUser = null
    if (row.updatedBy) {
      updatedByUser = await prisma.user.findUnique({
        where: { id: row.updatedBy },
        select: { id: true, name: true, email: true },
      })
    }

    res.json({ success: true, data: { ...row, updatedByUser } })
  } catch (error) {
    console.error('GetRow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Create row ───────────────────────────────────────────────────────────────
export const createRow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tableId } = req.params
    const { data } = req.body
    const userId = req.user!.id

    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, error: 'Row data is required' })
      return
    }

    const table = await prisma.inventoryTable.findUnique({
      where: { id: tableId },
      include: { fields: true },
    })

    if (!table) {
      res.status(404).json({ success: false, error: 'Table not found' })
      return
    }

    // Check required fields
    for (const field of table.fields) {
      if (field.required && (data[field.fieldName] === undefined || data[field.fieldName] === '')) {
        res.status(400).json({ success: false, error: `Field "${field.fieldName}" is required` })
        return
      }
    }

    // Check unique fields
    const uniqueError = await checkUniqueFields(tableId, table.fields, data)
    if (uniqueError) {
      res.status(400).json({ success: false, error: uniqueError })
      return
    }

    const row = await prisma.inventoryRow.create({
      data: {
        tableId,
        createdBy: userId,
        updatedBy: null,
        data,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    // Log stock movements
    for (const field of table.fields) {
      if (field.isStockField && data[field.fieldName] !== undefined) {
        await prisma.stockMovement.create({
          data: {
            tableId,
            rowId: row.id,
            fieldName: field.fieldName,
            type: 'restock',
            delta: Number(data[field.fieldName]),
            note: 'Initial stock on row creation',
            createdBy: userId,
          },
        })
      }
    }

    await logActivity({
      userId,
      action: LOG_ACTIONS.CREATE_ROW,
      entityType: 'row',
      entityId: row.id,
      entityName: String(data[table.fields[0]?.fieldName] ?? row.id.slice(0, 8)), // ← first field value
      tableName: table.name,
      details: { fieldCount: Object.keys(data).length },
      ipAddress: req.ip,
    })

    // Notify all admins when a new row is added
    const admins = await prisma.user.findMany({
      where: { role: 'admin', id: { not: userId } },
      select: { id: true },
    })
    await Promise.all(admins.map((admin) =>
      createNotification(
        admin.id,
        'New Record Added',
        `${req.user!.email} added a record to ${table.name}`,
        'info',
        `/tables/${tableId}`
      )
    ))
    cache.invalidate('dashboard')
    cache.invalidatePattern('monthly')
    cache.invalidate('cost-stats')
    res.status(201).json({ success: true, data: row })
  } catch (error) {
    console.error('CreateRow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Update row ───────────────────────────────────────────────────────────────
export const updateRow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tableId, rowId } = req.params
    const { data } = req.body
    const userId = req.user!.id

    if (!data || typeof data !== 'object') {
      res.status(400).json({ success: false, error: 'Row data is required' })
      return
    }

    const existingRow = await prisma.inventoryRow.findUnique({
      where: { id: rowId },
    })

    if (!existingRow) {
      res.status(404).json({ success: false, error: 'Row not found' })
      return
    }

    const table = await prisma.inventoryTable.findUnique({
      where: { id: tableId },
      include: { fields: true },
    })
    const firstFieldName = table?.fields[0]?.fieldName

    if (table) {
      // Check unique fields (exclude current row)
      const uniqueError = await checkUniqueFields(tableId, table.fields, data, rowId)
      if (uniqueError) {
        res.status(400).json({ success: false, error: uniqueError })
        return
      }

      // Log stock movements
      const oldData = existingRow.data as Record<string, any>
      for (const field of table.fields) {
        if (field.isStockField && data[field.fieldName] !== undefined) {
          const oldVal = Number(oldData[field.fieldName] ?? 0)
          const newVal = Number(data[field.fieldName])
          const delta = newVal - oldVal

          if (delta !== 0) {
            await prisma.stockMovement.create({
              data: {
                tableId,
                rowId,
                fieldName: field.fieldName,
                type: delta > 0 ? 'restock' : 'deduction',
                delta,
                note: 'Updated via row edit',
                createdBy: userId,
              },
            })
          }
        }
      }
    }

    const updated = await prisma.inventoryRow.update({
      where: { id: rowId },
      data: {
        data,
        updatedBy: userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    let updatedByUser = null
    if (updated.updatedBy) {
      updatedByUser = await prisma.user.findUnique({
        where: { id: updated.updatedBy },
        select: { id: true, name: true, email: true },
      })
    }

    await logActivity({
      userId,
      action: LOG_ACTIONS.UPDATE_ROW,
      entityType: 'row',
      entityId: rowId,
      entityName: firstFieldName ? String(data[firstFieldName] ?? rowId.slice(0, 8)) : rowId.slice(0, 8),
      tableName: table?.name,
      ipAddress: req.ip,
    })


    res.json({ success: true, data: { ...updated, updatedByUser } })
    cache.invalidate('dashboard')
  } catch (error) {
    console.error('UpdateRow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Delete row ───────────────────────────────────────────────────────────────
export const deleteRow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rowId } = req.params

    const rowToDelete = await prisma.inventoryRow.findUnique({
      where: { id: rowId },
      include: {
        table: {
          include: { fields: { orderBy: { order: 'asc' }, take: 1 } }
        }
      },
    })
    const rowData = rowToDelete?.data as Record<string, any>
    const firstField = rowToDelete?.table.fields[0]?.fieldName
    await logActivity({
      userId: (req as any).user.id,
      action: LOG_ACTIONS.DELETE_ROW,
      entityType: 'row',
      entityId: rowId,
      entityName: firstField ? String(rowData?.[firstField] ?? rowId.slice(0, 8)) : rowId.slice(0, 8),
      tableName: rowToDelete?.table.name,
      ipAddress: req.ip,
    })

    await prisma.inventoryRow.delete({ where: { id: rowId } })

    res.json({ success: true, data: { message: 'Row deleted successfully' } })
  } catch (error) {
    console.error('DeleteRow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
