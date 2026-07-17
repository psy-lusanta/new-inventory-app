import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, X, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

interface Props {
  forced?: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ forced = false, onClose }: Props) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { logout } = useAuth()

  const handleSubmit = async () => {
    setError('')
    if (!currentPassword) { setError('Current password is required'); return }
    if (!newPassword || newPassword.length < 6) { setError('New password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    if (currentPassword === newPassword) { setError('New password must be different from current password'); return }

    setIsLoading(true)
    try {
      await authApi.changeOwnPassword(currentPassword, newPassword)
      showToast('Password changed successfully')
      // Update localStorage user to reflect mustChangePassword: false
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        const parsed = JSON.parse(savedUser)
        localStorage.setItem('user', JSON.stringify({ ...parsed, mustChangePassword: false }))
      }
      onClose()
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to change password'
      if (message.toLowerCase().includes('current password') || err.response?.status === 401) {
        showToast('Incorrect current password — logging out for security', 'error')
        setTimeout(() => logout(), 2000)
        return
      }
    }
    finally {
      setIsLoading(false)
    }
  }

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0,0,0,0.7)',
        }}
        onClick={forced ? undefined : onClose}
      >
        <div
          className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-[#2a2d3e]">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2.5 rounded-xl">
                <Lock size={18} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {forced ? 'Set Your Password' : 'Change Password'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {forced
                    ? `Welcome, ${user?.name}! Please set a new password before continuing.`
                    : 'Update your account password'}
                </p>
              </div>
            </div>
            {!forced && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {forced && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Your account was created by an admin. For security, please set your own password now.
                </p>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Password strength indicator */}
              {newPassword && (
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4].map((level) => {
                    const strength =
                      newPassword.length >= 12 ? 4
                        : newPassword.length >= 10 ? 3
                          : newPassword.length >= 8 ? 2
                            : newPassword.length >= 6 ? 1 : 0
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${level <= strength
                          ? strength === 1 ? 'bg-red-400'
                            : strength === 2 ? 'bg-amber-400'
                              : strength === 3 ? 'bg-blue-400'
                                : 'bg-emerald-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                      />
                    )
                  })}
                  <span className="text-xs text-gray-400 ml-1">
                    {newPassword.length < 6 ? 'Too short'
                      : newPassword.length < 8 ? 'Weak'
                        : newPassword.length < 10 ? 'Fair'
                          : newPassword.length < 12 ? 'Good'
                            : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${confirmPassword && confirmPassword !== newPassword
                    ? 'border-red-400 dark:border-red-600'
                    : confirmPassword && confirmPassword === newPassword
                      ? 'border-emerald-400 dark:border-emerald-600'
                      : 'border-gray-200 dark:border-[#2a2d3e]'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {confirmPassword && confirmPassword === newPassword && (
                <p className="text-xs text-emerald-500 mt-1">✓ Passwords match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
            {!forced && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }