<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>
          <i class="fas fa-user-shield"></i>
          Staff Login
        </h2>
        <p>Access your agent dashboard</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="error" class="alert alert-error">
          <i class="fas fa-exclamation-circle"></i>
          {{ error }}
        </div>

        <div class="form-group">
          <label for="username">
            <i class="fas fa-user"></i>
            Username
          </label>
          <input
            id="username"
            v-model="credentials.username"
            type="text"
            class="form-control"
            placeholder="Enter your username"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">
            <i class="fas fa-lock"></i>
            Password
          </label>
          <input
            id="password"
            v-model="credentials.password"
            type="password"
            class="form-control"
            placeholder="Enter your password"
            required
            :disabled="loading"
          />
        </div>

        <button 
          type="submit" 
          class="btn btn-primary btn-full"
          :disabled="loading || !credentials.username || !credentials.password"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-sign-in-alt"></i>
          {{ loading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>

      <div class="login-footer">
        <p>
          <i class="fas fa-info-circle"></i>
          For customer support, <a href="/chat">click here</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

export default {
  name: 'StaffLogin',
  setup() {
    const router = useRouter()
    const { login } = useAuth()
    
    const loading = ref(false)
    const error = ref('')
    
    const credentials = reactive({
      username: '',
      password: ''
    })

    const handleLogin = async () => {
      loading.value = true
      error.value = ''

      try {
        const result = await login(credentials)
        
        if (result.success) {
          // Redirect based on user role
          if (result.user.role === 'agent') {
            router.push('/agent')
          } else if (result.user.role === 'admin') {
            router.push('/admin')
          } else if (result.user.role === 'global_admin') {
            router.push('/global-admin')
          } else {
            router.push('/admin')
          }
        } else {
          error.value = result.error || 'Login failed'
        }
      } catch (err) {
        error.value = 'An unexpected error occurred'
        console.error('Login error:', err)
      } finally {
        loading.value = false
      }
    }

    return {
      credentials,
      loading,
      error,
      handleLogin
    }
  }
}
</script>

<style scoped>
/* Fallback for Font Awesome icons */
.fas, .far, .fab, .fal, .fad, .fa {
  font-family: "Font Awesome 6 Free", "Font Awesome 6 Pro", "FontAwesome", sans-serif;
  font-weight: 900;
  display: inline-block;
  font-style: normal;
  font-variant: normal;
  text-rendering: auto;
  line-height: 1;
}

.fa-user-shield:before { content: "ðŸ›¡ï¸"; }
.fa-user:before { content: "ðŸ‘¤"; }
.fa-lock:before { content: "ðŸ”’"; }
.fa-sign-in-alt:before { content: "ðŸ”‘"; }
.fa-spinner:before { content: "â­•"; }
.fa-info-circle:before { content: "â„¹ï¸"; }
.fa-exclamation-circle:before { content: "âš ï¸"; }

.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}

.login-header {
  text-align: center;
  padding: 40px 30px 20px;
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
}

.login-header h2 {
  margin: 0 0 10px 0;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.login-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.login-form {
  padding: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #1e88e5;
}

.form-control:disabled {
  background: #f8f9fa;
  opacity: 0.7;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
}

.btn-full {
  width: 100%;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.alert {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.alert-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.login-footer {
  padding: 20px 30px 30px;
  text-align: center;
  border-top: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.login-footer p {
  margin: 0;
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.login-footer a {
  color: #1e88e5;
  text-decoration: none;
}

.login-footer a:hover {
  text-decoration: underline;
}

.fa-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 480px) {
  .login-container {
    padding: 10px;
  }
  
  .login-card {
    border-radius: 8px;
  }
  
  .login-header {
    padding: 30px 20px 15px;
  }
  
  .login-form {
    padding: 20px;
  }
  
  .login-footer {
    padding: 15px 20px 20px;
  }
}
</style>

