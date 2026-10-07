import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { tablesApi, rowsApi } from "../lib/api";
import { FileSpreadsheet, Download, Table2, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { SkeletonReports } from "../components/ui/Skeleton";

interface Field {
  id: string;
  fieldName: string;
  fieldType: string;
  required: boolean;
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
  user: { name: string };
  updatedByUser: { name: string } | null;
}

export default function ReportsPage() {
  const { showToast } = useToast();
  const [tables, setTables] = useState<InventoryTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});

  const [isExportingAll, setIsExportingAll] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await tablesApi.getAll();
        const tableList: InventoryTable[] = res.data.data;
        setTables(tableList);

        // Fetch row counts for each table
        const counts: Record<string, number> = {};
        await Promise.all(
          tableList.map(async (t) => {
            try {
              const rowsRes = await rowsApi.getAll(t.id);
              counts[t.id] = rowsRes.data.data.length;
            } catch {
              counts[t.id] = 0;
            }
          }),
        );
        setRowCounts(counts);
      } catch (error) {
        console.error("Failed to fetch tables:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTables();
  }, []);

  const handleExport = async (table: InventoryTable) => {
    setExportingId(table.id);
    try {
      const res = await rowsApi.getAll(table.id);
      const rows: Row[] = res.data.data;

      if (rows.length === 0) {
        showToast("This table has no rows to export", "warning");
        setExportingId(null);
        return;
      }

      // Build header row: custom fields + auto fields
      const headers = [
        ...table.fields.map((f) => f.fieldName),
        "Created By",
        "Created At",
        "Updated By",
        "Updated At",
      ];

      // Build data rows
      const sheetData = rows.map((row) => {
        const rowValues: Record<string, any> = {};
        table.fields.forEach((field) => {
          let value = row.data[field.fieldName];
          if (field.fieldType === "boolean") {
            value = value === true || value === "true" ? "Yes" : "No";
          }
          if (field.fieldType === "date" && value) {
            value = new Date(value).toLocaleDateString();
          }
          rowValues[field.fieldName] = value ?? "";
        });
        rowValues["Created By"] = row.user?.name ?? "";
        rowValues["Created At"] = new Date(row.createdAt).toLocaleString();
        rowValues["Updated By"] = row.updatedByUser?.name ?? "";
        rowValues["Updated At"] = row.updatedBy
          ? new Date(row.updatedAt).toLocaleString()
          : "";
        return rowValues;
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(sheetData, {
        header: headers,
      });

      // Auto-size columns roughly based on header length
      worksheet["!cols"] = headers.map((h) => ({
        wch: Math.max(h.length + 2, 12),
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        table.name.slice(0, 31),
      );

      const filename = `${table.name.replace(/[^a-z0-9]/gi, "_")}_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);

      showToast(`Exported "${table.name}" successfully`);
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to export table", "error");
    } finally {
      setExportingId(null);
    }
  };

  const handleExportAll = async () => {
    if (!tables || tables.length === 0) {
      showToast("No tables to export", "error");
      return;
    }

    setIsExportingAll(true);
    try {
      const workbook = XLSX.utils.book_new();
      let sheetsAdded = 0;

      for (const table of tables) {
        const res = await rowsApi.getAll(table.id, 1, 999999);
        const rows = res.data.data;
        if (rows.length === 0) continue;

        const headers = [
          ...table.fields.map((f: any) => f.fieldName),
          "Created By",
          "Created At",
          "Updated By",
          "Updated At",
        ];

        const sheetData = rows.map((row: any) => {
          const rowValues: Record<string, any> = {};
          table.fields.forEach((field: any) => {
            rowValues[field.fieldName] = row.data[field.fieldName] ?? "";
          });
          rowValues["Created By"] = row.user?.name ?? "";
          rowValues["Created At"] = new Date(row.createdAt).toLocaleString();
          rowValues["Updated By"] = row.updatedByUser?.name ?? "";
          rowValues["Updated At"] = row.updatedBy
            ? new Date(row.updatedAt).toLocaleString()
            : "";
          return rowValues;
        });

        const worksheet = XLSX.utils.json_to_sheet(sheetData, {
          header: headers,
        });
        worksheet["!cols"] = headers.map((h) => ({
          wch: Math.max(h.length + 2, 14),
        }));

        // Excel sheet names max 31 chars, no special characters
        const sheetName = table.name
          .slice(0, 31)
          .replace(/[\\\/\?\*\[\]]/g, "");
        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          sheetName || `Sheet${sheetsAdded + 1}`,
        );
        sheetsAdded++;
      }

      if (sheetsAdded === 0) {
        showToast("All tables are empty — nothing to export", "error");
        return;
      }

      XLSX.writeFile(
        workbook,
        `inventory_full_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      showToast(
        `Exported ${sheetsAdded} table${sheetsAdded !== 1 ? "s" : ""} successfully`,
      );
    } catch (error: any) {
      console.error("Export error:", error);
      showToast(error?.message || "Export failed", "error");
    } finally {
      setIsExportingAll(false);
    }
  };

  if (isLoading) return <SkeletonReports />;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Reports
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
          Export any table to Excel for offline reporting
        </p>
      </div>

      <button
        onClick={handleExportAll}
        disabled={isExportingAll || tables.length === 0}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        <Download size={15} />
        {isExportingAll ? "Exporting..." : "Export All Tables"}
      </button>

      {/* Empty state */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl">
            <FileSpreadsheet size={40} className="text-indigo-400" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium">
            No tables to export yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-lg shrink-0">
                  <Table2
                    size={18}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {table.name}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {rowCounts[table.id] ?? 0} record
                {(rowCounts[table.id] ?? 0) !== 1 ? "s" : ""} ·{" "}
                {table.fields.length} field
                {table.fields.length !== 1 ? "s" : ""}
              </p>

              <button
                onClick={() => handleExport(table)}
                disabled={exportingId === table.id}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {exportingId === table.id ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    Export to Excel
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
