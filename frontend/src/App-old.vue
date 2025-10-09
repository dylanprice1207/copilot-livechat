<template>
  <div class="admin-container">
    <!-- Public Routes (like chat and staff login) - No authentication required -->
    <div v-if="$route.meta.public">
      <router-view />
    </div>
    
    <!-- Protected Admin Routes - Authentication required -->
    <div v-else>
      <!-- Global Admin Layout - Standalone without navigation tabs -->
      <div v-if="$route.path === '/global-admin'" class="global-admin-layout">
        <router-view />
      </div>

      <!-- Regular Admin Portal Layout -->
      <div v-else>
        <!-- Header -->
        <div class="header" v-if="user">
          <h1>
            <i class="fas fa-cogs"></i>
            <span v-if="user?.role === 'global_admin'">Global Admin Portal</span>
            <span v-else>Organization Admin Portal</span>
            <span style="font-size: 0.6em; color: #718096; font-weight: normal;">Lightwave AI</span>
          </h1>
          <div class="admin-info">
            <span>{{ user.username }} ({{ user.role }})</span>
            <button class="btn btn-danger" @click="logout">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>

        <!-- Alert Messages -->
        <Transition name="fade">
          <div v-if="alert.show" :class="`alert alert-${alert.type}`">
            <i :class="alert.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
            <span>{{ alert.message }}</span>
          </div>
        </Transition>

        <!-- Navigation Tabs -->
        <div class="nav-tabs" v-if="user">
          <router-link
            v-for="tab in availableTabs"
            :key="tab.path"
            :to="tab.path"
            :class="['nav-tab']"
            active-class="active"
          >
            <i :class="tab.icon"></i> {{ tab.label }}
          </router-link>
        </div>

        <!-- Router View -->
        <div class="tab-content" v-if="user">
          <router-view />
        </div>

        <!-- Redirect to Staff Login if not authenticated -->
        <div v-else class="auth-redirect">
          <p>Redirecting to staff login...</p>
        </div>
      </div>
    </div>
  </div>
</template>
                {{ loggingIn ? 'Logging in...' : 'Login' }}
              </button>
            </form>
            <div class="demo-credentials">
              <h4>Demo Accounts:</h4>
              <p><strong>Global Admin:</strong> globaladmin / globaladmin123</p>
              <p><strong>Regular Admin:</strong> admin / admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// State
const user = ref(null)
const alert = ref({ show: false, type: 'success', message: '' })

// Router
const router = useRouter()
const route = useRoute()

// Available tabs based on user role
const availableTabs = computed(() => {
  if (!user.value) return []
  
  const role = user.value.role
  const tabs = []
  
  // All authenticated users get Dashboard
  tabs.push({ path: '/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' })
  
  // Role-based tab visibility
  switch (role) {
    case 'global_admin':
      // Global admins see everything including Organizations
      tabs.push({ path: '/analytics', label: 'Analytics', icon: 'fas fa-chart-line' })
      tabs.push({ path: '/users', label: 'Users', icon: 'fas fa-users' })
      tabs.push({ path: '/global-admin', label: 'Organizations', icon: 'fas fa-building' })
      break
      
    case 'admin':
      // Organization admins see everything except Organizations
      tabs.push({ path: '/analytics', label: 'Analytics', icon: 'fas fa-chart-line' })
      tabs.push({ path: '/users', label: 'Users', icon: 'fas fa-users' })
      // Note: /global-admin (Organizations) is hidden for org admins
      break
      
    case 'agent':
      // Agents see limited functionality
      tabs.push({ path: '/analytics', label: 'Analytics', icon: 'fas fa-chart-line' })
      // Note: Users tab is hidden for agents
      break
      
    case 'customer':
      // Customers only see chat dashboard
      // Dashboard only - no additional tabs
      break
      
    default:
      // Unknown role - minimal access
      break
  }
  
  return tabs
})

// Methods
const showAlert = (message, type = 'success') => {
  alert.value = { show: true, type, message }
  setTimeout(() => {
    alert.value.show = false
  }, 5000)
}

const logout = () => {
  user.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/')
  showAlert('Logged out successfully')
}

// Check for existing session
onMounted(() => {
  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    user.value = JSON.parse(storedUser)
    if (router.currentRoute.value.path === '/') {
      router.push('/dashboard')
    }
  }
})

// Watch for route changes and redirect unauthenticated users to staff login
watch(() => route.path, (newPath) => {
  if (!route.meta.public && !user.value && newPath !== '/admin') {
    router.push('/admin')
  }
})

// Provide alert function to child components
provide('showAlert', showAlert)
</script>
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: #f7fafc;
}

.header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.header h1 {
  margin: 0;
  color: #2d3748;
  font-size: 1.5em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 15px;
  color: #4a5568;
}

.nav-tabs {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  padding: 8px 16px;
  gap: 8px;
  box-shadow: none;
}

.nav-tab {
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #718096;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  font-size: 14px;
  text-transform: none;
  letter-spacing: normal;
  position: relative;
}

.nav-tab::before {
  display: none;
}

.nav-tab:hover {
  color: #4a5568;
  background: #f7fafc;
  transform: none;
}

.nav-tab.active {
  color: #4299e1;
  background: #ebf8ff;
  border: 1px solid #bee3f8;
}

.tab-content {
  flex: 1;
  overflow: auto;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.back-to-chat {
  text-align: center;
  margin-bottom: 20px;
}

.back-link {
  color: #1e88e5;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #f7fafc;
  transition: all 0.3s ease;
  display: inline-block;
}

.back-link:hover {
  background: #edf2f7;
  color: #553c9a;
  transform: translateY(-1px);
}

.login-subtitle {
  text-align: center;
  color: #718096;
  margin: 10px 0 30px 0;
  font-size: 0.9rem;
}

.login-form h2 {
  text-align: center;
  margin-bottom: 10px;
  color: #2d3748;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #2d3748;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 16px;
}

.form-group input:focus {
  outline: none;
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #4299e1;
  color: white;
  width: 100%;
  justify-content: center;
}

.btn-primary:hover:not(:disabled) {
  background: #3182ce;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background: #f56565;
  color: white;
}

.btn-danger:hover {
  background: #e53e3e;
}

.demo-credentials {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.demo-credentials h4 {
  margin: 0 0 10px 0;
  color: #4a5568;
  font-size: 14px;
}

.demo-credentials p {
  margin: 5px 0;
  font-size: 12px;
  color: #718096;
}

.alert {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1000;
  min-width: 300px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.alert-success {
  background: #48bb78;
}

.alert-error {
  background: #f56565;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .header {
    padding: 15px 20px;
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .nav-tabs {
    padding: 0 15px;
    overflow-x: auto;
  }

  .nav-tab {
    padding: 12px 15px;
    white-space: nowrap;
  }

  .login-form {
    margin: 20px;
    padding: 30px;
  }
}

/* Global Admin Layout Styles - removed to avoid conflicts */
</style>
