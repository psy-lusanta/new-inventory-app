import { useEffect, useState } from "react";
import { reportsApi } from "../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Settings2,
  X,
  RotateCcw,
  GripVertical,
  Table2,
  Clock,
  Eye,
  EyeOff,
  Check,
  TrendingUp,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useDashboardLayout,
  WidgetId,
  WIDGET_LABELS,
  DEFAULT_ORDER,
} from "../hooks/useDashboardLayout";
import { useCountUp } from "../hooks/useCountUp";
import { useAuth } from "../context/AuthContext";
import { SkeletonDashboard } from "../components/ui/Skeleton";

function AnimatedNumber({ value }: { value: number }) {
  const count = useCountUp(value);
  return <span className="tabular-nums">{count}</span>;
}

function AnimatedTile({
  table,
  index,
}: {
  table: TableSummary;
  index: number;
}) {
  const count = useCountUp(table.rowCount);
  return (
    <div
      key={table.id}
      className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
          {table.name}
        </p>
        <div
          className="p-2 rounded-lg shrink-0"
          style={{
            backgroundColor: `${PIE_COLORS[index % PIE_COLORS.length]}20`,
          }}
        >
          <Table2
            size={16}
            style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}
          />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
        {count}
      </p>
      <p className="text-xs text-gray-400 mt-1">records</p>
    </div>
  );
}

const PIE_COLORS = [
  "#6366f1",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TableSummary {
  id: string;
  name: string;
  rowCount: number;
  fieldCount: number;
}
interface ActivityItem {
  id: string;
  tableName: string;
  action: string;
  actorName: string;
  timestamp: string;
}
interface DropdownStat {
  tableId: string;
  tableName: string;
  fieldName: string;
  options: { label: string; color: string; count: number }[];
  total: number;
}
interface AssetTagStat {
  tableId: string;
  tableName: string;
  fieldName: string;
  count: number;
  total: number;
}
interface CostStats {
  totalSpend: number;
  monthlySpend: number;
  yearlySpend: number;
  byTable: any[];
  monthlyTrend: { month: string; total: number }[];
}
interface DashboardData {
  totalTables: number;
  totalRows: number;
  totalMovements: number;
  lowStockCount: number;
  tablesSummary: TableSummary[];
  recentActivity: ActivityItem[];
}

// ─── Sortable Widget Wrapper ──────────────────────────────────────────────────
function SortableWidget({
  id,
  isEditing,
  isHidden,
  onToggleHide,
  children,
}: {
  id: WidgetId;
  isEditing: boolean;
  isHidden: boolean;
  onToggleHide: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : isHidden ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  if (isHidden && !isEditing) return null;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {isEditing && (
        <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1">
          <button
            onClick={onToggleHide}
            className={`p-1 rounded-full shadow text-xs font-bold transition-colors ${
              isHidden
                ? "bg-gray-400 text-white hover:bg-gray-500"
                : "bg-white dark:bg-[#1a1d2e] text-gray-500 hover:text-red-500 border border-gray-200 dark:border-[#2a2d3e]"
            }`}
            title={isHidden ? "Show widget" : "Hide widget"}
          >
            {isHidden ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <button
            {...attributes}
            {...listeners}
            className="p-1 rounded-full shadow bg-indigo-600 text-white cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical size={11} />
          </button>
        </div>
      )}
      {isHidden && isEditing && (
        <div className="absolute inset-0 z-10 bg-gray-100/80 dark:bg-gray-900/80 rounded-xl flex items-center justify-center">
          <span className="text-xs text-gray-500 font-medium">Hidden</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const { order, hidden, saveOrder, toggleHidden, resetLayout, initialized } =
    useDashboardLayout();
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [dropdownStats, setDropdownStats] = useState<DropdownStat[]>([]);
  const [assetTagStats, setAssetTagStats] = useState<AssetTagStat[]>([]);
  const [costStats, setCostStats] = useState<CostStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const pieStorageKey = `dashboard-pie-${user?.id}`;
  const tileStorageKey = `dashboard-tiles-${user?.id}`;

  // ────── Tile Picker  ─────────────────────────────────────────────────────────────────────
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [showTilePicker, setShowTilePicker] = useState(false);
  const [draftTiles, setDraftTiles] = useState<string[]>([]);
  const tilesTableData = (data?.tablesSummary ?? []).filter((t) =>
    selectedTiles.includes(t.id),
  );

  const openTilePicker = () => {
    setDraftTiles(selectedTiles); // seed draft from the last saved selection
    setShowTilePicker(true);
  };

  const toggleDraftTile = (tableId: string) => {
    setDraftTiles((prev) => {
      if (prev.includes(tableId)) return prev.filter((id) => id !== tableId);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, tableId];
    });
  };

  const handleSaveTiles = () => {
    setSelectedTiles(draftTiles);
    localStorage.setItem(tileStorageKey, JSON.stringify(draftTiles));
    setShowTilePicker(false);
  };

  // ────── Pie Chart  ─────────────────────────────────────────────────────────────────────
  const [selectedPieTables, setSelectedPieTables] = useState<string[]>([]);
  const [showPiePicker, setShowPiePicker] = useState(false);
  const [draftPieTables, setDraftPieTables] = useState<string[]>([]);

  const openPiePicker = () => {
    setDraftPieTables(selectedPieTables);
    setShowPiePicker(true);
  };

  const toggleDraftPieTable = (tableId: string) => {
    setDraftPieTables((prev) => {
      if (prev.includes(tableId)) return prev.filter((id) => id !== tableId);
      if (prev.length >= 5) return prev; // max 5
      return [...prev, tableId];
    });
  };

  const handleSavePie = () => {
    setSelectedPieTables(draftPieTables);
    localStorage.setItem(pieStorageKey, JSON.stringify(draftPieTables));
    setShowPiePicker(false);
  };

  const pieData = (data?.tablesSummary ?? [])
    .filter((t) => selectedPieTables.includes(t.id))
    .map((t) => ({ name: t.name, value: t.rowCount }));

  const totalPieValue = pieData.reduce((sum, d) => sum + d.value, 0);

  // Local order state for drag (synced with hook)
  const [localOrder, setLocalOrder] = useState<WidgetId[]>(order);

  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!user?.id) return; // ← wait for user to load

    const fetchDashboard = async () => {
      try {
        const [dashRes, monthlyRes, dropdownRes, assetRes] = await Promise.all([
          reportsApi.getDashboard(),
          reportsApi.getMonthlyMovements(),
          reportsApi.getDropdownStats(),
          reportsApi.getAssetTagStats(),
        ]);

        const dashboard = dashRes.data.data;
        setData(dashboard);
        setMonthlyData(monthlyRes.data.data);
        setDropdownStats(dropdownRes.data.data);
        setAssetTagStats(assetRes.data.data);

        try {
          const costRes = await reportsApi.getCostStats();
          setCostStats(costRes.data.data);
        } catch {}

        // ─── Load tile preferences ──────────────────────────────────────────
        const savedTiles = localStorage.getItem(tileStorageKey);
        if (savedTiles) {
          try {
            const parsed = JSON.parse(savedTiles);
            const valid = parsed.filter((id: string) =>
              dashboard.tablesSummary.some((t: any) => t.id === id),
            );
            setSelectedTiles(
              valid.length > 0
                ? valid
                : dashboard.tablesSummary.slice(0, 4).map((t: any) => t.id),
            );
          } catch {
            setSelectedTiles(
              dashboard.tablesSummary.slice(0, 4).map((t: any) => t.id),
            );
          }
        } else {
          setSelectedTiles(
            dashboard.tablesSummary.slice(0, 4).map((t: any) => t.id),
          );
        }

        // ─── Load pie preferences ───────────────────────────────────────────
        const savedPie = localStorage.getItem(pieStorageKey);
        if (savedPie) {
          try {
            const parsed = JSON.parse(savedPie);
            const valid = parsed.filter((id: string) =>
              dashboard.tablesSummary.some((t: any) => t.id === id),
            );
            setSelectedPieTables(
              valid.length > 0
                ? valid
                : dashboard.tablesSummary.slice(0, 5).map((t: any) => t.id),
            );
          } catch {
            setSelectedPieTables(
              dashboard.tablesSummary.slice(0, 5).map((t: any) => t.id),
            );
          }
        } else {
          setSelectedPieTables(
            dashboard.tablesSummary.slice(0, 5).map((t: any) => t.id),
          );
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.id]); // ← NOT [] — must depend on user.id

  useEffect(() => {
    if (initialized) {
      setLocalOrder(order);
    }
  }, [initialized, order]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localOrder.indexOf(active.id as WidgetId);
    const newIndex = localOrder.indexOf(over.id as WidgetId);
    const newOrder = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrder);
    saveOrder(newOrder); // now saves with correct user ID
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(n);

  // ─── Widget renderers ─────────────────────────────────────────────────────
  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case "asset_tags":
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Your Tables
              </p>
              <button
                onClick={openTilePicker}
                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
              >
                <Settings2 size={13} />
                Customize
              </button>
            </div>

            {tilesTableData.length === 0 ? (
              <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-6 text-center">
                <p className="text-sm text-gray-400">
                  No tables selected. Click Customize to pick up to 4.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {tilesTableData.map((table, index) => (
                  <AnimatedTile key={table.id} table={table} index={index} />
                ))}
              </div>
            )}
          </div>
        );

      case "cost_growth":
        if (!costStats || costStats.totalSpend === 0) return null;
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                    Cost Growth — {new Date().getFullYear()}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Monthly spend trend
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {fmt(costStats.monthlySpend)} this month
                </p>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={costStats.monthlyTrend}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#8892a4" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#8892a4" }}
                    width={55}
                    tickFormatter={(v) =>
                      `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1d2e",
                      border: "1px solid #2a2d3e",
                      borderRadius: "8px",
                      color: "#e2e8f0",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => [fmt(v), "Spend"]}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#costGrad)"
                    dot={{ fill: "#10b981", r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Cost by Table
              </h2>
              <p className="text-xs text-gray-400 mb-3">
                Grand total:{" "}
                <span className="font-semibold text-emerald-500">
                  {fmt(costStats.totalSpend)}
                </span>
              </p>
              <div className="space-y-3">
                {costStats.byTable.slice(0, 5).map((table, index) => {
                  const max = Math.max(
                    ...costStats.byTable.map((t) => t.totalCost),
                    1,
                  );
                  return (
                    <div key={table.tableId}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                            {table.tableName}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white shrink-0 ml-2">
                          {fmt(table.totalCost)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(table.totalCost / max) * 100}%`,
                            backgroundColor:
                              PIE_COLORS[index % PIE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "monthly_chart_and_pie_chart":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Pie Chart */}
            <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                    Category Distribution
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {pieData.length} of {data?.totalTables ?? 0} tables shown
                  </p>
                </div>
                <button
                  onClick={openPiePicker}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors shrink-0"
                  title="Customize"
                >
                  <Settings2 size={15} />
                </button>
              </div>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  No tables selected
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background:
                            "linear-gradient(135deg, #FFCDD2 0%, #F8BBD0 50%, #E1BEE7 100%)",
                          border: "2px solid #CE93D8",
                          borderRadius: "12px",
                          color: "#4A148C",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {pieData.map((entry, index) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 font-medium">
                          {totalPieValue > 0
                            ? ((entry.value / totalPieValue) * 100).toFixed(1)
                            : 0}
                          %
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Bar Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
              <div className="mb-4">
                <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  Items Added — {new Date().getFullYear()}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Total records added per month across all tables
                </p>
              </div>
              {monthlyData.every((m) => m.count === 0) ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData} barGap={4}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#8892a4" }}
                      interval={window.innerWidth < 640 ? 1 : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#8892a4" }}
                      width={25}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1d2e",
                        border: "1px solid #2a2d3e",
                        borderRadius: "8px",
                        color: "#e2e8f0",
                        fontSize: "12px",
                      }}
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      formatter={(value) => [`${value} records`, "Added"]}
                    />
                    <Bar
                      dataKey="count"
                      name="Records Added"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );

      case "overall_records":
        return (
          <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 dark:border-[#2a2d3e]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  Overall Records
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {data?.totalRows ?? 0} total records across{" "}
                  {data?.totalTables ?? 0} tables
                </p>
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {data?.totalRows ?? 0}
              </div>
            </div>

            {(data?.tablesSummary ?? []).length === 0 ? (
              <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
                No tables yet
              </div>
            ) : (
              <div className="space-y-3">
                {[...(data?.tablesSummary ?? [])]
                  .sort((a, b) => b.rowCount - a.rowCount)
                  .map((table, index) => {
                    const maxCount = Math.max(
                      ...(data?.tablesSummary ?? []).map((t) => t.rowCount),
                      1,
                    );
                    const percentage =
                      maxCount > 0 ? (table.rowCount / maxCount) * 100 : 0;
                    const total = data?.totalRows ?? 0;
                    const share =
                      total > 0
                        ? ((table.rowCount / total) * 100).toFixed(1)
                        : "0";

                    return (
                      <div key={table.id} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  PIE_COLORS[index % PIE_COLORS.length],
                              }}
                            />
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                              {table.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-gray-400">
                              {share}%
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">
                              {table.rowCount}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor:
                                PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );

      case "recent_activity": {
        const todayCount = (data?.recentActivity ?? []).filter(
          (a) =>
            new Date(a.timestamp).toDateString() === new Date().toDateString(),
        ).length;

        const mostActiveTable = (data?.tablesSummary ?? []).reduce(
          (max, t) => (t.rowCount > max.rowCount ? t : max),
          { name: "—", rowCount: 0, id: "", fieldCount: 0 },
        );

        const totalRows = data?.totalRows ?? 0;

        const formatTimestamp = (ts: string) => {
          const d = new Date(ts);
          const date = d.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
          });
          const time = d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const isToday = d.toDateString() === new Date().toDateString();
          return isToday ? `Today · ${time}` : `${date} · ${time}`;
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ── Recent Activity ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 border border-gray-100 dark:border-[#2a2d3e]">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h2>
                <span className="ml-auto text-xs text-gray-400">
                  {(data?.recentActivity ?? []).length} events
                </span>
              </div>
              {(data?.recentActivity ?? []).length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-400 text-xs">
                  No recent activity
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {data?.recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#0f1117] transition-colors"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                          item.action === "created"
                            ? "bg-emerald-500"
                            : "bg-blue-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                          <span className="font-medium">{item.actorName}</span>{" "}
                          <span className="text-gray-400">
                            {item.action === "created"
                              ? "added to"
                              : "updated in"}
                          </span>{" "}
                          <span className="text-indigo-500 font-medium">
                            {item.tableName}
                          </span>
                        </p>
                        {/* ← Date + time */}
                        <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">
                          {formatTimestamp(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Top Growing Tables (middle column) ─────────────────────────── */}
            <div className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm p-4 border border-gray-100 dark:border-[#2a2d3e]">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-emerald-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Top Growing Tables
                </h2>
              </div>

              {(data?.tablesSummary ?? []).length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-400 text-xs">
                  No tables yet
                </div>
              ) : (
                <div className="space-y-4">
                  {[...(data?.tablesSummary ?? [])]
                    .sort((a, b) => b.rowCount - a.rowCount)
                    .slice(0, 4)
                    .map((table, index) => {
                      // Calculate growth: compare this month vs last month using recentActivity
                      const now = new Date();
                      const thisMonthStart = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        1,
                      );
                      const lastMonthStart = new Date(
                        now.getFullYear(),
                        now.getMonth() - 1,
                        1,
                      );

                      // Count additions this month and last month from recentActivity
                      const thisMonthAdds = (data?.recentActivity ?? []).filter(
                        (a) =>
                          a.tableName === table.name &&
                          a.action === "created" &&
                          new Date(a.timestamp) >= thisMonthStart,
                      ).length;

                      const lastMonthAdds = (data?.recentActivity ?? []).filter(
                        (a) =>
                          a.tableName === table.name &&
                          a.action === "created" &&
                          new Date(a.timestamp) >= lastMonthStart &&
                          new Date(a.timestamp) < thisMonthStart,
                      ).length;

                      const growth = thisMonthAdds - lastMonthAdds;
                      const isGrowing = growth > 0;
                      const isNew = lastMonthAdds === 0 && thisMonthAdds > 0;

                      const maxRows = Math.max(
                        ...(data?.tablesSummary ?? []).map((t) => t.rowCount),
                        1,
                      );
                      const pct = Math.round((table.rowCount / maxRows) * 100);

                      return (
                        <div key={table.id} className="group">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            {/* Rank + name */}
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${PIE_COLORS[index % PIE_COLORS.length]}25`,
                                  color: PIE_COLORS[index % PIE_COLORS.length],
                                }}
                              >
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                  {table.name}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {table.rowCount} total records
                                </p>
                              </div>
                            </div>

                            {/* Growth badge */}
                            <div className="shrink-0 text-right">
                              {thisMonthAdds > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  +{thisMonthAdds} this month
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 dark:text-gray-600">
                                  No change
                                </span>
                              )}
                              {lastMonthAdds > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {lastMonthAdds > 0
                                    ? `${lastMonthAdds} last month`
                                    : "—"}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                backgroundColor:
                                  PIE_COLORS[index % PIE_COLORS.length],
                              }}
                            />
                          </div>

                          {/* Growth trend pill */}
                          {(isGrowing || isNew) && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                  isNew
                                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                                    : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                }`}
                              >
                                {isNew ? "🆕 New" : `↑ ${growth} vs last month`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* ── Quick Stats (right column) ───────────────────────────────────── */}
            <div className="flex flex-col gap-3">
              {/* Total Records gradient card */}
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-sm">
                <p className="text-xs font-medium text-indigo-200 mb-1">
                  Total Records
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  <AnimatedNumber value={totalRows} />
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="h-1 flex-1 bg-indigo-400/40 rounded-full overflow-hidden">
                    <div className="h-full bg-white/60 rounded-full w-full" />
                  </div>
                  <p className="text-xs text-indigo-200 shrink-0">
                    {data?.totalTables ?? 0} tables
                  </p>
                </div>
              </div>

              {/* Today's Activity */}
              <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">
                      Today's Activity
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      <AnimatedNumber value={todayCount} />
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      changes today
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${
                      todayCount > 0
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        todayCount > 0
                          ? "bg-emerald-500 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Most Records */}
              <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">Most Records</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {mostActiveTable.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                      style={{
                        width:
                          totalRows > 0
                            ? `${Math.min((mostActiveTable.rowCount / totalRows) * 100, 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 tabular-nums">
                    <AnimatedNumber value={mostActiveTable.rowCount} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "dropdown_stats":
        if (dropdownStats.length === 0) return null;

        // Group dropdown stats by table
        const groupedByTable = dropdownStats.reduce(
          (acc, stat) => {
            if (!acc[stat.tableId]) {
              acc[stat.tableId] = {
                tableId: stat.tableId,
                tableName: stat.tableName,
                fields: [],
              };
            }
            acc[stat.tableId].fields.push(stat);
            return acc;
          },
          {} as Record<
            string,
            { tableId: string; tableName: string; fields: typeof dropdownStats }
          >,
        );

        const tableGroups = Object.values(groupedByTable);

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                Dropdown Distribution
              </h2>
              <span className="text-xs text-gray-400">
                {tableGroups.length} tables · {dropdownStats.length} fields
              </span>
            </div>

            <div className="space-y-4">
              {tableGroups.map((group, groupIndex) => (
                <div
                  key={group.tableId}
                  className="bg-white dark:bg-[#1a1d2e] rounded-xl shadow-sm border border-gray-100 dark:border-[#2a2d3e] overflow-hidden"
                >
                  {/* Table header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-[#2a2d3e] bg-gray-50 dark:bg-[#0f1117]">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          PIE_COLORS[groupIndex % PIE_COLORS.length],
                      }}
                    />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {group.tableName}
                    </h3>
                    <span className="text-xs text-gray-400">
                      {group.fields.length} dropdown field
                      {group.fields.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Fields inside this table */}
                  <div
                    className={`grid gap-0 ${group.fields.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"} divide-y sm:divide-y-0 sm:divide-x divide-gray-50 dark:divide-[#2a2d3e]`}
                  >
                    {group.fields.map((stat) => (
                      <div
                        key={`${stat.tableId}-${stat.fieldName}`}
                        className="p-4"
                      >
                        {/* Field name */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            {stat.fieldName}
                          </span>
                          <span className="text-xs text-gray-400">
                            {stat.total} records
                          </span>
                        </div>

                        {/* Option badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {stat.options.map((opt) => (
                            <span
                              key={opt.label}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${opt.color}18`,
                                color: opt.color,
                                border: `1px solid ${opt.color}35`,
                              }}
                            >
                              {opt.label}
                              <span className="font-bold">{opt.count}</span>
                            </span>
                          ))}
                        </div>

                        {/* Progress bars */}
                        <div className="space-y-2">
                          {stat.options
                            .sort((a, b) => b.count - a.count)
                            .map((opt) => (
                              <div key={opt.label}>
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {opt.label}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {stat.total > 0
                                      ? (
                                          (opt.count / stat.total) *
                                          100
                                        ).toFixed(0)
                                      : 0}
                                    %
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${stat.total > 0 ? (opt.count / stat.total) * 100 : 0}%`,
                                      backgroundColor: opt.color,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) return <SkeletonDashboard />;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            Welcome back, {user?.name}! Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              onClick={() => {
                resetLayout();
                setLocalOrder(DEFAULT_ORDER);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d3e] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2d3e] transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
          <button
            onClick={() => setIsEditing((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              isEditing
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2a2d3e] hover:bg-gray-50 dark:hover:bg-[#2a2d3e]"
            }`}
          >
            {isEditing ? <X size={12} /> : <Settings2 size={12} />}
            {isEditing ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      {/* Draggable widgets */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {localOrder.map((widgetId) => {
              const content = renderWidget(widgetId);
              if (!content && !isEditing) return null;
              return (
                <SortableWidget
                  key={widgetId}
                  id={widgetId}
                  isEditing={isEditing}
                  isHidden={hidden.includes(widgetId)}
                  onToggleHide={() => toggleHidden(widgetId)}
                >
                  {content ?? (
                    <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] p-4 text-center text-xs text-gray-400">
                      {WIDGET_LABELS[widgetId]} — no data yet
                    </div>
                  )}
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Tile Picker Modal */}
      {showTilePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Customize Tiles
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pick up to 4 tables ({draftTiles.length}/4)
                </p>
              </div>
              {/* X = cancel: closes without touching selectedTiles/localStorage */}
              <button
                onClick={() => setShowTilePicker(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              {data?.tablesSummary.map((table) => {
                const isSelected = draftTiles.includes(table.id);
                const isDisabled = !isSelected && draftTiles.length >= 4;
                return (
                  <button
                    key={table.id}
                    onClick={() => toggleDraftTile(table.id)}
                    disabled={isDisabled}
                    className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      isDisabled
                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2d3e]"
                    }`}
                  >
                    <span>{table.name}</span>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
              {/* Save = commit draft to selectedTiles + localStorage (per-user key) */}
              <button
                onClick={handleSaveTiles}
                className="w-full py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pie Chart Picker Modal */}
      {showPiePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Customize Pie Chart
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pick up to 5 tables ({draftPieTables.length}/5)
                </p>
              </div>
              {/* X = cancel: closes without touching selectedPieTables/localStorage */}
              <button
                onClick={() => setShowPiePicker(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              {data?.tablesSummary.map((table) => {
                const isSelected = draftPieTables.includes(table.id);
                const isDisabled = !isSelected && draftPieTables.length >= 5;
                return (
                  <button
                    key={table.id}
                    onClick={() => toggleDraftPieTable(table.id)}
                    disabled={isDisabled}
                    className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      isDisabled
                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2d3e]"
                    }`}
                  >
                    <span>{table.name}</span>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && <Check size={11} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
              {/* Save = commit draft to selectedPieTables + localStorage (per-user key) */}
              <button
                onClick={handleSavePie}
                className="w-full py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
