import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'

// ─── Get all rows for a table ─────────────────────────────────────────────────
export const getRows = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tableId } = req.params

    const rows = await prisma.inventoryRow.findMany({
      where: { tableId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    // Attach updatedBy user info
    const rowsWithUsers = await Promise.all(
      rows.map(async (row) => {
        let updatedByUser = null
        if (row.updatedBy) {
          updatedByUser = await prisma.user.findUnique({
            where: { id: row.updatedBy },
            select: { id: true, name: true, email: true },
          })
        }
        return {
          ...row,
          updatedByUser,
        }
      })
    )

    res.json({ success: true, data: rowsWithUsers })
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

    // Validate against table field definitions
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

    // Log stock movement if any stock fields are present
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

    // Check stock field changes and log movements
    const table = await prisma.inventoryTable.findUnique({
      where: { id: tableId },
      include: { fields: true },
    })

    if (table) {
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

    res.json({ success: true, data: { ...updated, updatedByUser } })
  } catch (error) {
    console.error('UpdateRow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Delete row ───────────────────────────────────────────────────────────────
export const deleteRow = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rowId } = req.params

    await prisma.inventoryRow.delete({ where: { id: rowId } })

    res.json({ success: true, data: { message: 'Row deleted successfully' } })
  } catch (error) {
    console.error('DeleteRow error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}