import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { tablesApi } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { useModal } from '../../context/ModalContext'

interface Field {
  fieldName: string
  fieldType: 'text' | 'number' | 'date' | 'boolean'
  required: boolean
  isStockField: boolean
  lowStockThreshold: number | null
}

interface Props {
  onClose: () => void
}

export default function CreateTableModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { triggerTableRefresh } = useModal()
  const [name, setName] = useState('')
  const [fields, setFields] = useState<Field[]>([
    { fieldName: '', fieldType: 'text', required: false, isStockField: false, lowStockThreshold: null },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const addField = () => {
    setFields([...fields, { fieldName: '', fieldType: 'text', required: false, isStockField: false, lowStockThreshold: null }])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<Field>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)))
  }

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) { setError('Table name is required'); return }
    if (fields.some((f) => !f.fieldName.trim())) { setError('All fields must have a name'); return }

    setIsLoading(true)
    try {
      const res = await tablesApi.create({ name, fields })
      triggerTableRefresh()
      onClose()
      navigate(`/tables/${res.data.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create table')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Create New Table</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Table Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics, Office Supplies"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fields
            </label>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-[#0f1117] rounded-lg border border-gray-100 dark:border-[#2a2d3e] space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={field.fieldName}
                      onChange={(e) => updateField(index, { fieldName: e.target.value })}
                      placeholder="Field name"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={field.fieldType}
                      onChange={(e) => updateField(index, { fieldType: e.target.value as Field['fieldType'], isStockField: false })}
                      className="px-2 py-1.5 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                    </select>
                    {fields.length > 1 && (
                      <button
                        onClick={() => removeField(index)}
                        className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="rounded"
                      />
                      Required
                    </label>
                    {field.fieldType === 'number' && (
                      <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.isStockField}
                          onChange={(e) => updateField(index, { isStockField: e.target.checked })}
                          className="rounded"
                        />
                        Stock Field
                      </label>
                    )}
                    {field.isStockField && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 dark:text-gray-400">Threshold:</span>
                        <input
                          type="number"
                          value={field.lowStockThreshold ?? ''}
                          onChange={(e) => updateField(index, { lowStockThreshold: e.target.value ? Number(e.target.value) : null })}
                          placeholder="0"
                          className="w-16 px-2 py-0.5 text-xs border border-gray-200 dark:border-[#2a2d3e] rounded bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addField}
              className="mt-3 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
            >
              <Plus size={16} />
              Add Field
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Table'}
          </button>
        </div>
      </div>
    </div>
  )
}