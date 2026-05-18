import { useEffect, useState } from 'react'
import { reportsApi } from '../lib/api'
import { AlertTriangle, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Alert {
  tableId: string
  tableName: string
  rowId: string
  rowData: Record<string, any>
  fieldName: string
  currentValue: number
  threshold: number
}

export default function AlertsPage() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await reportsApi.getLowStock()
        setAlerts(res.data.data)
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">Loading alerts...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Low Stock Alerts
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
          {alerts.length} item{alerts.length !== 1 ? 's' : ''} below threshold
        </p>
      </div>

      {/* Empty state */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl">
            <Package size={40} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-900 dark:text-white font-medium">All stock levels are good!</p>
            <p className="text-gray-400 text-sm mt-1">No items are below their threshold.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const percentage = Math.round((alert.currentValue / alert.threshold) * 100)
            const firstTwoFields = Object.entries(alert.rowData).slice(0, 2)

            return (
              <div
                key={index}
                onClick={() => navigate(`/tables/${alert.tableId}`)}
                className="bg-white dark:bg-[#1a1d2e] border border-gray-100 dark:border-[#2a2d3e] rounded-xl p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* Icon */}
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl shrink-0">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                      {alert.tableName}
                    </span>
                    <span className="text-xs text-gray-400">{alert.fieldName}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 truncate">
                    {firstTwoFields.map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full transition-all"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      {alert.currentValue} / {alert.threshold}
                    </span>
                  </div>
                </div>

                {/* Badge */}
                <div className="shrink-0 text-right">
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {alert.currentValue}
                  </span>
                  <p className="text-xs text-gray-400">current</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}