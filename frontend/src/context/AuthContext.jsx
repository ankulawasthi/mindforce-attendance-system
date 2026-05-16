import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token')
      const savedUser  = localStorage.getItem('user')
      if (savedToken) {
        setToken(savedToken)
        if (savedUser) setUser(JSON.parse(savedUser)) // optimistic load
        
        try {
          const res = await api.get('/auth/me')
          setUser(res.data)
          localStorage.setItem('user', JSON.stringify(res.data))
        } catch (err) {
          console.error("Failed to hydrate user session")
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)