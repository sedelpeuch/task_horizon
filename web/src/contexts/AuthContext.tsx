import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { getToken, setToken, clearToken } from '../lib/api'

interface CurrentUser {
  id: string
  name: string
  email: string
  is_admin: boolean
}

interface AuthCtx {
  isAuthenticated: boolean
  currentUser: CurrentUser | null
  login: (token: string, user: CurrentUser) => void
  logout: () => void
}

const USER_KEY = 'taskhorizon_user'

function getStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuth] = useState(!!getToken())
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(getStoredUser)

  const login = (token: string, user: CurrentUser) => {
    setToken(token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setCurrentUser(user)
    setAuth(true)
  }

  const logout = () => {
    clearToken()
    localStorage.removeItem(USER_KEY)
    setCurrentUser(null)
    setAuth(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
