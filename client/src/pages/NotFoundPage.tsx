import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50 dark:bg-[#0f1117]">
      <div className="text-center space-y-2">
        <h1 className="text-8xl font-bold text-gray-200 dark:text-gray-700">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Page not found</h2>
        <p className="text-gray-400 text-sm">The page you're looking for doesn't exist.</p>
      </div>
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <Home size={16} />
        Go to Dashboard
      </button>
    </div>
  )
}