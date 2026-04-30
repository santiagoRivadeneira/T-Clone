import { createContext, useContext, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('tc_user')
    return stored ? JSON.parse(stored) : null
  })

  async function login({ email, password }) {
    const data = await api.auth.login({ email, password })
    localStorage.setItem('tc_token', data.token)
    localStorage.setItem('tc_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  async function register({ email, username, displayName, password }) {
    const data = await api.auth.register({ email, username, displayName, password })
    localStorage.setItem('tc_token', data.token)
    localStorage.setItem('tc_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('tc_token')
    localStorage.removeItem('tc_user')
  }

  async function updateUser(updates) {
    const data = await api.auth.updateMe(updates)
    localStorage.setItem('tc_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
