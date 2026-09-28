import { useEffect, useState } from 'react'
import { reportsApi } from '../lib/api'
import { DollarSign, Calendar, TrendingUp, Package } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface CostStats {
  year: number
  availableYears: number[]
  totalSpend: number
  monthlySpend: number
  yearlySpend: number
  byTable: { tableId: string; tableName: string; totalCost: number; rowCount: number }[]
  monthlyTrend: { month: string; total: number }[]
}

const PIE_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n)
const fmtCompact = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact' }).format(n)

export default function CostPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [stats, setStats] = useState<CostStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const res = await reportsApi.getCostStats(selectedYear)
        setStats(res.data.data)
      } catch (err) {
        console.error('Failed to fetch cost stats:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [selectedYear])

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 dark:bg-[#2a2d3e] rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-[#2a2d3e] rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-[#2a2d3e] rounded-xl" />
      </div>
    )
  }

  const isCurrentYear = selectedYear === currentYear
  const maxBar = Math.max(...(stats?.monthlyTrend ?? []).map((m) => m.total), 1)

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Cost History
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Purchase spending across all inventory tables
          </p>
        </div>

        {/* Year picker */}
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-gray-400" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {(stats?.availableYears ?? [currentYear]).map((year) => (
              <option key={year} value={year}>
                {year} {year === currentYear ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: `${selectedYear} Total Spend`,
            value: fmt(stats?.yearlySpend ?? 0),
            icon: DollarSign,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          },
          {
            label: isCurrentYear ? 'This Month' : 'Monthly Average',
            value: isCurrentYear
              ? fmt(stats?.monthlySpend ?? 0)
              : fmt((stats?.yearlySpend ?? 0) / 12),
            icon: TrendingUp,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          },
          {
            label: 'Tables with Costs',
            value: String(stats?.byTable.length ?? 0),
            icon: Package,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{card.label}</p>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon size={15} className={card.color} />
                </div>
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Monthly trend */}
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Monthly Spend — {selectedYear}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Total cost of items added per month
            </p>
          </div>
          {(stats?.monthlyTrend ?? []).every((m) => m.total === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No cost data for {selectedYear}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats?.monthlyTrend ?? []}>
                <defs>
                  <linearGradient id="costAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8892a4' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#8892a4' }}
                  width={60}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmtCompact(v)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}
                  formatter={(v: number) => [fmt(v), 'Spend']}
                  cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#costAreaGrad)"
                  dot={{ fill: '#6366f1', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cost by table */}
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Cost by Table — {selectedYear}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedYear} total: <span className="font-semibold text-indigo-500">{fmt(stats?.yearlySpend ?? 0)}</span>
            </p>
          </div>
          {(stats?.byTable ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              No cost data for {selectedYear}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={stats?.byTable ?? []}
                layout="vertical"
                margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#8892a4' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmtCompact(v)}
                />
                <YAxis
                  type="category"
                  dataKey="tableName"
                  tick={{ fontSize: 10, fill: '#8892a4' }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }}
                  formatter={(v: number) => [fmt(v), 'Spend']}
                  cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                />
                <Bar dataKey="totalCost" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {(stats?.byTable ?? []).map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed breakdown table */}
      {(stats?.byTable ?? []).length > 0 && (
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Breakdown — {selectedYear}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#0f1117] border-b border-gray-100 dark:border-[#2a2d3e]">
                  {['Table', 'Records', 'Total Cost', 'Share', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#2a2d3e]">
                {(stats?.byTable ?? []).map((table, index) => {
                  const share = stats!.yearlySpend > 0
                    ? ((table.totalCost / stats!.yearlySpend) * 100).toFixed(1)
                    : '0'
                  const maxCost = Math.max(...(stats?.byTable ?? []).map((t) => t.totalCost), 1)
                  return (
                    <tr key={table.tableId} className="hover:bg-gray-50 dark:hover:bg-[#0f1117] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                          <span className="font-medium text-gray-900 dark:text-white">{table.tableName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {table.rowCount} records
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white">
                        {fmt(table.totalCost)}
                      </td>
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                        {share}%
                      </td>
                      <td className="px-5 py-3 w-32">
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(table.totalCost / maxCost) * 100}%`,
                              backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-[#2a2d3e] bg-gray-50 dark:bg-[#0f1117]">
                  <td className="px-5 py-3 font-semibold text-gray-700 dark:text-gray-300">Total</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                    {(stats?.byTable ?? []).reduce((s, t) => s + t.rowCount, 0)} records
                  </td>
                  <td className="px-5 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                    {fmt(stats?.yearlySpend ?? 0)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (stats?.byTable ?? []).length === 0 && (
        <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-12 text-center">
          <DollarSign size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No cost data for {selectedYear}</p>
          <p className="text-gray-400 text-sm mt-1">
            {selectedYear === currentYear
              ? 'Add cost values when creating inventory records to track spending.'
              : 'No records with cost values were created in this year.'}
          </p>
        </div>
      )}
    </div>
  )
}