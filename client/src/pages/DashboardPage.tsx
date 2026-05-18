import { useEffect, useState } from 'react'
import { reportsApi } from '../lib/api'
import {
  Table2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  FileStack,
  Activity,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useAuth } from '../context/AuthContext'

interface Movement {
  id: string
  fieldName: string
  type: 'restock' | 'deduction' | 'adjustment'
  delta: number
  note: string | null
  createdAt: string
  user: { name: string }
  table: { name: string }
}

interface TableSummary {
  id: string
  name: string
  rowCount: number
  lowStockCount: number
  fieldCount: number
}

interface DashboardData {
  totalTables: number
  totalRows: number
  totalMovements: number
  lowStockCount: number
  tablesSummary: TableSummary[]
  recentMovements: Movement[]
}

const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await reportsApi.getDashboard()
        setData(res.data.data)
      } catch (error) {
        console.error('Failed to fetch dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading dashboard...</div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Tables',
      value: data?.totalTables ?? 0,
      icon: Table2,
      color: 'bg-indigo-500',
      lightBg: 'bg-indigo-50 dark:bg-indigo-900/20',
      textColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Total Records',
      value: data?.totalRows ?? 0,
      icon: FileStack,
      color: 'bg-emerald-500',
      lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Stock Movements',
      value: data?.totalMovements ?? 0,
      icon: Activity,
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Low Stock Alerts',
      value: data?.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: 'bg-red-500',
      lightBg: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600 dark:text-red-400',
    },
  ]

  // Build area chart data from recent movements grouped by date
  const movementsByDate = (data?.recentMovements ?? []).reduce((acc: Record<string, number>, m) => {
    const date = new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    acc[date] = (acc[date] ?? 0) + 1
    return acc
  }, {})

  const areaChartData = Object.entries(movementsByDate).map(([date, count]) => ({
    date,
    Movements: count,
  }))

  // Pie chart data from tables summary
  const pieData = (data?.tablesSummary ?? []).map((t) => ({
    name: t.name,
    value: t.rowCount,
  }))

  const totalPieValue = pieData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
          Welcome back, {user?.name}! Here's what's happening today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {card.label}
                </p>
                <div className={`${card.lightBg} p-2 rounded-lg`}>
                  <Icon size={16} className={card.textColor} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {card.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Area Chart — takes 2/3 width */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
          <div className="mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Stock Movements Over Time
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Recent activity across all tables</p>
          </div>
          {areaChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No movement data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaChartData}>
                <defs>
                  <linearGradient id="colorMovements" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8892a4' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8892a4' }} width={25} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1d2e',
                    border: '1px solid #2a2d3e',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Movements"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorMovements)"
                  dot={{ fill: '#6366f1', r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart — takes 1/3 width */}
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
          <div className="mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Category Distribution
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {data?.totalTables ?? 0} active tables · {data?.totalRows ?? 0} records
            </p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No tables yet
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
                      {totalPieValue > 0
                        ? ((entry.value / totalPieValue) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Recent Items */}
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                Recents
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest activity across all tables</p>
            </div>
          </div>
          {data?.recentMovements.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              No recent activity
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[400px]">
                <thead>
                  <tr className="text-left border-b border-gray-100 dark:border-[#2a2d3e]">
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Table</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Field</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Added by</th>
                    <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-[#2a2d3e]">
                  {data?.recentMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-[#0f1117]">
                      <td className="py-2.5 font-medium text-gray-900 dark:text-white">{m.table.name}</td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">{m.fieldName}</td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">{m.user.name}</td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
          <div className="mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              Activity Feed
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Recent actions in inventory</p>
          </div>
          {data?.recentMovements.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              No activity yet
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data?.recentMovements.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    m.type === 'restock'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : m.type === 'deduction'
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    {m.type === 'restock' ? (
                      <TrendingUp size={12} className="text-emerald-600" />
                    ) : m.type === 'deduction' ? (
                      <TrendingDown size={12} className="text-red-600" />
                    ) : (
                      <Minus size={12} className="text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {m.user.name}{' '}
                      <span className="font-normal text-gray-500 dark:text-gray-400">
                        {m.type === 'restock' ? 'restocked' : m.type === 'deduction' ? 'deducted from' : 'adjusted'}{' '}
                        <span className="text-indigo-500">{m.table.name}</span>
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.fieldName} · {m.delta > 0 ? '+' : ''}{m.delta} · {new Date(m.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}