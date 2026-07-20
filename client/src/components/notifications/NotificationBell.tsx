import { useEffect, useState, useRef } from 'react'
import { Bell, X, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { notificationsApi } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  link: string | null
  createdAt: string
}

const TYPE_STYLES = {
  info: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  error: 'text-red-500 bg-red-50 dark:bg-red-900/20',
}

const TYPE_ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getAll()
      setNotifications(res.data.data.notifications)
      setUnreadCount(res.data.data.unreadCount)
    } catch {}
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await notificationsApi.delete(id)
    const notif = notifications.find((n) => n.id === id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (notif && !notif.isRead) setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleClick = async (notif: Notification) => {
    if (!notif.isRead) await handleMarkRead(notif.id)
    if (notif.link) {
      navigate(notif.link)
      setIsOpen(false)
    }
  }

  const buttonRect = buttonRef.current?.getBoundingClientRect()

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((p) => !p)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && buttonRect && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: buttonRect.bottom + 8,
            right: window.innerWidth - buttonRect.right,
            zIndex: 9999,
            width: '360px',
          }}
          className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl border border-gray-100 dark:border-[#2a2d3e] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2a2d3e]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-[#2a2d3e]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type]
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0f1117] transition-colors ${
                      !notif.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${TYPE_STYLES[notif.type]}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-medium ${!notif.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {notif.title}
                        </p>
                        <button
                          onClick={(e) => handleDelete(notif.id, e)}
                          className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 shrink-0 mt-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}