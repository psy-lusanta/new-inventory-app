import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'

// ─── Get all tables ───────────────────────────────────────────────────────────
export const getTables = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tables = await prisma.inventoryTable.findMany({
      include: { fields: { orderBy: { order: 'asc' } } },
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

    for (const field of fields) {
      if (!field.fieldName || !field.fieldType) {
        res.status(400).json({ success: false, error: 'Each field must have a name and type' })
        return
      }
      if (!['text', 'number', 'date', 'boolean'].includes(field.fieldType)) {
        res.status(400).json({ success: false, error: `Invalid field type: ${field.fieldType}` })
        return
      }
    }

    const table = await prisma.inventoryTable.create({
      data: {
        name,
        createdBy: userId,
        fields: {
          create: fields.map((field: any, index: number) => ({
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            required: field.required ?? false,
            isStockField: field.isStockField ?? false,
            lowStockThreshold: field.lowStockThreshold ?? null,
            order: index,
          })),
        },
      },
      include: { fields: { orderBy: { order: 'asc' } } },
    })

    res.status(201).json({ success: true, data: table })
  } catch (error) {
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

    const table = await prisma.inventoryTable.update({
      where: { id },
      data: { name },
      include: { fields: { orderBy: { order: 'asc' } } },
    })

    res.json({ success: true, data: table })
  } catch (error) {
    console.error('UpdateTable error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Delete table ─────────────────────────────────────────────────────────────
export const deleteTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    await prisma.inventoryTable.delete({ where: { id } })

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
    const { fieldName, fieldType, required, isStockField, lowStockThreshold } = req.body

    if (!fieldName || !fieldType) {
      res.status(400).json({ success: false, error: 'Field name and type are required' })
      return
    }

    if (!['text', 'number', 'date', 'boolean'].includes(fieldType)) {
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
        isStockField: isStockField ?? false,
        lowStockThreshold: lowStockThreshold ?? null,
        order: fieldCount,
      },
    })

    res.status(201).json({ success: true, data: field })
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
    const { fieldName, required, isStockField, lowStockThreshold } = req.body

    const field = await prisma.fieldDefinition.update({
      where: { id: fieldId },
      data: {
        ...(fieldName && { fieldName }),
        ...(required !== undefined && { required }),
        ...(isStockField !== undefined && { isStockField }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold }),
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

    await prisma.fieldDefinition.delete({ where: { id: fieldId } })

    res.json({ success: true, data: { message: 'Field deleted successfully' } })
  } catch (error) {
    console.error('DeleteField error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}