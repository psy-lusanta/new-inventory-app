import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { tablesApi } from '../lib/api'
import { ArrowLeft, Plus, Trash2, X, Save, Pencil, GripVertical } from 'lucide-react'
import { useModal } from '../context/ModalContext'
import { useToast } from '../context/ToastContext'
import ConfirmModal from '../components/modals/ConfirmModal'
import EditFieldModal from '../components/modals/EditFieldModal'
import { SkeletonTableSettings } from '../components/ui/Skeleton'
import { createPortal } from 'react-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  order: number
  options?: DropdownOption[]
}

interface InventoryTable {
  id: string
  name: string
  fields: Field[]
}

const PRESET_COLORS = [
  '#10b981', '#ef4444', '#f59e0b', '#6366f1',
  '#06b6d4', '#8b5cf6', '#ec4899', '#64748b',
]

// ─── Sortable Field Item ──────────────────────────────────────────────────────
function SortableField({
  field,
  onEdit,
  onDelete,
  deletingFieldId,
}: {
  field: Field
  onEdit: (field: Field) => void
  onDelete: (field: Field) => void
  deletingFieldId: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-[#0f1117] rounded-lg border border-gray-100 dark:border-[#2a2d3e]"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none shrink-0"
        title="Drag to reorder"
      >
        <GripVertical size={15} />
      </button>

      {/* Field info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {field.fieldName}
          </p>
          {field.required && (
            <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">
              required
            </span>
          )}
          {field.isStockField && (
            <span className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
              stock
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400 capitalize">{field.fieldType}</span>
          {field.isStockField && field.lowStockThreshold !== null && (
            <span className="text-xs text-gray-400">· threshold: {field.lowStockThreshold}</span>
          )}
          {field.fieldType === 'dropdown' && field.options && (
            <div className="flex items-center gap-1 flex-wrap">
              {(field.options as DropdownOption[]).map((opt) => (
                <span
                  key={opt.label}
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${opt.color}25`,
                    color: opt.color,
                    border: `1px solid ${opt.color}50`,
                  }}
                >
                  {opt.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(field)}
          className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
          title="Edit field"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(field)}
          disabled={deletingFieldId === field.id}
          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          title={field.required ? 'Cannot delete required fields' : 'Delete field'}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TableSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { triggerTableRefresh } = useModal()
  const { showToast } = useToast()

  const [table, setTable] = useState<InventoryTable | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tableName, setTableName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const [showAddField, setShowAddField] = useState(false)
  const [newField, setNewField] = useState({
    fieldName: '',
    fieldType: 'text' as 'text' | 'number' | 'date' | 'boolean' | 'dropdown',
    required: false,
    isStockField: false,
    lowStockThreshold: null as number | null,
    options: [] as DropdownOption[],
  })
  const [isAddingField, setIsAddingField] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null)

  // Modals
  const [confirmField, setConfirmField] = useState<Field | null>(null)
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    const fetchTable = async () => {
      if (!id) return
      try {
        const res = await tablesApi.getOne(id)
        setTable(res.data.data)
        setTableName(res.data.data.name)
      } catch (error) {
        console.error('Failed to fetch table:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTable()
  }, [id])

  // ─── Drag end ─────────────────────────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !table) return

    const oldIndex = table.fields.findIndex((f) => f.id === active.id)
    const newIndex = table.fields.findIndex((f) => f.id === over.id)
    const reordered = arrayMove(table.fields, oldIndex, newIndex)
    const previousFields = table.fields

    // Optimistic update — show new order immediately
    setTable({ ...table, fields: reordered })

    try {
      // ✅ CORRECT — use reorderFields with just the IDs in order
      await tablesApi.reorderFields(id!, reordered.map((f) => f.id))
      showToast('Field order saved')
    } catch {
      showToast('Failed to save order', 'error')
      setTable((prev) => prev ? { ...prev, fields: previousFields } : prev)
    }
  }

  // ─── Save table name ──────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!id || !tableName.trim()) return
    setIsSavingName(true)
    try {
      const res = await tablesApi.update(id, tableName)
      setTable(res.data.data)
      showToast('Table name updated')
    } catch (error) {
      showToast('Failed to update table name', 'error')
    } finally {
      setIsSavingName(false)
    }
  }

  // ─── Add field ────────────────────────────────────────────────────────────
  const addOption = () => {
    setNewField((prev) => ({
      ...prev,
      options: [...prev.options, {
        label: `Option ${prev.options.length + 1}`,
        color: PRESET_COLORS[prev.options.length % PRESET_COLORS.length],
      }],
    }))
  }

  const updateOption = (index: number, updates: Partial<DropdownOption>) => {
    setNewField((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => i === index ? { ...o, ...updates } : o),
    }))
  }

  const removeOption = (index: number) => {
    setNewField((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }))
  }

  const handleAddField = async () => {
    if (!id) return
    setFieldError('')
    if (!newField.fieldName.trim()) { setFieldError('Field name is required'); return }
    if (newField.fieldType === 'dropdown' && newField.options.length === 0) {
      setFieldError('Dropdown fields must have at least one option'); return
    }
    if (newField.fieldType === 'dropdown' && newField.options.some((o) => !o.label.trim())) {
      setFieldError('All dropdown options must have a label'); return
    }

    setIsAddingField(true)
    try {
      const res = await tablesApi.addField(id, newField)
      setTable((prev) =>
        prev ? { ...prev, fields: [...prev.fields, res.data.data] } : prev
      )
      setShowAddField(false)
      setNewField({ fieldName: '', fieldType: 'text', required: false, isStockField: false, lowStockThreshold: null, options: [] })
      showToast('Field added successfully')
    } catch (err: any) {
      setFieldError(err.response?.data?.error || 'Failed to add field')
    } finally {
      setIsAddingField(false)
    }
  }

  // ─── Delete field ─────────────────────────────────────────────────────────
  const handleDeleteField = async () => {
    if (!id || !confirmField) return
    setDeletingFieldId(confirmField.id)
    try {
      await tablesApi.deleteField(id, confirmField.id)
      setTable((prev) =>
        prev ? { ...prev, fields: prev.fields.filter((f) => f.id !== confirmField.id) } : prev
      )
      showToast('Field deleted')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete field', 'error')
    } finally {
      setDeletingFieldId(null)
      setConfirmField(null)
    }
  }

  // ─── Update field ─────────────────────────────────────────────────────────
  const handleUpdateField = async (fieldId: string, updates: any) => {
    if (!id) return
    const res = await tablesApi.updateField(id, fieldId, updates)
    setTable((prev) =>
      prev ? { ...prev, fields: prev.fields.map((f) => f.id === fieldId ? res.data.data : f) } : prev
    )
    showToast('Field updated successfully')
  }

  // ─── Delete table ─────────────────────────────────────────────────────────
  const handleDeleteTable = async () => {
    try {
      await tablesApi.delete(id!)
      triggerTableRefresh()
      showToast('Table deleted')
      navigate('/dashboard')
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete table', 'error')
    } finally {
      setShowDeleteModal(false)
    }
  }

  if (isLoading) return <SkeletonTableSettings />

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-gray-400">Table not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/tables/${id}`)}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Table Settings</h1>
          <p className="text-gray-400 text-xs mt-0.5">{table.name}</p>
        </div>
      </div>

      {/* Table Name */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Table Name</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSaveName}
            disabled={isSavingName || tableName === table.name}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {isSavingName ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Fields</h2>
          <button
            onClick={() => setShowAddField(true)}
            className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
          >
            <Plus size={15} />
            Add Field
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">Drag the grip handle to reorder fields</p>

        {/* Draggable fields list */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={table.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {table.fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  onEdit={setEditingField}
                  onDelete={setConfirmField}
                  deletingFieldId={deletingFieldId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Field Form */}
        {showAddField && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-[#0f1117] rounded-lg border border-indigo-200 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white">New Field</p>
              <button onClick={() => setShowAddField(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newField.fieldName}
                onChange={(e) => setNewField({ ...newField, fieldName: e.target.value })}
                placeholder="Field name"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={newField.fieldType}
                onChange={(e) => setNewField({ ...newField, fieldType: e.target.value as any, isStockField: false, options: [] })}
                className="px-2 py-1.5 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="rounded"
                />
                Required
              </label>
              {newField.fieldType === 'number' && (
                <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newField.isStockField}
                    onChange={(e) => setNewField({ ...newField, isStockField: e.target.checked })}
                    className="rounded"
                  />
                  Stock Field
                </label>
              )}
              {newField.isStockField && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Threshold:</span>
                  <input
                    type="number"
                    value={newField.lowStockThreshold ?? ''}
                    onChange={(e) => setNewField({ ...newField, lowStockThreshold: e.target.value ? Number(e.target.value) : null })}
                    placeholder="0"
                    className="w-16 px-2 py-0.5 text-xs border border-gray-200 dark:border-[#2a2d3e] rounded bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Dropdown options */}
            {newField.fieldType === 'dropdown' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Options</p>
                {newField.options.map((option, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={option.color}
                      onChange={(e) => updateOption(optIdx, { color: e.target.value })}
                      className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateOption(optIdx, { label: e.target.value })}
                      placeholder="Option label"
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-white dark:bg-[#1a1d2e] text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                      style={{ backgroundColor: `${option.color}25`, color: option.color, border: `1px solid ${option.color}50` }}
                    >
                      {option.label || 'Preview'}
                    </span>
                    <button onClick={() => removeOption(optIdx)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewField((prev) => ({
                        ...prev,
                        options: [...prev.options, { label: `Option ${prev.options.length + 1}`, color }],
                      }))}
                      className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title="Add option with this color"
                    />
                  ))}
                  <button onClick={addOption} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium ml-1">
                    + Add option
                  </button>
                </div>
              </div>
            )}

            {fieldError && <p className="text-red-500 text-xs">{fieldError}</p>}

            <button
              onClick={handleAddField}
              disabled={isAddingField}
              className="w-full py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isAddingField ? 'Adding...' : 'Add Field'}
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h2>
        <p className="text-xs text-gray-400 mb-4">
          Deleting this table will permanently remove all its rows and field definitions.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Delete Table
        </button>
      </div>

      {/* Delete Field Modal */}
      {confirmField && (
        <ConfirmModal
          title={`Delete "${confirmField.fieldName}"?`}
          message="This will permanently remove the field. All data in this column will be lost."
          confirmLabel="Delete Field"
          onConfirm={handleDeleteField}
          onClose={() => setConfirmField(null)}
        />
      )}

      {/* Edit Field Modal */}
      {editingField && (
        <EditFieldModal
          field={editingField}
          onSave={handleUpdateField}
          onClose={() => setEditingField(null)}
        />
      )}

      {/* Delete Table Modal */}
      {showDeleteModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl shrink-0">
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Delete "{table?.name}"?</h2>
                <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All rows, fields, and data will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteTable} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}