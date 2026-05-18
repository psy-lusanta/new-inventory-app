import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import ModalManager from '../modals/ModalManager'

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0f1117]">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ModalManager />
    </div>
  )
}