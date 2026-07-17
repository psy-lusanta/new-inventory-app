import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { authApi } from '../lib/api'
import { User, Lock } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }
    setIsSaving(true)
    try {
      await authApi.resetPassword(user!.id, newPassword)
      showToast('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">Manage your account</p>
      </div>

      {/* Profile info */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <User size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Profile</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-[#2a2d3e] last:border-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium w-24">{item.label}</span>
              <span className="text-sm text-gray-900 dark:text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Lock size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'New Password', value: newPassword, set: setNewPassword },
            { label: 'Confirm Password', value: confirmPassword, set: setConfirmPassword },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{field.label}</label>
              <input
                type="password"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
          <button
            onClick={handleChangePassword}
            disabled={isSaving}
            className="w-full py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 mt-2"
          >
            {isSaving ? 'Saving...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}