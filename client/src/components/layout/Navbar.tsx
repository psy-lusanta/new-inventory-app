import { useState, useRef, useEffect } from 'react'
import { Search, X, ArrowRight, Sun, Moon, Bell, Plus, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { reportsApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useModal } from '../../context/ModalContext'

interface SearchResult {
  tableId: string
  tableName: string
  rowId: string
  data: Record<string, any>
  fields: { fieldName: string; fieldType: string }[]
}

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { openCreateTable } = useModal()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Debounced search ─────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await reportsApi.search(query)
        setResults(res.data.data)
        setShowDropdown(true)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleResultClick = (result: SearchResult) => {
    navigate(`/tables/${result.tableId}`)
    setQuery('')
    setShowDropdown(false)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowDropdown(false)
  }

  const getPreview = (result: SearchResult) => {
    return Object.entries(result.data)
      .slice(0, 2)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ')
  }

  return (
    <header className="h-14 bg-white dark:bg-[#1a1d2e] border-b border-gray-200 dark:border-[#2a2d3e] flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-30">

      {/* Left — Create Table (admin only) */}
      <div className="flex items-center shrink-0 ml-8 lg:ml-0">
        {isAdmin && (
          <button
            onClick={openCreateTable}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Table</span>
          </button>
        )}
      </div>

      {/* Center — Global Search */}
      <div ref={searchRef} className="flex-1 max-w-xl relative mx-auto">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Global search (asset tag, user, etc...)"
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 dark:bg-[#0f1117] border border-gray-200 dark:border-[#2a2d3e] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-[#1a1d2e] dark:text-gray-100 dark:placeholder-gray-500 transition-colors"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1d2e] rounded-xl shadow-lg border border-gray-100 dark:border-[#2a2d3e] overflow-hidden z-50">
            {isSearching ? (
              <div className="p-4 text-sm text-gray-400 text-center">Searching...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">
                No results found for "{query}"
              </div>
            ) : (
              <>
                <div className="px-4 py-2 bg-gray-50 dark:bg-[#0f1117] border-b border-gray-100 dark:border-[#2a2d3e]">
                  <p className="text-xs text-gray-500 font-medium">
                    {results.length} result{results.length > 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-[#2a2d3e]">
                  {results.map((result) => (
                    <button
                      key={result.rowId}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                            {result.tableName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {getPreview(result)}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right — Theme, Notifications, User */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors">
          <Bell size={18} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-[#2a2d3e] mx-1" />

        {/* User Dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
          >
            <div className="bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                {user?.name}
              </p>
              <p className="text-xs text-gray-400 capitalize leading-tight">{user?.role}</p>
            </div>
            <ChevronDown
              size={14}
              className={`hidden sm:block text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1d2e] rounded-xl shadow-lg border border-gray-100 dark:border-[#2a2d3e] overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2a2d3e]">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings') }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors"
                >
                  <Settings size={15} />
                  Settings
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}