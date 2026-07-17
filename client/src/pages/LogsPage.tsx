import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { useToast } from '../context/ToastContext'
import { logsApi } from '../lib/api'
import { Search, X, RefreshCw, Shield, User, Table2, FileText, Key, Trash2, Plus, Pencil, Download } from 'lucide-react'

interface LogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  tableName: string | null
  details: any
  ipAddress: string | null
  createdAt: string
  user: { id: string; name: string; email: string; role: string }
}

interface LogStats {
  total: number
  last24h: number
  byAction: { action: string; _count: { action: number } }[]
  topUsers: { userId: string; name: string; count: number }[]
}

interface Pagination {
  page: number
  totalPages: number
  total: number
  hasNext: boolean
  hasPrev: boolean
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_ROW: 'Added Record',
  UPDATE_ROW: 'Updated Record',
  DELETE_ROW: 'Deleted Record',
  CREATE_TABLE: 'Created Table',
  UPDATE_TABLE: 'Updated Table',
  DELETE_TABLE: 'Deleted Table',
  ADD_FIELD: 'Added Field',
  UPDATE_FIELD: 'Updated Field',
  DELETE_FIELD: 'Deleted Field',
  CREATE_USER: 'Created User',
  DELETE_USER: 'Deleted User',
  RESET_PASSWORD: 'Reset Password',
  CHANGE_PASSWORD: 'Changed Password',
  LOGIN: 'Logged In',
  CREATE_PAF: 'Created PAF',
  UPDATE_PAF: 'Updated PAF',
  DELETE_PAF: 'Deleted PAF',
}

const ACTION_COLORS: Record<string, string> = {
  CREATE_ROW: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  UPDATE_ROW: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  DELETE_ROW: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CREATE_TABLE: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  UPDATE_TABLE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  DELETE_TABLE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  ADD_FIELD: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  UPDATE_FIELD: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  DELETE_FIELD: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CREATE_USER: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  DELETE_USER: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  RESET_PASSWORD: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  CHANGE_PASSWORD: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  LOGIN: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  CREATE_PAF: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  UPDATE_PAF: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  DELETE_PAF: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

const ACTION_ICONS: Record<string, any> = {
  CREATE_ROW: Plus, UPDATE_ROW: Pencil, DELETE_ROW: Trash2,
  CREATE_TABLE: Table2, UPDATE_TABLE: Table2, DELETE_TABLE: Trash2,
  ADD_FIELD: Plus, UPDATE_FIELD: Pencil, DELETE_FIELD: Trash2,
  CREATE_USER: User, DELETE_USER: Trash2,
  RESET_PASSWORD: Key, CHANGE_PASSWORD: Key,
  LOGIN: Shield,
  CREATE_PAF: FileText, UPDATE_PAF: FileText, DELETE_PAF: Trash2,
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const { showToast } = useToast();

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        logsApi.getLogs({ page, limit: 50, search, action: filterAction || undefined }),
        page === 1 ? logsApi.getStats() : Promise.resolve(null),
      ])
      setLogs(logsRes.data.data)
      setPagination(logsRes.data.pagination)
      if (statsRes) setStats(statsRes.data.data)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [page, search, filterAction])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setSearchInput('')
    setFilterAction('')
    setPage(1)
  }

  const handleExportLogs = async () => {
    try {
      const res = await logsApi.getLogs({ page: 1, limit: 999999 })
      const logs = res.data.data

      const worksheet = XLSX.utils.json_to_sheet(logs.map((log: any) => ({
        Time: new Date(log.createdAt).toLocaleString(),
        User: log.user.name,
        Email: log.user.email,
        Role: log.user.role,
        Action: ACTION_LABELS[log.action] ?? log.action,
        Target: log.entityName ?? '',
        Table: log.tableName ?? '',
        'IP Address': log.ipAddress ?? '',
      })))

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Logs')
      XLSX.writeFile(workbook, `activity_logs_${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('Logs exported successfully')
    } catch {
      showToast('Failed to export logs', 'error')
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Full audit trail — last 90 days · {pagination?.total ?? 0} total entries
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
        <button
          onClick={handleExportLogs}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          <Download size={14} />
          Export Logs
        </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Logs', value: stats.total, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Last 24 Hours', value: stats.last24h, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Most Active User', value: stats.topUsers[0]?.name ?? '—', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Most Common Action', value: ACTION_LABELS[stats.byAction[0]?.action] ?? '—', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
              <p className={`text-sm font-bold truncate ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search logs..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:placeholder-gray-500"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <button
          onClick={handleSearch}
          className="px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Search
        </button>

        {(search || filterAction) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-380px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 dark:border-[#2a2d3e] bg-gray-50 dark:bg-[#0f1117]">
                {['Time', 'User', 'Action', 'Target', 'IP Address'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2a2d3e]">
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-[#2a2d3e] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const Icon = ACTION_ICONS[log.action] ?? Shield
                  const colorClass = ACTION_COLORS[log.action] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#0f1117] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs text-gray-900 dark:text-white font-medium">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="bg-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {log.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900 dark:text-white">{log.user.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{log.user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${colorClass}`}>
                          <Icon size={11} />
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-900 dark:text-white">
                          {log.tableName && <span className="text-indigo-500">{log.tableName} → </span>}
                          {log.entityName ?? log.entityId?.slice(0, 8) ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {log.ipAddress ?? '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1a1d2e] border border-gray-100 dark:border-[#2a2d3e] rounded-xl">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> of{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.totalPages}</span>
            {' '}· {pagination.total} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors disabled:opacity-40 text-gray-600 dark:text-gray-400"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors disabled:opacity-40 text-gray-600 dark:text-gray-400"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}