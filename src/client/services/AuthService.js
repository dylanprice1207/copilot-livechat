// Authentication service for client-side auth operations
class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = localStorage.getItem('authToken');
  }

  async login(credentials) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.token;
        this.currentUser = data.user;
        
        // Store token in localStorage
        localStorage.setItem('authToken', this.token);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        return data;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.token) {
        await fetch('/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API fails
    } finally {
      this.clearSession();
    }
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }

  loadStoredSession() {
    try {
      const storedUser = localStorage.getItem('currentUser');
      const storedToken = localStorage.getItem('authToken');
      
      if (storedUser && storedToken) {
        this.currentUser = JSON.parse(storedUser);
        this.token = storedToken;
        return true;
      }
    } catch (error) {
      console.error('Error loading stored session:', error);
      this.clearSession();
    }
    return false;
  }

  isAuthenticated() {
    return !!(this.token && this.currentUser);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getToken() {
    return this.token;
  }

  async getProfile() {
    try {
      if (!this.token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        this.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        return data.user;
      } else {
        throw new Error(data.error || 'Failed to get profile');
      }
    } catch (error) {
      console.error('Profile error:', error);
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.AuthService = AuthService;
}