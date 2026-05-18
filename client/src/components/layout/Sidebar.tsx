import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../context/ModalContext";
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  Package,
  Menu,
  X,
  Table2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { tablesApi } from "../../lib/api";

interface InventoryTable {
  id: string;
  name: string;
}

const staticNavItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alerts", label: "Low Stock Alerts", icon: AlertTriangle },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
];

export default function Sidebar() {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [tables, setTables] = useState<InventoryTable[]>([]);
  const [tablesExpanded, setTablesExpanded] = useState(true);

  const { tableRefreshKey } = useModal();

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await tablesApi.getAll();
        setTables(res.data.data);
      } catch (error) {
        console.error("Failed to fetch tables:", error);
      }
    };
    fetchTables();
  }, [tableRefreshKey]);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Package size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-white">Inventori</span>
            <p className="text-xs text-gray-400">
              {user?.role === "admin"
                ? "Admin Panel"
                : user?.role === "staff"
                  ? "Staff Panel"
                  : "Viewer"}
            </p>
          </div>
        </div>
        <button
          className="lg:hidden text-gray-400 hover:text-white"
          onClick={() => setIsOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {/* Static nav items */}
        {staticNavItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}

        {/* Divider */}
        <div className="pt-2 pb-1">
          <div className="border-t border-gray-700" />
        </div>

        {/* Tables section */}
        <div>
          <button
            onClick={() => setTablesExpanded((prev) => !prev)}
            className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Table2 size={13} />
              Tables
            </div>
            {tablesExpanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </button>

          {tablesExpanded && (
            <div className="mt-1 space-y-0.5">
              {tables.length === 0 ? (
                <p className="px-4 py-2 text-xs text-gray-600">
                  {isAdmin ? "No tables yet. Create one!" : "No tables yet."}
                </p>
              ) : (
                tables.map((table) => (
                  <NavLink
                    key={table.id}
                    to={`/tables/${table.id}`}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`
                    }
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    <span className="truncate">{table.name}</span>
                  </NavLink>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-lg shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`lg:hidden fixed top-0 left-0 h-screen w-64 bg-gray-900 text-white flex flex-col z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>

      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 bg-gray-900 text-white flex-col z-40">
        <SidebarContent />
      </aside>
    </>
  );
}
