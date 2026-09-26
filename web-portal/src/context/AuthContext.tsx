import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authErrorMessage, authService } from '../services/auth'
import { tokenKey } from '../services/api'
import type { Role, User } from '../types'

interface AuthResult { success: boolean; message?: string }
interface AuthContextValue {
  user: User | null
  login: (email: string, password: string, remember: boolean) => Promise<AuthResult>
  register: (name: string, email: string, password: string, remember: boolean, role?: string) => Promise<AuthResult>
  logout: () => void
  switchRole: (role: Role) => void
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const storageKey = 'minsos-session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { const saved = localStorage.getItem(storageKey) ?? sessionStorage.getItem(storageKey); return saved ? JSON.parse(saved) as User : null } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenKey) ?? sessionStorage.getItem(tokenKey))
  const [persistent, setPersistent] = useState(() => Boolean(localStorage.getItem(storageKey)))
  useEffect(() => {
    localStorage.removeItem(storageKey); sessionStorage.removeItem(storageKey); localStorage.removeItem(tokenKey); sessionStorage.removeItem(tokenKey)
    if (user && token) { const store = persistent ? localStorage : sessionStorage; store.setItem(storageKey, JSON.stringify(user)); store.setItem(tokenKey, token) }
  }, [user, token, persistent])
  const value = useMemo<AuthContextValue>(() => ({
    user,
    login: async (email, password, remember) => {
      try {
        const session = await authService.login(email.trim(), password)
        setPersistent(remember); setUser(session.user); setToken(session.token)
        return { success: true }
      } catch (error) { return { success: false, message: authErrorMessage(error) } }
    },
    register: async (name, email, password, remember, role) => {
      try {
        const session = await authService.register(name.trim(), email.trim(), password, role)
        setPersistent(remember); setUser(session.user); setToken(session.token)
        return { success: true }
      } catch (error) { return { success: false, message: authErrorMessage(error) } }
    },
    logout: () => { setUser(null); setToken(null) },
    switchRole: (newRole: Role) => {
      setUser((prev) => (prev ? { ...prev, role: newRole } : null))
    }
  }), [user, token, persistent])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }
