import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus } from 'lucide-react'

interface DropdownOption {
  label: string
  color: string
}

interface Field {
  id: string
  fieldName: string
  fieldType: string
  required: boolean
  isStockField: boolean
  lowStockThreshold: number | null
  options?: DropdownOption[]
}

interface Props {
  field: Field
  onSave: (fieldId: string, updates: any) => Promise<void>
  onClose: () => void
}

const PRESET_COLORS = [
  '#10b981', '#ef4444', '#f59e0b', '#6366f1',
  '#06b6d4', '#8b5cf6', '#ec4899', '#64748b',
]

export default function EditFieldModal({ field, onSave, onClose }: Props) {
  const [fieldName, setFieldName] = useState(field.fieldName)
  const [required, setRequired] = useState(field.required)
  const [options, setOptions] = useState<DropdownOption[]>(
    (field.options as DropdownOption[]) ?? []
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const updateOption = (index: number, updates: Partial<DropdownOption>) => {
    setOptions((prev) => prev.map((o, i) => i === index ? { ...o, ...updates } : o))
  }

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  const addOption = (color?: string) => {
    setOptions((prev) => [
      ...prev,
      { label: `Option ${prev.length + 1}`, color: color ?? PRESET_COLORS[prev.length % PRESET_COLORS.length] },
    ])
  }

  const handleSave = async () => {
    setError('')
    if (!fieldName.trim()) { setError('Field name is required'); return }
    if (field.fieldType === 'dropdown' && options.length === 0) {
      setError('Dropdown must have at least one option'); return
    }
    if (field.fieldType === 'dropdown' && options.some((o) => !o.label.trim())) {
      setError('All options must have a label'); return
    }

    setIsSaving(true)
    try {
      await onSave(field.id, {
        fieldName,
        required,
        ...(field.fieldType === 'dropdown' && { options }),
      })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update field')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edit Field</h2>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{field.fieldType} field</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Field name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Field Name
            </label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Required */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Required</span>
          </label>

          {/* Dropdown options */}
          {field.fieldType === 'dropdown' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dropdown Options
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={option.color}
                      onChange={(e) => updateOption(index, { color: e.target.value })}
                      className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateOption(index, { label: e.target.value })}
                      placeholder="Option label"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
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
                      onClick={() => removeOption(index)}
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Preset colors + add button */}
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => addOption(color)}
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title="Add option with this color"
                  />
                ))}
                <button
                  onClick={() => addOption()}
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium ml-1"
                >
                  <Plus size={13} />
                  Add option
                </button>
              </div>
            </div>
          )}

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
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}