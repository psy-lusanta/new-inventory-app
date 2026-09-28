import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  FileBarChart,
  Users,
  Table2,
  ChevronDown,
  ChevronRight,
  FilePen,
  ScrollText,
  DollarSign,
} from 'lucide-react'
import { tablesApi } from '../../lib/api'
import { useModal } from '../../context/ModalContext'
import { useState } from 'react'
import GTOLogo from "../../photos/gto-logo-black-bg.png";

interface InventoryTable {
  id: string
  name: string
  _count?: { rows: number }
}

const staticNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/cost', label: 'Cost', icon: DollarSign },  
  { to: '/accountability', label: 'Accountability Form', icon: FilePen },
  { to: '/logs', label: 'Logs', icon: ScrollText, adminOnly: true },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
]

export default function Sidebar() {
  const { user, isAdmin } = useAuth()
  const { tableRefreshKey, isSidebarOpen, setSidebarOpen } = useModal()
  const [tables, setTables] = useState<InventoryTable[]>([])
  const [tablesExpanded, setTablesExpanded] = useState(true)
  const [isLoadingTables, setIsLoadingTables] = useState(true)

  useEffect(() => {
    const fetchTables = async () => {
      setIsLoadingTables(true)
      try {
        const res = await tablesApi.getAll()
        setTables(res.data.data)
      } catch (error) {
        console.error('Failed to fetch tables:', error)
      } finally {
        setIsLoadingTables(false)
      }
    }
    fetchTables()
  }, [tableRefreshKey])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    handleResize() // run once on mount
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg">
            <img src={GTOLogo} />
          </div>
          <div>
            <span className="font-bold text-lg text-white">Inventory</span>
            <p className="text-xs text-gray-400">
              {user?.role === 'admin' ? 'Admin Panel' : user?.role === 'staff' ? 'Staff Panel' : 'Viewer'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {staticNavItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="truncate flex-1">{item.label}</span>
            </NavLink>
          )
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
            {tablesExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {isLoadingTables ? (
            <div className="space-y-1 px-2 mt-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-7 bg-gray-700/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : tables.length === 0 ? (
            <p className="px-4 py-2 text-xs text-gray-600">
              {isAdmin ? 'No tables yet. Create one!' : 'No tables yet.'}
            </p>
          ) : (
            tables.map((table) => (
              <NavLink
                key={table.id}
                to={`/tables/${table.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                <span className="truncate flex-1">{table.name}</span>
                {table._count !== undefined && (
                  <span className="text-xs opacity-40 shrink-0">{table._count.rows}</span>
                )}
              </NavLink>
            ))
          )}
        </div>
      </nav>

      {/* User info */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-gray-900 text-white flex flex-col z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <SidebarContent />
      </aside>
    </>
  )
}