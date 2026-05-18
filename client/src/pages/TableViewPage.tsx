import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { tablesApi, rowsApi } from "../lib/api";
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
import { useAuth } from "../context/AuthContext";

interface Field {
  id: string;
  fieldName: string;
  fieldType: string;
  required: boolean;
  isStockField: boolean;
  lowStockThreshold: number | null;
  order: number;
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
  const { isAdmin, isStaffOrAdmin } = useAuth();

  const [table, setTable] = useState<InventoryTable | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState("");

  // ─── Column visibility ────────────────────────────────────────────────────
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {},
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // ─── Row modal state ──────────────────────────────────────────────────────
  const [showRowModal, setShowRowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Fetch table + rows ───────────────────────────────────────────────────
  const fetchData = async () => {
    if (!id) return;
    try {
      const [tableRes, rowsRes] = await Promise.all([
        tablesApi.getOne(id),
        rowsApi.getAll(id),
      ]);
      const fetchedTable = tableRes.data.data;

      setTable(fetchedTable);
      setRows(rowsRes.data.data);

      // Initialize all columns as visible
      const initialVisibility: Record<string, boolean> = {};
      fetchedTable.fields.forEach((f: Field) => {
        initialVisibility[f.fieldName] = true;
      });
      AUTO_FIELDS.forEach((f) => {
        initialVisibility[f.key] = true;
      });
      setVisibleColumns(initialVisibility);
    } catch (error) {
      console.error("Failed to fetch table data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // ─── Toggle column visibility ─────────────────────────────────────────────
  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    } catch (error) {
      console.error("Failed to delete row:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Filter rows ──────────────────────────────────────────────────────────
  const filteredRows = rows.filter((row) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return Object.values(row.data).some((val) =>
      String(val).toLowerCase().includes(q),
    );
  });

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
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            value === true || value === "true"
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {table.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            {rows.length} record{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => navigate(`/tables/${id}/settings`)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors"
            >
              <Settings size={15} />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
          {isStaffOrAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add Row</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter rows..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2a2d3e] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white dark:placeholder-gray-500"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#2a2d3e] bg-gray-50 dark:bg-[#0f1117]">
                {table.fields
                  .filter((f) => visibleColumns[f.fieldName])
                  .map((field) => (
                    <th
                      key={field.id}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
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
                {AUTO_FIELDS.filter((f) => visibleColumns[f.key]).map(
                  (field) => (
                    <th
                      key={field.key}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {field.label}
                    </th>
                  ),
                )}
                {isStaffOrAdmin && (
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
            <tbody className="divide-y divide-gray-50 dark:divide-[#2a2d3e]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.fields.length + 5}
                    className="px-4 py-12 text-center text-gray-400 text-sm"
                  >
                    {filterQuery
                      ? `No rows match "${filterQuery}"`
                      : "No rows yet — add one!"}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-[#0f1117] transition-colors"
                  >
                    {table.fields
                      .filter((f) => visibleColumns[f.fieldName])
                      .map((field) => (
                        <td
                          key={field.id}
                          className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap"
                        >
                          {renderCellValue(field, row.data[field.fieldName])}
                        </td>
                      ))}
                    {visibleColumns["createdBy"] && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {row.user?.name ?? "—"}
                      </td>
                    )}
                    {visibleColumns["createdAt"] && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                    )}
                    {visibleColumns["updatedBy"] && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {row.updatedByUser?.name ?? "—"}
                      </td>
                    )}
                    {visibleColumns["updatedAt"] && (
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                        {row.updatedBy
                          ? new Date(row.updatedAt).toLocaleDateString()
                          : "—"}
                      </td>
                    )}
                    {isStaffOrAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap">
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
      {showRowModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingRow ? "Edit Row" : "Add Row"}
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
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
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
                {isSaving
                  ? "Saving..."
                  : editingRow
                    ? "Save Changes"
                    : "Add Row"}
              </button>
            </div>
          </div>
        </div>
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
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      visibleColumns[field.fieldName]
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
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      visibleColumns[field.key]
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
    </div>
  );
}
