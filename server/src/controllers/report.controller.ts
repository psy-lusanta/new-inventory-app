import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'

// ─── Low stock alerts ─────────────────────────────────────────────────────────
export const getLowStockAlerts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get all tables with their stock fields
    const tables = await prisma.inventoryTable.findMany({
      include: {
        fields: {
          where: { isStockField: true, lowStockThreshold: { not: null } },
        },
        rows: true,
      },
    })

    const alerts: any[] = []

    for (const table of tables) {
      for (const field of table.fields) {
        for (const row of table.rows) {
          const data = row.data as Record<string, any>
          const value = Number(data[field.fieldName] ?? 0)

          if (value <= field.lowStockThreshold!) {
            alerts.push({
              tableId: table.id,
              tableName: table.name,
              rowId: row.id,
              rowData: data,
              fieldName: field.fieldName,
              currentValue: value,
              threshold: field.lowStockThreshold,
            })
          }
        }
      }
    }

    res.json({ success: true, data: alerts })
  } catch (error) {
    console.error('GetLowStockAlerts error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Dashboard summary ────────────────────────────────────────────────────────
export const getDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Total tables
    const totalTables = await prisma.inventoryTable.count()

    // Total rows across all tables
    const totalRows = await prisma.inventoryRow.count()

    // Total stock movements
    const totalMovements = await prisma.stockMovement.count()

    // Recent stock movements (last 10)
    const recentMovements = await prisma.stockMovement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        table: { select: { id: true, name: true } },
      },
    })

    // Low stock count
    const tables = await prisma.inventoryTable.findMany({
      include: {
        fields: {
          where: { isStockField: true, lowStockThreshold: { not: null } },
        },
        rows: true,
      },
    })

    let lowStockCount = 0
    const tablesSummary: any[] = []

    for (const table of tables) {
      const rowCount = table.rows.length
      let lowStockInTable = 0

      for (const field of table.fields) {
        for (const row of table.rows) {
          const data = row.data as Record<string, any>
          const value = Number(data[field.fieldName] ?? 0)
          if (value <= field.lowStockThreshold!) {
            lowStockCount++
            lowStockInTable++
          }
        }
      }

      tablesSummary.push({
        id: table.id,
        name: table.name,
        rowCount,
        lowStockCount: lowStockInTable,
        fieldCount: table.fields.length,
      })
    }

    res.json({
      success: true,
      data: {
        totalTables,
        totalRows,
        totalMovements,
        lowStockCount,
        tablesSummary,
        recentMovements,
      },
    })
  } catch (error) {
    console.error('GetDashboard error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Stock movement history for a specific row ────────────────────────────────
export const getRowMovements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rowId } = req.params

    const movements = await prisma.stockMovement.findMany({
      where: { rowId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    res.json({ success: true, data: movements })
  } catch (error) {
    console.error('GetRowMovements error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Global Search ────────────────────────────────────────────────────────────
export const globalSearch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q } = req.query

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.json({ success: true, data: [] })
      return
    }

    const searchTerm = q.trim().toLowerCase()

    const tables = await prisma.inventoryTable.findMany({
      include: {
        fields: true,
        rows: true,
      },
    })

    const results: any[] = []

    for (const table of tables) {
      for (const row of table.rows) {
        const data = row.data as Record<string, any>

        // Check if any field value matches the search term
        const matches = Object.entries(data).some(([_key, value]) =>
          String(value).toLowerCase().includes(searchTerm)
        )

        if (matches) {
          results.push({
            tableId: table.id,
            tableName: table.name,
            rowId: row.id,
            data,
            fields: table.fields,
          })
        }
      }
    }

    res.json({ success: true, data: results })
  } catch (error) {
    console.error('GlobalSearch error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}