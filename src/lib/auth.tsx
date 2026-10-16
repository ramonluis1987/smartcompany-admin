import { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, logout as apiLogout, onSessionChange, refreshSession } from './api'
import type { User } from './api'

export interface Auth {
  user: User | null
  /** resolves once the session has been restored (or found missing) after a reload */
  ensure: () => Promise<User | null>
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

let current: User | null = null
let restored: Promise<User | null> | null = null

onSessionChange((u) => {
  current = u
})

/** Router-level auth (used by beforeLoad), independent of React rendering. */
export const auth: Auth = {
  get user() {
    return current
  },
  ensure() {
    if (current) return Promise.resolve(current)
    restored ??= refreshSession().then((s) => s?.user ?? null)
    return restored
  },
  async login(email, password) {
    restored = null
    return apiLogin(email, password)
  },
  async logout() {
    restored = null
    await apiLogout()
  },
}

const AuthContext = createContext<User | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(current)
  useEffect(() => {
    const off = onSessionChange((u) => {
      setUser(u)
      if (!u) restored = null
    })
    return () => {
      off()
    }
  }, [])
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}

export function useUser() {
  return useContext(AuthContext)
}
