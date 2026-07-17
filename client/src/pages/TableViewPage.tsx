import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { tablesApi, rowsApi } from "../lib/api";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Settings,
  Trash2,
  Pencil,
  Search,
  X,
  AlertTriangle,
  Columns,
  Check,
} from "lucide-react";
import RowDetailModal from "../components/modals/RowDetailModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ConfirmModal from '../components/modals/ConfirmModal'

interface Field {
  id: string;
  fieldName: string;
  fieldType: string;
  required: boolean;
  isStockField: boolean;
  lowStockThreshold: number | null;
  order: number;
  options?: { label: string; color: string }[]
}

interface InventoryTable {
  id: string;
  name: string;
  fields: Field[];
}

interface Row {
  id: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  user: { id: string; name: string; email: string };
  updatedByUser: { id: string; name: string; email: string } | null;
}

// Auto fields that are always available to toggle
const AUTO_FIELDS = [
  { key: "createdBy", label: "Created By" },
  { key: "createdAt", label: "Created At" },
  { key: "updatedBy", label: "Updated By" },
  { key: "updatedAt", label: "Updated At" },
];

export default function TableViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isStaffOrAdmin, user } = useAuth();

  const [table, setTable] = useState<InventoryTable | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");
  const [confirmDeleteRowId, setConfirmDeleteRowId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => rowsApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rows', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      showToast('Row added successfully')
      closeModal()
    },
    onError: (err: any) => {
      const message = err.response?.data?.error || 'Failed to save row'
      setFormError(message)
      showToast(message, 'error')
    },
  })

  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<{
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  } | null>(null)

  const LIMIT = 50

  // ─── Column visibility ────────────────────────────────────────────────────
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {},
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // ─── Toast  ────────────────────────────────────────────────────
  const { showToast } = useToast();

  // ─── Row modal state ──────────────────────────────────────────────────────
  const [showRowModal, setShowRowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Selected row state ───────────────────────────────────────────────────
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)

  // ─── Fetch table + rows ───────────────────────────────────────────────────
  const fetchData = async () => {
    if (!id) return
    try {
      const [tableRes, rowsRes] = await Promise.all([
        tablesApi.getOne(id),
        rowsApi.getAll(id, page, LIMIT),
      ])
      const fetchedTable = tableRes.data.data
      setTable(fetchedTable)
      setRows(rowsRes.data.data)
      setPagination(rowsRes.data.pagination)

      // Load saved column visibility, or default to all visible
      const storageKey = `columns:${user?.id}:${id}`
      const saved = localStorage.getItem(storageKey)

      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Merge saved prefs with any new fields that didn't exist before
          const merged: Record<string, boolean> = {}
          fetchedTable.fields.forEach((f: Field) => {
            merged[f.fieldName] = parsed[f.fieldName] ?? true
          })
          AUTO_FIELDS.forEach((f) => {
            merged[f.key] = parsed[f.key] ?? true
          })
          setVisibleColumns(merged)
        } catch {
          const initialVisibility: Record<string, boolean> = {}
          fetchedTable.fields.forEach((f: Field) => { initialVisibility[f.fieldName] = true })
          AUTO_FIELDS.forEach((f) => { initialVisibility[f.key] = true })
          setVisibleColumns(initialVisibility)
        }
      } else {
        const initialVisibility: Record<string, boolean> = {}
        fetchedTable.fields.forEach((f: Field) => { initialVisibility[f.fieldName] = true })
        AUTO_FIELDS.forEach((f) => { initialVisibility[f.key] = true })
        setVisibleColumns(initialVisibility)
      }
    } catch (error) {
      console.error('Failed to fetch table data:', error)
    } finally {
      setIsLoading(false)
    }
  };

  useEffect(() => {
    fetchData()
  }, [id, page])

  // ─── Toggle column visibility ─────────────────────────────────────────────
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] }
      const storageKey = `columns:${user?.id}:${id}`
      localStorage.setItem(storageKey, JSON.stringify(updated))
      return updated
    })
  }

  // ─── Open modal for add/edit ──────────────────────────────────────────────
  const openAddModal = () => {
    setEditingRow(null);
    setFormData({});
    setFormError("");
    setShowRowModal(true);
  };

  const openEditModal = (row: Row) => {
    setEditingRow(row);
    setFormData({ ...row.data });
    setFormError("");
    setShowRowModal(true);
  };

  const closeModal = () => {
    setShowRowModal(false);
    setEditingRow(null);
    setFormData({});
    setFormError("");
  };

  // ─── Save row ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!id || !table) return;
    setFormError("");

    for (const field of table.fields) {
      if (
        field.required &&
        (formData[field.fieldName] === undefined ||
          formData[field.fieldName] === "")
      ) {
        setFormError(`"${field.fieldName}" is required`);
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editingRow) {
        const res = await rowsApi.update(id, editingRow.id, formData);
        setRows((prev) =>
          prev.map((r) => (r.id === editingRow.id ? res.data.data : r)),
        );
      } else {
        const res = await rowsApi.create(id, formData);
        setRows((prev) => [res.data.data, ...prev]);
      }
      closeModal();
      showToast("Row saved successfully", "success");
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to save row");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete row ───────────────────────────────────────────────────────────
  const handleDelete = async (rowId: string) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this row?")) return;
    setDeletingId(rowId);
    try {
      await rowsApi.delete(id, rowId);
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      showToast("Row deleted successfully", "success");
    } catch (error) {
      console.error("Failed to delete row:", error);
      showToast("Failed to delete row", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Filter rows ──────────────────────────────────────────────────────────
  const filteredRows = rows.filter((row) => {
    if (!filterQuery.trim()) return true
    const q = filterQuery.toLowerCase()
    const dataMatch = Object.values(row.data).some((val) =>
      String(val).toLowerCase().includes(q)
    )
    const createdByMatch = row.user?.name?.toLowerCase().includes(q) ?? false
    const updatedByMatch = row.updatedByUser?.name?.toLowerCase().includes(q) ?? false
    return dataMatch || createdByMatch || updatedByMatch
  })

  // ─── Render field input ───────────────────────────────────────────────────
  const renderInput = (field: Field) => {
    const value = formData[field.fieldName] ?? "";
    const baseClass =
      "w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

    switch (field.fieldType) {
      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              setFormData({
                ...formData,
                [field.fieldName]:
                  e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            className={baseClass}
          />
        );
      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [field.fieldName]: e.target.value })
            }
            className={baseClass}
          />
        );
      case "boolean":
        return (
          <select
            value={value === true || value === "true" ? "true" : "false"}
            onChange={(e) =>
              setFormData({
                ...formData,
                [field.fieldName]: e.target.value === "true",
              })
            }
            className={baseClass}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.fieldName]: e.target.value })}
            className={baseClass}
          >
            <option value="">Select an option...</option>
            {((field as any).options ?? []).map((opt: any) => (
              <option key={opt.label} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) =>
              setFormData({ ...formData, [field.fieldName]: e.target.value })
            }
            className={baseClass}
          />
        );
    }
  };

  // ─── Render cell value ────────────────────────────────────────────────────
  const renderCellValue = (field: Field, value: any) => {
    if (value === undefined || value === null || value === "") {
      return <span className="text-gray-300 dark:text-gray-600">—</span>;
    }
    if (field.fieldType === "boolean") {
      return (
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${value === true || value === "true"
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
        >
          {value === true || value === "true" ? "Yes" : "No"}
        </span>
      );
    }
    if (field.isStockField) {
      const isLow =
        field.lowStockThreshold !== null &&
        Number(value) <= field.lowStockThreshold;
      return (
        <div className="flex items-center gap-1.5">
          <span
            className={
              isLow ? "text-red-600 dark:text-red-400 font-semibold" : ""
            }
          >
            {value}
          </span>
          {isLow && <AlertTriangle size={13} className="text-red-500" />}
        </div>
      );
    }
    if (field.fieldType === "date" && value) {
      return new Date(value).toLocaleDateString();
    }
    if (field.fieldType === 'dropdown' && field.options) {
      const option = (field.options as any[]).find(
        (o: any) => o.label === value
      )
      if (option) {
        return (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${option.color}25`,
              color: option.color,
              border: `1px solid ${option.color}50`,
            }}
          >
            {option.label}
          </span>
        )
      }
      return String(value)
    }
    return String(value);
  };

  const columnPickerRef = useRef<HTMLDivElement>(null);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const clickedButton = columnPickerRef.current?.contains(e.target as Node);
      const clickedDropdown = columnDropdownRef.current?.contains(
        e.target as Node,
      );
      if (!clickedButton && !clickedDropdown) {
        setShowColumnPicker(false);
      }
    };

    if (showColumnPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showColumnPicker]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-gray-400">Table not found.</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-indigo-600"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {table.name} Table
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            {rows.length} record{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAdmin && (
            <button
              onClick={() => navigate(`/tables/${id}/settings`)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors flex-1 sm:flex-initial"
            >
              <Settings size={15} />
              <span>Settings</span>
            </button>
          )}
          {isStaffOrAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex-1 sm:flex-initial"
            >
              <Plus size={15} />
              <span>Add Row</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter rows..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2a2d3e] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white dark:placeholder-gray-500"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 dark:border-[#2a2d3e] bg-gray-50 dark:bg-[#0f1117]">
                {table.fields
                  .filter((f) => visibleColumns[f.fieldName])
                  .map((field, idx) => (
                    <th
                      key={field.id}
                      className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap ${idx === 0 ? 'sticky left-0 z-20 bg-gray-50 dark:bg-[#0f1117]' : ''
                        }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {field.fieldName}
                        {field.isStockField && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full normal-case font-medium">
                            stock
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                {AUTO_FIELDS.filter((f) => visibleColumns[f.key]).map((field) => (
                  <th
                    key={field.key}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {field.label}
                  </th>
                ))}
                {isStaffOrAdmin && (
                  <th className="sticky right-0 z-20 bg-gray-50 dark:bg-[#0f1117] px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-between gap-2">
                      <span>Actions</span>
                      <div ref={columnPickerRef} className="relative">
                        <button
                          onClick={() => setShowColumnPicker((prev) => !prev)}
                          className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2d3e] transition-colors"
                          title="Toggle columns"
                        >
                          <Columns size={14} />
                        </button>
                      </div>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2a2d3e] cursor-pointer">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.fields.length + 5}
                    className="px-4 py-12 text-center text-gray-400 text-sm"
                  >
                    {filterQuery ? `No rows match "${filterQuery}"` : 'No rows yet — add one!'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="hover:bg-gray-50 dark:hover:bg-[#0f1117] transition-colors group">
                    {table.fields
                      .filter((f) => visibleColumns[f.fieldName])
                      .map((field, idx) => (
                        <td
                          key={field.id}
                          className={`px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap ${idx === 0
                            ? 'sticky left-0 z-10 bg-white dark:bg-[#1a1d2e] group-hover:bg-gray-50 dark:group-hover:bg-[#0f1117]'
                            : ''
                            }`}
                        >
                          {renderCellValue(field, row.data[field.fieldName])}
                        </td>
                      ))}
                    {visibleColumns['createdBy'] && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {row.user?.name ?? '—'}
                      </td>
                    )}
                    {visibleColumns['createdAt'] && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                    )}
                    {visibleColumns['updatedBy'] && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {row.updatedByUser?.name ?? '—'}
                      </td>
                    )}
                    {visibleColumns['updatedAt'] && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {row.updatedBy ? new Date(row.updatedAt).toLocaleDateString() : '—'}
                      </td>
                    )}
                    {isStaffOrAdmin && (
                      <td
                        onClick={(e) => e.stopPropagation()}
                        className="sticky right-0 z-10 bg-white dark:bg-[#1a1d2e] group-hover:bg-gray-50 dark:group-hover:bg-[#0f1117] px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(row)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Row Modal */}
      {showRowModal && createPortal(
        <div
          className="custom-scrollbar fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-[#1a1d2e] rounded-none sm:rounded-2xl shadow-xl w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingRow ? 'Edit Row' : 'Add Row'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {table.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.fieldName}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    {field.isStockField && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                        stock
                      </span>
                    )}
                  </label>
                  {renderInput(field)}
                </div>
              ))}
              {formError && (
                <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingRow ? 'Save Changes' : 'Add Row'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Column Picker */}
      {showColumnPicker &&
        createPortal(
          <div
            ref={columnDropdownRef}
            style={{
              position: "fixed",
              top: columnPickerRef.current
                ? columnPickerRef.current.getBoundingClientRect().bottom + 8
                : 0,
              right:
                window.innerWidth -
                (columnPickerRef.current
                  ? columnPickerRef.current.getBoundingClientRect().right
                  : 0),
              zIndex: 9999,
            }}
            className="custom-scrollbar w-56 bg-white dark:bg-[#1a1d2e] rounded-xl shadow-lg border border-gray-100 dark:border-[#2a2d3e] overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-[#2a2d3e] flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Toggle Columns
              </p>
              <button
                onClick={() => setShowColumnPicker(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              <p className="px-2 py-1 text-xs text-gray-400 font-medium">
                Custom Fields
              </p>
              {table.fields.map((field) => (
                <button
                  key={field.id}
                  onClick={() => toggleColumn(field.fieldName)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{field.fieldName}</span>
                    {field.isStockField && (
                      <span className="text-xs text-amber-500">stock</span>
                    )}
                  </div>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${visibleColumns[field.fieldName]
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-gray-300 dark:border-gray-600"
                      }`}
                  >
                    {visibleColumns[field.fieldName] && (
                      <Check size={11} className="text-white" />
                    )}
                  </div>
                </button>
              ))}
              <p className="px-2 py-1 mt-1 text-xs text-gray-400 font-medium">
                Auto Fields
              </p>
              {AUTO_FIELDS.map((field) => (
                <button
                  key={field.key}
                  onClick={() => toggleColumn(field.key)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors"
                >
                  <span>{field.label}</span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${visibleColumns[field.key]
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-gray-300 dark:border-gray-600"
                      }`}
                  >
                    {visibleColumns[field.key] && (
                      <Check size={11} className="text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      {/* Footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1a1d2e] border border-gray-100 dark:border-[#2a2d3e] rounded-xl text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredRows.length}</span> of{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{rows.length}</span> records
            {filterQuery && ` matching "${filterQuery}"`}
          </span>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1a1d2e] border border-gray-100 dark:border-[#2a2d3e] rounded-xl">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page <span className="font-semibold text-gray-900 dark:text-white">{page}</span> of{' '}
            <span className="font-semibold text-gray-900 dark:text-white">{pagination.totalPages}</span>
            {' '}· {pagination.total} total records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
            >
              ← Prev
            </button>
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 text-xs font-medium rounded-lg transition-colors ${pageNum === page
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-200 dark:border-[#2a2d3e] hover:bg-gray-50 dark:hover:bg-[#2a2d3e] text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ------ Row Detail Modal ------ */}
      {selectedRow && table && createPortal(
        <RowDetailModal
          row={selectedRow}
          fields={table.fields}
          tableName={table.name}
          onClose={() => setSelectedRow(null)}
        />,
        document.body
      )}
    </div>
  );
}
