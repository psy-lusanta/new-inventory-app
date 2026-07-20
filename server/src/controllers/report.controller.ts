import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth.middleware'
import prisma from '../lib/prisma'
import { cache } from '../lib/cache'

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
    const cacheKey = 'dashboard'
    const cached = cache.get(cacheKey)
    if (cached) {
      res.json({ success: true, data: cached, cached: true })
      return
    }

    const totalTables = await prisma.inventoryTable.count()
    const totalRows = await prisma.inventoryRow.count()
    const totalMovements = await prisma.stockMovement.count()

    const tables = await prisma.inventoryTable.findMany({
      include: {
        fields: { where: { isStockField: true, lowStockThreshold: { not: null } } },
        rows: true,
      },
    })

    let lowStockCount = 0
    const tablesSummary = tables.map((table) => {
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
      return {
        id: table.id,
        name: table.name,
        rowCount: table.rows.length,
        lowStockCount: lowStockInTable,
        fieldCount: table.fields.length,
      }
    })

    const recentRows = await prisma.inventoryRow.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        table: { select: { id: true, name: true } },
      },
    })

    const recentActivity = await Promise.all(
      recentRows.map(async (row) => {
        let updatedByUser = null
        if (row.updatedBy) {
          updatedByUser = await prisma.user.findUnique({
            where: { id: row.updatedBy },
            select: { name: true },
          })
        }
        return {
          id: row.id,
          tableName: row.table.name,
          action: row.updatedBy ? 'updated' : 'created',
          actorName: row.updatedBy ? (updatedByUser?.name ?? 'Unknown') : row.user.name,
          timestamp: row.updatedBy ? row.updatedAt : row.createdAt,
        }
      })
    )

    const result = { totalTables, totalRows, totalMovements, lowStockCount, tablesSummary, recentActivity }
    cache.set(cacheKey, result, 30) // cache 30 seconds

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('GetDashboard error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export const getMonthlyMovements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = `monthly-${new Date().getFullYear()}`
    const cached = cache.get(cacheKey)
    if (cached) {
      res.json({ success: true, data: cached, cached: true })
      return
    }

    const year = new Date().getFullYear()
    const rows = await prisma.inventoryRow.findMany({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
      select: { createdAt: true },
    })

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlyData = months.map((month, index) => ({
      month,
      count: rows.filter((r) => new Date(r.createdAt).getMonth() === index).length,
    }))

    cache.set(cacheKey, monthlyData, 300) // cache 5 minutes
    res.json({ success: true, data: monthlyData })
  } catch (error) {
    console.error('GetMonthlyMovements error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Global Search ────────────────────────────────────────────────────────
export const globalSearch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q } = req.query
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.json({ success: true, data: [] })
      return
    }

    const searchTerm = `%${q.trim()}%`

    const results = await prisma.$queryRaw<any[]>`
      SELECT
        ir.id as "rowId",
        ir.data,
        it.id as "tableId",
        it.name as "tableName"
      FROM "InventoryRow" ir
      JOIN "InventoryTable" it ON ir."tableId" = it.id
      WHERE ir.data::text ILIKE ${searchTerm}
      LIMIT 20
    `

    res.json({ success: true, data: results })
  } catch (error) {
    console.error('GlobalSearch error:', error)
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

// ─── Dropdown field distribution ──────────────────────────────────────────────
export const getDropdownStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = 'dropdown-stats'
    const cached = cache.get(cacheKey)
    if (cached) { res.json({ success: true, data: cached }); return }

    const tables = await prisma.inventoryTable.findMany({
      include: {
        fields: { where: { fieldType: 'dropdown' } },
        rows: true,
      },
    })

    const result: any[] = []

    for (const table of tables) {
      for (const field of table.fields) {
        const options = (field.options as any[]) ?? []
        if (options.length === 0) continue

        const counts: Record<string, number> = {}
        options.forEach((o) => { counts[o.label] = 0 })

        for (const row of table.rows) {
          const data = row.data as Record<string, any>
          const value = data[field.fieldName]
          if (value && counts[value] !== undefined) counts[value]++
          else if (value) counts[value] = (counts[value] ?? 0) + 1
        }

        result.push({
          tableId: table.id,
          tableName: table.name,
          fieldName: field.fieldName,
          options: options.map((o: any) => ({
            label: o.label,
            color: o.color,
            count: counts[o.label] ?? 0,
          })),
          total: table.rows.length,
        })
      }
    }

    cache.set(cacheKey, result, 60)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('GetDropdownStats error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Asset tag counts per table ───────────────────────────────────────────────
export const getAssetTagStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = 'asset-tag-stats'
    const cached = cache.get(cacheKey)
    if (cached) { res.json({ success: true, data: cached }); return }

    const tables = await prisma.inventoryTable.findMany({
      include: {
        fields: true,
        rows: true,
      },
    })

    const result = tables
      .map((table) => {
        // Find a field that looks like an asset tag
        const assetField = table.fields.find((f) =>
          f.fieldName.toLowerCase().replace(/[\s_\-]/g, '').includes('assettag') ||
          f.fieldName.toLowerCase().replace(/[\s_\-]/g, '').includes('asset')
        )
        if (!assetField) return null

        const count = table.rows.filter((row) => {
          const data = row.data as Record<string, any>
          const val = data[assetField.fieldName]
          return val !== undefined && val !== null && val !== ''
        }).length

        return {
          tableId: table.id,
          tableName: table.name,
          fieldName: assetField.fieldName,
          count,
          total: table.rows.length,
        }
      })
      .filter(Boolean)

    cache.set(cacheKey, result, 60)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('GetAssetTagStats error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

// ─── Cost stats per table ─────────────────────────────────────────────────────
export const getCostStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = 'cost-stats'
    const cached = cache.get(cacheKey)
    if (cached) { res.json({ success: true, data: cached }); return }

    const now = new Date()
    const year = now.getFullYear()
    const monthStart = new Date(year, now.getMonth(), 1)
    const yearStart = new Date(year, 0, 1)

    // Get all rows across all tables that have a Cost field
    const tables = await prisma.inventoryTable.findMany({
      include: {
        fields: { where: { fieldName: { equals: 'Cost', mode: 'insensitive' } } },
        rows: { select: { data: true, createdAt: true } },
      },
    })

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    let totalSpend = 0
    let monthlySpend = 0
    let yearlySpend = 0
    const byTable: any[] = []
    const monthlyTrend = months.map((month) => ({ month, total: 0 }))

    for (const table of tables) {
      if (table.fields.length === 0) continue // no Cost field

      const costFieldName = table.fields[0].fieldName
      let tableCost = 0
      let tableMonthCost = 0

      for (const row of table.rows) {
        const data = row.data as Record<string, any>
        const cost = Number(data[costFieldName] ?? 0)
        if (isNaN(cost)) continue

        tableCost += cost
        totalSpend += cost

        const rowDate = new Date(row.createdAt)
        const monthIndex = rowDate.getMonth()

        if (rowDate >= monthStart) monthlySpend += cost
        if (rowDate >= yearStart) {
          yearlySpend += cost
          if (rowDate.getFullYear() === year) {
            monthlyTrend[monthIndex].total += cost
            tableMonthCost += cost
          }
        }
      }

      if (tableCost > 0) {
        byTable.push({
          tableId: table.id,
          tableName: table.name,
          totalCost: tableCost,
          monthCost: tableMonthCost,
          rowCount: table.rows.length,
        })
      }
    }

    byTable.sort((a, b) => b.totalCost - a.totalCost)

    const result = { totalSpend, monthlySpend, yearlySpend, byTable, monthlyTrend }
    cache.set(cacheKey, result, 60)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('getCostStats error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}