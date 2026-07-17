import { useEffect, useState } from 'react'
import { costApi, reportsApi } from '../lib/api'
import {
  Table2,
  Settings2,
  X,
  Check,
  Trophy,
  Clock,
  PlusCircle,
  PencilLine,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { useAuth } from '../context/AuthContext'

interface MonthlyMovement {
  month: string
  count: number
}

interface TableSummary {
  id: string
  name: string
  rowCount: number
  lowStockCount: number
  fieldCount: number
}

interface ActivityItem {
  id: string
  tableName: string
  action: 'created' | 'updated'
  actorName: string
  timestamp: string
}

interface DashboardData {
  totalTables: number
  totalRows: number
  totalMovements: number
  lowStockCount: number
  tablesSummary: TableSummary[]
  recentActivity: ActivityItem[]
}

interface DropdownStat {
  tableId: string
  tableName: string
  fieldName: string
  options: { label: string; color: string; count: number }[]
  total: number
}

interface AssetTagStat {
  tableId: string
  tableName: string
  fieldName: string
  count: number
  total: number
}

interface CostStats {
  totalSpend: number
  monthlySpend: number
  yearlySpend: number
  byTable: { tableId: string; tableName: string; totalCost: number }[]
  monthlyTrend: { month: string; total: number }[]
}

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<MonthlyMovement[]>([])

  // ─── Tile selection (4 tables) ────────────────────────────────────────────
  const [selectedTiles, setSelectedTiles] = useState<string[]>([])
  const [showTilePicker, setShowTilePicker] = useState(false)

  // ─── Pie selection (up to 5 tables) ───────────────────────────────────────
  const [selectedPieTables, setSelectedPieTables] = useState<string[]>([])
  const [showPiePicker, setShowPiePicker] = useState(false)

  const [dropdownStats, setDropdownStats] = useState<DropdownStat[]>([])
  const [assetTagStats, setAssetTagStats] = useState<AssetTagStat[]>([])
  const [costStats, setCostStats] = useState<CostStats | null>(null)


  const tileStorageKey = `dashboard-tiles:${user?.id}`
  const pieStorageKey = `dashboard-pie:${user?.id}`

  const recentActivities = data?.recentActivity?.slice(0, 4) ?? []

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, monthlyRes, dropdownRes, assetRes, costRes] = await Promise.all([
          reportsApi.getDashboard(),
          reportsApi.getMonthlyMovements(),
          reportsApi.getDropdownStats(),
          reportsApi.getAssetTagStats(),
          costApi.getStats(),
        ])

        const dashboard = dashRes.data.data
        setData(dashboard)
        setMonthlyData(monthlyRes.data.data)
        setDropdownStats(dropdownRes.data.data)
        setAssetTagStats(assetRes.data.data)
        setCostStats(costRes.data.data)


        // Load saved tile preferences
        const savedTiles = localStorage.getItem(tileStorageKey)
        if (savedTiles) {
          try {
            const parsed = JSON.parse(savedTiles)
            const valid = parsed.filter((id: string) =>
              dashboard.tablesSummary.some((t: any) => t.id === id)
            )
            setSelectedTiles(valid)
          } catch {
            setSelectedTiles(dashboard.tablesSummary.slice(0, 4).map((t: any) => t.id))
          }
        } else {
          setSelectedTiles(dashboard.tablesSummary.slice(0, 4).map((t: any) => t.id))
        }

        // Load saved pie preferences
        const savedPie = localStorage.getItem(pieStorageKey)
        if (savedPie) {
          try {
            const parsed = JSON.parse(savedPie)
            const valid = parsed.filter((id: string) =>
              dashboard.tablesSummary.some((t: any) => t.id === id)
            )
            setSelectedPieTables(valid)
          } catch {
            setSelectedPieTables(dashboard.tablesSummary.slice(0, 5).map((t: any) => t.id))
          }
        } else {
          setSelectedPieTables(dashboard.tablesSummary.slice(0, 5).map((t: any) => t.id))
        }

      } catch (error) {
        console.error('Failed to fetch dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const toggleTile = (tableId: string) => {
    setSelectedTiles((prev) => {
      let updated: string[]
      if (prev.includes(tableId)) {
        updated = prev.filter((id) => id !== tableId)
      } else {
        if (prev.length >= 4) return prev // max 4
        updated = [...prev, tableId]
      }
      localStorage.setItem(tileStorageKey, JSON.stringify(updated))
      return updated
    })
  }

  const togglePieTable = (tableId: string) => {
    setSelectedPieTables((prev) => {
      let updated: string[]
      if (prev.includes(tableId)) {
        updated = prev.filter((id) => id !== tableId)
      } else {
        if (prev.length >= 5) return prev // max 5
        updated = [...prev, tableId]
      }
      localStorage.setItem(pieStorageKey, JSON.stringify(updated))
      return updated
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading dashboard...</div>
      </div>
    )
  }

  const tilesTableData = (data?.tablesSummary ?? []).filter((t) => selectedTiles.includes(t.id))

  const pieData = (data?.tablesSummary ?? [])
    .filter((t) => selectedPieTables.includes(t.id))
    .map((t) => ({ name: t.name, value: t.rowCount }))

  const totalPieValue = pieData.reduce((sum, d) => sum + d.value, 0)

  // Top 3 tables by row count
  const topTables = [...(data?.tablesSummary ?? [])]
    .sort((a, b) => b.rowCount - a.rowCount)
    .slice(0, 3)
  const maxRowCount = topTables[0]?.rowCount || 1

  return (
    <div className="custom-scrollbar p-4 sm:p-6 space-y-4 sm:space-y-6 mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
          Welcome back, {user?.name}! Here's what's happening today.
        </p>
      </div>

      {/* Stat Tiles */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Your Tables
          </p>
          <button
            onClick={() => setShowTilePicker(true)}
            className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
          >
            <Settings2 size={13} />
            Customize
          </button>
        </div>

        {tilesTableData.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-6 text-center">
            <p className="text-sm text-gray-400">No tables selected. Click Customize to pick up to 4.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {tilesTableData.map((table, index) => (
              <div
                key={table.id}
                className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                    {table.name}
                  </p>
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ backgroundColor: `${PIE_COLORS[index % PIE_COLORS.length]}20` }}
                  >
                    <Table2 size={16} style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {table.rowCount}
                </p>
                <p className="text-xs text-gray-400 mt-1">records</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
          <div className="mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Items Added — {new Date().getFullYear()}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Total records added per month across all tables
            </p>
          </div>
          {monthlyData.every((m) => m.count === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={4}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#8892a4' }}
                  interval={window.innerWidth < 640 ? 1 : 0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#8892a4' }} width={25} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1d2e',
                    border: '1px solid #2a2d3e',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  formatter={(value) => [`${value} records`, 'Added']}
                />
                <Bar dataKey="count" name="Records Added" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                Category Distribution
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {pieData.length} of {data?.totalTables ?? 0} tables shown
              </p>
            </div>
            <button
              onClick={() => setShowPiePicker(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors shrink-0"
              title="Customize"
            >
              <Settings2 size={15} />
            </button>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No tables selected
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1d2e',
                      border: '1px solid #2a2d3e',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                      {totalPieValue > 0 ? ((entry.value / totalPieValue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>


      {/* Cost Summary */}
      {costStats && (costStats.totalSpend > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Monthly cost trend */}
          <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  Monthly Spend
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date().getFullYear()} · Total: {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(costStats.yearlySpend)}
                </p>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(costStats.monthlySpend)} this month
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={costStats.monthlyTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8892a4' }} />
                <YAxis tick={{ fontSize: 10, fill: '#8892a4' }} width={55}
                  tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}
                  formatter={(value: number) => [new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value), 'Spend']}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {costStats.monthlyTrend.map((_, index) => (
                    <Cell key={index} fill={index === new Date().getMonth() ? '#10b981' : '#6ee7b7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost by table */}
          <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-4">
              Cost by Table
            </h2>
            <div className="space-y-3">
              {costStats.byTable.slice(0, 5).map((table, index) => {
                const max = Math.max(...costStats.byTable.map((t) => t.totalCost), 1)
                return (
                  <div key={table.tableId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="text-sm text-gray-800 dark:text-gray-200 truncate max-w-[160px]">{table.tableName}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(table.totalCost)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(table.totalCost / max) * 100}%`, backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2a2d3e] flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Grand Total</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(costStats.totalSpend)}
              </span>
            </div>
          </div>
        </div>
      )}


      {/* Overall Records by Table */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Overall Records
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {data?.totalRows ?? 0} total records across {data?.totalTables ?? 0} tables
            </p>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {data?.totalRows ?? 0}
          </div>
        </div>

        {(data?.tablesSummary ?? []).length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
            No tables yet
          </div>
        ) : (
          <div className="space-y-3">
            {[...(data?.tablesSummary ?? [])]
              .sort((a, b) => b.rowCount - a.rowCount)
              .map((table, index) => {
                const maxCount = Math.max(...(data?.tablesSummary ?? []).map((t) => t.rowCount), 1)
                const percentage = maxCount > 0 ? (table.rowCount / maxCount) * 100 : 0
                const total = data?.totalRows ?? 0
                const share = total > 0 ? ((table.rowCount / total) * 100).toFixed(1) : '0'

                return (
                  <div key={table.id} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                          {table.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400">{share}%</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">
                          {table.rowCount}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Dropdown Status Dashboard */}
      {dropdownStats.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Dropdown Field Distribution
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Status breakdown across all dropdown fields</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dropdownStats.map((stat) => (
              <div key={`${stat.tableId}-${stat.fieldName}`} className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 border border-gray-100 dark:border-[#2a2d3e]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{stat.tableName}</h4>
                    <h3 className="text-xs text-gray-500 dark:text-gray-400">{stat.fieldName}</h3>
                    <p className="text-xs text-gray-400">{stat.total} records</p>
                  </div>
                </div>

                {/* Summary counts */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {stat.options.map((opt) => (
                    <div
                      key={opt.label}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${opt.color}20`,
                        color: opt.color,
                        border: `1px solid ${opt.color}40`,
                      }}
                    >
                      <span>{opt.label}</span>
                      <span className="font-bold">{opt.count}</span>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="space-y-2">
                  {stat.options.map((opt) => (
                    <div key={opt.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">{opt.label}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {stat.total > 0 ? ((opt.count / stat.total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: stat.total > 0 ? `${(opt.count / stat.total) * 100}%` : '0%',
                            backgroundColor: opt.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini pie */}
                {stat.total > 0 && (
                  <div className="mt-3 flex justify-center">
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={stat.options.map((o) => ({ name: o.label, value: o.count }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {stat.options.map((opt) => (
                            <Cell key={opt.label} fill={opt.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Row: Top Tables + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Top Tables Meter */}
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-amber-500" />
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Top Tables by Volume
            </h2>
          </div>
          {topTables.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              No tables yet
            </div>
          ) : (
            <div className="space-y-4">
              {topTables.map((table, index) => (
                <div key={table.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${index === 0
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : index === 1
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          : 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400'
                        }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {table.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {table.rowCount} records
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(table.rowCount / maxRowCount) * 100}%`,
                        backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-indigo-500" />
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
          </div>
          {recentActivities.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivities.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${item.action === 'created'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}
                  >
                    {item.action === 'created' ? (
                      <PlusCircle
                        size={13}
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                    ) : (
                      <PencilLine
                        size={13}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {item.actorName}{' '}
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        {item.action === 'created'
                          ? 'added a record to'
                          : 'updated a record in'}{' '}
                        <span className="text-indigo-500">{item.tableName}</span>
                      </span>
                    </p>

                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tile Picker Modal */}
      {
        showTilePicker && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Customize Tiles</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Pick up to 4 tables ({selectedTiles.length}/4)</p>
                </div>
                <button onClick={() => setShowTilePicker(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-2 max-h-80 overflow-y-auto">
                {data?.tablesSummary.map((table) => {
                  const isSelected = selectedTiles.includes(table.id)
                  const isDisabled = !isSelected && selectedTiles.length >= 4
                  return (
                    <button
                      key={table.id}
                      onClick={() => toggleTile(table.id)}
                      disabled={isDisabled}
                      className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${isDisabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2d3e]'
                        }`}
                    >
                      <span>{table.name}</span>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                        {isSelected && <Check size={11} className="text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
                <button
                  onClick={() => setShowTilePicker(false)}
                  className="w-full py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Pie Picker Modal */}
      {
        showPiePicker && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Customize Pie Chart</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Pick up to 5 tables ({selectedPieTables.length}/5)</p>
                </div>
                <button onClick={() => setShowPiePicker(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-2 max-h-80 overflow-y-auto">
                {data?.tablesSummary.map((table) => {
                  const isSelected = selectedPieTables.includes(table.id)
                  const isDisabled = !isSelected && selectedPieTables.length >= 5
                  return (
                    <button
                      key={table.id}
                      onClick={() => togglePieTable(table.id)}
                      disabled={isDisabled}
                      className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${isDisabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2d3e]'
                        }`}
                    >
                      <span>{table.name}</span>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                        {isSelected && <Check size={11} className="text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
                <button
                  onClick={() => setShowPiePicker(false)}
                  className="w-full py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}