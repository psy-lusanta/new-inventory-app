import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tablesApi } from '../lib/api'
import { Table2, Settings, Trash2, ChevronRight, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface Field {
  id: string
  fieldName: string
  fieldType: string
  isStockField: boolean
  lowStockThreshold: number | null
}

interface InventoryTable {
  id: string
  name: string
  createdAt: string
  fields: Field[]
}

export default function TablesPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [tables, setTables] = useState<InventoryTable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchTables = async () => {
    try {
      const res = await tablesApi.getAll()
      setTables(res.data.data)
    } catch (error) {
      console.error('Failed to fetch tables:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will delete all its rows too.`)) return
    setDeletingId(id)
    try {
      await tablesApi.delete(id)
      setTables((prev) => prev.filter((t) => t.id !== id))
    } catch (error) {
      console.error('Failed to delete table:', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">Loading tables...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Tables
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
          {tables.length} table{tables.length !== 1 ? 's' : ''} in your inventory
        </p>
      </div>

      {/* Empty state */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl">
            <Table2 size={40} className="text-indigo-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-900 dark:text-white font-medium">No tables yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {isAdmin ? 'Click "New Table" in the navbar to create one.' : 'Ask an admin to create a table.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => {
            const stockFields = table.fields.filter((f) => f.isStockField)

            return (
              <div
                key={table.id}
                className="bg-white dark:bg-[#1a1d2e] border border-gray-100 dark:border-[#2a2d3e] rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => navigate(`/tables/${table.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-lg shrink-0">
                      <Table2 size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <ChevronRight size={16} className="text-gray-400 mt-0.5 shrink-0" />
                  </div>

                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-3">
                    {table.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Created {new Date(table.createdAt).toLocaleDateString()}
                  </p>

                  {/* Fields preview */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {table.fields.slice(0, 4).map((field) => (
                      <span
                        key={field.id}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#0f1117] text-gray-600 dark:text-gray-400"
                      >
                        {field.fieldName}
                      </span>
                    ))}
                    {table.fields.length > 4 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#0f1117] text-gray-500">
                        +{table.fields.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Stock fields */}
                  {stockFields.length > 0 && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {stockFields.length} stock field{stockFields.length > 1 ? 's' : ''} tracked
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Footer — admin actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 dark:border-[#2a2d3e]">
                    <button
                      onClick={() => navigate(`/tables/${table.id}/settings`)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <Settings size={13} />
                      Settings
                    </button>
                    <button
                      onClick={() => handleDelete(table.id, table.name)}
                      disabled={deletingId === table.id}
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-auto disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      {deletingId === table.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}