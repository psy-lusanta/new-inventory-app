import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import ModalManager from '../modals/ModalManager'
import { useModal } from '../../context/ModalContext'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import ChangePasswordModal from '../modals/ChangePasswordModal'
import { useOnlineStatus } from '../crash/UseOnlineStatus'
import { WifiOff } from 'lucide-react'

export default function Layout() {
  const { isSidebarOpen } = useModal()
  const { user } = useAuth()
  const [passwordDismissed, setPasswordDismissed] = useState(false)
  const isOnline = useOnlineStatus()

  const showChangePassword = user?.mustChangePassword && !passwordDismissed

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-[#0f1117]">
      <Sidebar />
      <div className={`flex flex-col min-h-screen min-w-0 flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <Outlet />
        </main>
      </div>
      <ModalManager />

      {/* Force password change on first login */}
      {showChangePassword && (
        <ChangePasswordModal
          forced={true}
          onClose={() => setPasswordDismissed(true)}
        />
      )}

      {!isOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium">
          <WifiOff size={16} />
          No internet connection — changes may not save
        </div>
      )}
    </div>
  )
}