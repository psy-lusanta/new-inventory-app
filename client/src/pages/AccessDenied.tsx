import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

export default function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl">
        <ShieldOff size={40} className="text-red-400" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Access Denied
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You don't have permission to view this page.
        </p>
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  )
}