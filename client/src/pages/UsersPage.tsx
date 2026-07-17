import { useEffect, useState } from 'react'
import { authApi } from '../lib/api'
import { Plus, X, Shield, Eye, Briefcase, Trash2, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff' | 'viewer'
  createdAt: string
}

const ROLE_STYLES = {
  admin: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  staff: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  viewer: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

const ROLE_ICONS = { admin: Shield, staff: Briefcase, viewer: Eye }

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ─── Create user modal ────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' })
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // ─── Reset password modal ─────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  // ─── Delete ───────────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      const res = await authApi.getUsers()
      setUsers(res.data.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreateUser = async () => {
    setFormError('')
    if (!form.name || !form.email || !form.password) {
      setFormError('All fields are required')
      return
    }
    setIsSaving(true)
    try {
      const res = await authApi.createUser(form)
      setUsers((prev) => [res.data.data, ...prev])
      setShowCreateModal(false)
      setForm({ name: '', email: '', password: '', role: 'viewer' })
      showToast('User created successfully')
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create user')
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = async () => {
    setResetError('')
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters')
      return
    }
    if (!resetTarget) return
    setIsResetting(true)
    try {
      await authApi.resetPassword(resetTarget.id, newPassword)
      showToast(`Password reset for ${resetTarget.name}`)
      setResetTarget(null)
      setNewPassword('')
    } catch (err: any) {
      setResetError(err.response?.data?.error || 'Failed to reset password')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Delete "${user.name}"? This cannot be undone.`)) return
    setDeletingId(user.id)
    try {
      await authApi.deleteUser(user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      showToast('User deleted')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400 text-sm">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
            {users.length} user{users.length !== 1 ? 's' : ''} in the system
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add User</span>
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-gray-100 dark:border-[#2a2d3e] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-[#2a2d3e] bg-gray-50 dark:bg-[#0f1117]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-[#2a2d3e]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const RoleIcon = ROLE_ICONS[user.role]
                  const isSelf = user.id === currentUser?.id
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#0f1117] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {user.name}
                              {isSelf && (
                                <span className="ml-2 text-xs text-indigo-500">(you)</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_STYLES[user.role]}`}>
                          <RoleIcon size={11} />
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setResetTarget(user); setNewPassword(''); setResetError('') }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Reset password"
                          >
                            <KeyRound size={14} />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={deletingId === user.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Add User</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'john@example.com' },
                { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="viewer">Viewer — can only view</option>
                  <option value="staff">Staff — can add and edit rows</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>
              {formError && (
                <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formError}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateUser} disabled={isSaving} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {isSaving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2a2d3e]">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Reset Password</h2>
              <button onClick={() => setResetTarget(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set a new password for <span className="font-medium text-gray-900 dark:text-white">{resetTarget.name}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-[#2a2d3e] rounded-lg bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {resetError && (
                <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{resetError}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2a2d3e]">
              <button onClick={() => setResetTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2d3e] rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleResetPassword} disabled={isResetting} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50">
                {isResetting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}