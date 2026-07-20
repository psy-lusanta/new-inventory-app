import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'
import { success } from 'zod/v4'
import { logActivity, LOG_ACTIONS } from '../lib/logger.activity'

// ─── Get all tables ───────────────────────────────────────────────────────────
export const getTables = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tables = await prisma.inventoryTable.findMany({
      include: {
        fields: { orderBy: { order: 'asc' } },
        _count: { select: { rows: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: tables })
  } catch (error) {
    console.error('GetTables error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Get single table ─────────────────────────────────────────────────────────
export const getTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const table = await prisma.inventoryTable.findUnique({
      where: { id },
      include: { fields: { orderBy: { order: 'asc' } } },
    })

    if (!table) {
      res.status(404).json({ success: false, error: 'Table not found' })
      return
    }

    res.json({ success: true, data: table })
  } catch (error) {
    console.error('GetTable error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Create table ─────────────────────────────────────────────────────────────
export const createTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, fields } = req.body
    const userId = req.user!.id

    if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
      res.status(400).json({ success: false, error: 'Table name and at least one field are required' })
      return
    }

    // Check duplicate table name
    const existing = await prisma.inventoryTable.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    if (existing) {
      res.status(400).json({ success: false, error: `A table named "${existing.name}" already exists` })
      return
    }

    // Validate user-defined fields
    for (const field of fields) {
      if (!field.fieldName || !field.fieldType) {
        res.status(400).json({ success: false, error: 'Each field must have a name and type' })
        return
      }
      if (!['text', 'number', 'date', 'boolean', 'dropdown'].includes(field.fieldType)) {
        res.status(400).json({ success: false, error: `Invalid field type: ${field.fieldType}` })
        return
      }
    }

    // Auto-inject Cost field at the end — always required, always number
    const costFieldExists = fields.some(
      (f: any) => f.fieldName.toLowerCase().replace(/\s/g, '') === 'cost'
    )

    const allFields = costFieldExists ? fields : [
      ...fields,
      {
        fieldName: 'Cost',
        fieldType: 'number',
        required: false,
        isStockField: false,
        lowStockThreshold: null,
        options: null,
      },
    ]

    const table = await prisma.inventoryTable.create({
      data: {
        name,
        createdBy: userId,
        fields: {
          create: allFields.map((field: any, index: number) => ({
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            required: field.required ?? false,
            isUnique: field.isUnique ?? false,
            isStockField: field.isStockField ?? false,
            lowStockThreshold: field.lowStockThreshold ?? null,
            options: field.options ?? null,
            order: index,
          })),
        },
      },
      include: { fields: { orderBy: { order: 'asc' } } },
    })

    res.status(201).json({ success: true, data: table })
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'Two fields cannot have the same name' })
      return
    }
    console.error('CreateTable error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Update table name ────────────────────────────────────────────────────────
export const updateTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name } = req.body

    if (!name) {
      res.status(400).json({ success: false, error: 'Table name is required' })
      return
    }

    // Check for duplicate table name (case-insensitive, exclude current table)
    const existing = await prisma.inventoryTable.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id },
      },
    })
    if (existing) {
      res.status(400).json({ success: false, error: `A table named "${existing.name}" already exists` })
      return
    }

    const table = await prisma.inventoryTable.update({
      where: { id },
      data: { name },
      include: { fields: { orderBy: { order: 'asc' } } },
    })

    res.json({ success: true, data: table })

    await logActivity({
      userId: (req as any).user.id,
      action: LOG_ACTIONS.UPDATE_TABLE,
      entityType: 'table',
      entityId: id,
      entityName: name,
      ipAddress: req.ip,
    })
  } catch (error) {
    console.error('UpdateTable error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Delete table ─────────────────────────────────────────────────────────────
export const deleteTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if table has any rows
    const rowCount = await prisma.inventoryRow.count({ where: { tableId: id } })
    if (rowCount > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete this table — it still has ${rowCount} record${rowCount > 1 ? 's' : ''}. Please remove all records first.`
      })
      return
    }

    // Safe to delete — no rows exist
    await prisma.stockMovement.deleteMany({ where: { tableId: id } })
    await prisma.fieldDefinition.deleteMany({ where: { tableId: id } })
    await prisma.inventoryTable.delete({ where: { id } })

    const tableToDelete = await prisma.inventoryTable.findUnique({ where: { id } })
    await logActivity({
      userId: (req as any).user.id,
      action: LOG_ACTIONS.DELETE_TABLE,
      entityType: 'table',
      entityId: id,
      entityName: tableToDelete?.name,
      ipAddress: req.ip,
    })

    res.json({ success: true, data: { message: 'Table deleted successfully' } })
  } catch (error) {
    console.error('DeleteTable error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Add field to existing table ──────────────────────────────────────────────
export const addField = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { fieldName, fieldType, required, isUnique, isStockField, lowStockThreshold, options } = req.body

    if (!fieldName || !fieldType) {
      res.status(400).json({ success: false, error: 'Field name and type are required' })
      return
    }

    if (!['text', 'number', 'date', 'boolean', 'dropdown'].includes(fieldType)) {
      res.status(400).json({ success: false, error: `Invalid field type: ${fieldType}` })
      return
    }

    const fieldCount = await prisma.fieldDefinition.count({ where: { tableId: id } })

    const field = await prisma.fieldDefinition.create({
      data: {
        tableId: id,
        fieldName,
        fieldType,
        required: required ?? false,
        isUnique: isUnique ?? false,
        isStockField: isStockField ?? false,
        lowStockThreshold: lowStockThreshold ?? null,
        options: options ?? null,
        order: fieldCount,
      },
    })

    res.status(201).json({ success: true, data: field })

    await logActivity({
      userId: (req as any).user.id,
      action: LOG_ACTIONS.ADD_FIELD,
      entityType: 'field',
      entityId: field.id,
      entityName: fieldName,
      details: { tableId: id, fieldType },
      ipAddress: req.ip,
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ success: false, error: 'A field with that name already exists in this table' })
      return
    }
    console.error('AddField error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Update field ─────────────────────────────────────────────────────────────
export const updateField = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fieldId } = req.params
    const { fieldName, fieldType, required, isStockField, lowStockThreshold, options } = req.body

    // Check for duplicate field name in same table
    if (fieldName) {
      const existingField = await prisma.fieldDefinition.findFirst({
        where: {
          id: { not: fieldId },
          fieldName: { equals: fieldName, mode: 'insensitive' },
          table: { fields: { some: { id: fieldId } } },
        },
      })
      if (existingField) {
        res.status(400).json({ success: false, error: `A field named "${fieldName}" already exists in this table` })
        return
      }
    }

    const field = await prisma.fieldDefinition.update({
      where: { id: fieldId },
      data: {
        ...(fieldName && { fieldName }),
        ...(fieldType && { fieldType }),
        ...(required !== undefined && { required }),
        ...(isStockField !== undefined && { isStockField }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold }),
        ...(options !== undefined && { options }),
      },
    })

    res.json({ success: true, data: field })
  } catch (error) {
    console.error('UpdateField error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Delete field ─────────────────────────────────────────────────────────────
export const deleteField = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fieldId } = req.params

    const field = await prisma.fieldDefinition.findUnique({
      where: { id: fieldId },
      include: { table: { include: { rows: true } } },
    })

    if (!field) {
      res.status(404).json({ success: false, error: 'Field not found' })
      return
    }

    // Block deletion of required fields
    if (field.required) {
      res.status(400).json({
        success: false,
        error: `"${field.fieldName}" is a required field and cannot be deleted. Remove the required constraint first.`
      })
      return
    }

    // Check if any row has data in this field
    const rowsWithData = field.table.rows.filter((row) => {
      const data = row.data as Record<string, any>
      return data[field.fieldName] !== undefined &&
        data[field.fieldName] !== null &&
        data[field.fieldName] !== ''
    })

    if (rowsWithData.length > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot delete "${field.fieldName}" — ${rowsWithData.length} record${rowsWithData.length > 1 ? 's' : ''} still have data in this field`,
      })
      return
    }

    await prisma.fieldDefinition.delete({ where: { id: fieldId } })
    res.json({ success: true, data: { message: 'Field deleted successfully' } })
  } catch (error) {
    console.error('DeleteField error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Reorder fields ─────────────────────────────────────────────────────────────
export const reorderFields = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { fieldIds } = req.body // ordered array of field IDs

    if (!Array.isArray(fieldIds)) {
      res.status(400).json({ success: false, error: 'fieldIds must be an array' })
      return
    }

    // Update order for each field
    await Promise.all(
      fieldIds.map((fieldId: string, index: number) =>
        prisma.fieldDefinition.update({
          where: { id: fieldId },
          data: { order: index },
        })
      )
    )

    const table = await prisma.inventoryTable.findUnique({
      where: { id },
      include: { fields: { orderBy: { order: 'asc' } } },
    })

    res.json({ success: true, data: table })
  } catch (error) {
    console.error('ReorderFields error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}