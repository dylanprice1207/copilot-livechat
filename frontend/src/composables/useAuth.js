import { ref, computed } from 'vue'

const user = ref(null)
const token = ref(localStorage.getItem('token'))

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  const loadUserInfo = () => {
    if (token.value) {
      try {
        const payload = JSON.parse(atob(token.value.split('.')[1]))
        user.value = {
          id: payload.id,
          username: payload.username || 'User',
          role: payload.role || 'agent',
          email: payload.email
        }
        // Store user info for persistence
        localStorage.setItem('user', JSON.stringify(user.value))
      } catch (error) {
        console.error('Error parsing token:', error)
        user.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    } else {
      // Try to load from localStorage if no token
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          user.value = JSON.parse(storedUser)
        } catch (error) {
          user.value = null
          localStorage.removeItem('user')
        }
      } else {
        user.value = null
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    token.value = null
    user.value = null
    return Promise.resolve()
  }

  const setToken = (newToken) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
    loadUserInfo()
    // Store user info in localStorage for persistence
    if (user.value) {
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  const login = async (credentials) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (response.ok) {
        setToken(data.token)
        return { success: true, user: user.value }
      } else {
        return { success: false, error: data.message }
      }
    } catch (error) {
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  // Initialize
  loadUserInfo()

  return {
    user,
    token,
    isAuthenticated,
    logout,
    login,
    setToken,
    loadUserInfo
  }
}