import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../lib/api'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff' | 'viewer'
  mustChangePassword: boolean
  createdAt: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAdmin: boolean
  isStaffOrAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ─── Verify session on mount ──────────────────────────────────────────────
  useEffect(() => {
    // Optimistically load from localStorage for instant UI
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)) } catch {}
    }

    // Then verify with server
    authApi.me()
    
      .then((res) => {
        setUser(res.data.data)
        localStorage.setItem('user', JSON.stringify(res.data.data))
      })
      .catch(() => {
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { user } = res.data.data
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    authApi.logout().catch(() => {})
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isLoading,
      isAdmin: user?.role === 'admin',
      isStaffOrAdmin: user?.role === 'admin' || user?.role === 'staff',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}