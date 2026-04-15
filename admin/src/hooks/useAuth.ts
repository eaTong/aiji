import { useState, useEffect } from 'react'
import { authApi } from '../api/auth'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      authApi.getProfile()
        .then(() => setIsAuthenticated(true))
        .catch(() => {
          localStorage.removeItem('admin_token')
          setIsAuthenticated(false)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    if (res.data.code === 0) {
      localStorage.setItem('admin_token', res.data.data.token)
      setIsAuthenticated(true)
      return true
    }
    return false
  }

  const logout = async () => {
    await authApi.logout()
    localStorage.removeItem('admin_token')
    setIsAuthenticated(false)
  }

  return { isAuthenticated, loading, login, logout }
}
