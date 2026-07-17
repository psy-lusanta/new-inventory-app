import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { tablesApi } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

interface DropdownOption {
  label: string
  color: string
}

interface Field {
  fieldName: string
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'dropdown'
  required: boolean
  options: DropdownOption[]
}

interface Props {
  onClose: () => void
}

const PRESET_COLORS = [
  '#10b981', '#ef4444', '#f59e0b', '#6366f1',
  '#06b6d4', '#8b5cf6', '#ec4899', '#64748b',
]

export default function CreateTableModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { triggerTableRefresh } = useModal()
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [fields, setFields] = useState<Field[]>([
    { fieldName: '', fieldType: 'text', required: false, options: [] },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const addField = () => {
    setFields([...fields, { fieldName: '', fieldType: 'text', required: false, options: [] }])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<Field>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)))
  }

  const addOption = (fieldIndex: number) => {
    const field = fields[fieldIndex]
    updateField(fieldIndex, {
      options: [...field.options, { label: '', color: PRESET_COLORS[field.options.length % PRESET_COLORS.length] }]
    })
  }

  const updateOption = (fieldIndex: number, optionIndex: number, updates: Partial<DropdownOption>) => {
    const field = fields[fieldIndex]
    const newOptions = field.options.map((o, i) => i === optionIndex ? { ...o, ...updates } : o)
    updateField(fieldIndex, { options: newOptions })
  }

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex]
    updateField(fieldIndex, { options: field.options.filter((_, i) => i !== optionIndex) })
  }

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) { setError('Table name is required'); return }
    if (fields.some((f) => !f.fieldName.trim())) { setError('All fields must have a name'); return }
    if (fields.some((f) => f.fieldType === 'dropdown' && f.options.length === 0)) {
      setError('Dropdown fields must have at least one option'); return
    }
    if (fields.some((f) => f.fieldType === 'dropdown' && f.options.some((o) => !o.label.trim()))) {
      setError('All dropdown options must have a label'); return
    }

    setIsLoading(true)
    try {
      const res = await tablesApi.create({ name, fields })
      triggerTableRefresh()
      showToast(`Table "${name}" created successfully`)
      onClose()
      navigate(`/tables/${res.data.data.id}`)
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create table'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="custom-scrollbar bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Create New Table</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Table Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Table Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Laptops, Office Supplies"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fields</label>
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-[#0f1117] rounded-lg border border-gray-100 dark:border-[#2a2d3e] space-y-2">

                      {/* Field name + type + remove */}
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
                          onChange={(e) => updateField(index, {
                            fieldType: e.target.value as Field['fieldType'],
                            options: [],
                          })}
                          className="px-2 py-1.5 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="boolean">Boolean</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                        {fields.length > 1 && (
                          <button onClick={() => removeField(index)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Required checkbox */}
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
                      </div>

                      {/* Dropdown options */}
                      {field.fieldType === 'dropdown' && (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Options</p>
                          {field.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              {/* Color picker */}
                              <div className="relative shrink-0">
                                <input
                                  type="color"
                                  value={option.color}
                                  onChange={(e) => updateOption(index, optIdx, { color: e.target.value })}
                                  className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                                />
                              </div>
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) => updateOption(index, optIdx, { label: e.target.value })}
                                placeholder="Option label"
                                className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              {/* Preview badge */}
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                                style={{
                                  backgroundColor: `${option.color}25`,
                                  color: option.color,
                                  border: `1px solid ${option.color}50`,
                                }}
                              >
                                {option.label || 'Preview'}
                              </span>
                              <button
                                onClick={() => removeOption(index, optIdx)}
                                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          {/* Preset color buttons */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  const label = field.options.length === 0 ? 'Option 1' : `Option ${field.options.length + 1}`
                                  updateField(index, {
                                    options: [...field.options, { label, color }]
                                  })
                                }}
                                className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                title={`Add option with this color`}
                              />
                            ))}
                            <button
                              onClick={() => addOption(index)}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium ml-1"
                            >
                              + Add option
                            </button>
                          </div>
                        </div>
                      )}
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
                <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors">
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
      </div>
    </div>,
    document.body
  )
} 