import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { authApi } from '../lib/api'
import { User, Mail, Shield, Calendar } from 'lucide-react'
import { SkeletonSettings } from '../components/ui/Skeleton'

export default function SettingsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  // Show skeleton only while user is loading from AuthContext
  if (!user) return <SkeletonSettings />

  const hasChanges = name !== user.name || email !== user.email

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setIsSaving(true)
    try {
      await authApi.updateProfile({ name: name.trim(), email: email.trim() })
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        const parsed = JSON.parse(savedUser)
        localStorage.setItem('user', JSON.stringify({ ...parsed, name: name.trim(), email: email.trim() }))
      }
      showToast('Profile updated successfully')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">Manage your account information</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {(name || user.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">{user.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
            <span className={`inline-flex items-center gap-1 mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              user.role === 'admin'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : user.role === 'staff'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              <Shield size={10} />
              {user.role.charAt(0).toUpperCase()}{user.role.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User size={15} className="text-gray-400" />
          Personal Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })) }}
              placeholder="Your full name"
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-400' : 'border-gray-200 dark:border-[#2a2d3e]'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })) }}
                placeholder="your@email.com"
                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.email ? 'border-red-400' : 'border-gray-200 dark:border-[#2a2d3e]'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div className="pt-2 flex items-center justify-between">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={11} />
              Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            </p>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield size={15} className="text-gray-400" />
          Account Details
        </h2>
        <div className="space-y-3">
          {[
            { label: 'User ID', value: user.id?.slice(0, 8).toUpperCase() ?? '—' },
            { label: 'Role', value: user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—' },
            { label: 'Account Created', value: user.createdAt ? new Date(user.createdAt).toLocaleString() : '—' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-[#2a2d3e] last:border-0">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}