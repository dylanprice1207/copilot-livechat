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
          <div class="header-left">
            <div class="header-main">
              <div class="header-icon">
                <i class="fas fa-shield-alt" v-if="user?.role === 'global_admin'"></i>
                <i class="fas fa-building" v-else></i>
              </div>
              <div class="header-text">
                <h1>
                  <span v-if="user?.role === 'global_admin'">Global Admin Portal</span>
                  <span v-else>Organization Admin Portal</span>
                </h1>
                <div class="brand-subtitle">
                  <i class="fas fa-robot"></i>
                  Lightwave AI - Live Chat Management
                </div>
              </div>
            </div>
          </div>
          <div class="header-right">
            <div class="admin-info">
              <div class="user-avatar">
                <i class="fas fa-user-circle"></i>
              </div>
              <div class="user-details">
                <span class="user-name">{{ user.username }}</span>
                <span class="user-role">{{ user.role }}</span>
              </div>
              <button class="btn btn-logout" @click="logout">
                <i class="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </button>
            </div>
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

        <!-- Show router view for public routes when not authenticated -->
        <div v-else>
          <router-view />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from './composables/useAuth'

// State
const { user, isAuthenticated, logout: authLogout } = useAuth()
const alert = ref({ show: false, type: 'success', message: '' })

// Router
const router = useRouter()
const route = useRoute()

// Available tabs based on user role with proper permissions
const availableTabs = computed(() => {
  if (!user.value) return []
  
  const role = user.value.role
  const tabs = []
  
  // Permission levels:
  // DASHBOARD: AGENT, ADMIN
  // CHATS: AGENT, ADMIN  
  // ANALYTICS: ADMIN only
  // USERS: ADMIN only
  
  if (['agent', 'admin', 'global_admin'].includes(role)) {
    // Dashboard - available to agents and admins
    tabs.push({ path: '/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' })
    
    // Chats - available to agents and admins
    tabs.push({ path: '/admin/chats', label: 'Chats', icon: 'fas fa-comments' })
  }
  
  if (['admin', 'global_admin'].includes(role)) {
    // Analytics - admin only
    tabs.push({ path: '/analytics', label: 'Analytics', icon: 'fas fa-chart-line' })
    
    // Users - admin only
    tabs.push({ path: '/admin/users', label: 'Users', icon: 'fas fa-users' })
    
    // Chat Flow - admin only
    tabs.push({ path: '/chatflow', label: 'Chat Flow', icon: 'fas fa-sitemap' })
    
    // Settings - admin only
    tabs.push({ path: '/settings', label: 'Settings', icon: 'fas fa-cog' })
  }
  
  if (role === 'global_admin') {
    // Organizations - global admin only
    tabs.push({ path: '/global-admin', label: 'Organizations', icon: 'fas fa-building' })
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
  authLogout()
  router.push('/login')
  showAlert('Logged out successfully')
}

// Check for existing session
onMounted(() => {
  console.log('App mounted, checking authentication...')
  console.log('Current user:', user.value)
  console.log('Is authenticated:', isAuthenticated.value)
  
  // Redirect to dashboard if authenticated and on root/login
  if (isAuthenticated.value && user.value) {
    const currentPath = router.currentRoute.value.path
    if (currentPath === '/' || currentPath === '/login') {
      router.push('/dashboard')
    }
  } else {
    // Only redirect to login if not already on a public route
    if (!router.currentRoute.value.meta.public) {
      router.push('/login')
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

<style scoped>
.admin-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f7fafc;
}

.global-admin-layout {
  flex: 1;
}

.header {
  background: #ffffff;
  color: #1f2937;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-bottom: 3px solid #3b82f6;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  flex: 1;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.header-icon i {
  font-size: 28px;
  color: white;
}

.header-text {
  flex: 1;
}

.header h1 {
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.brand-subtitle {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-subtitle i {
  color: #3b82f6;
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #f8fafc;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-avatar i {
  font-size: 20px;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.user-role {
  font-size: 12px;
  color: #6b7280;
  text-transform: capitalize;
  background: #e0f2fe;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 500;
}

.btn-logout {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-logout:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
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

.auth-redirect {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  color: #718096;
  font-size: 18px;
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

.btn-danger {
  background: #f56565;
  color: white;
}

.btn-danger:hover {
  background: #e53e3e;
}

.alert {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 300px;
}

.alert-success {
  background: #c6f6d5;
  color: #22543d;
  border-left: 4px solid #38a169;
}

.alert-error {
  background: #fed7d7;
  color: #9b2c2c;
  border-left: 4px solid #e53e3e;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .header {
    padding: 16px 20px;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-main {
    justify-content: center;
    text-align: center;
  }

  .header-icon {
    width: 50px;
    height: 50px;
  }

  .header-icon i {
    font-size: 24px;
  }

  .header h1 {
    font-size: 24px;
  }

  .brand-subtitle {
    font-size: 13px;
  }

  .admin-info {
    justify-content: center;
    padding: 10px 16px;
    gap: 12px;
  }

  .user-avatar {
    width: 36px;
    height: 36px;
  }

  .user-avatar i {
    font-size: 18px;
  }

  .btn-logout {
    padding: 8px 12px;
    font-size: 13px;
  }

  .nav-tabs {
    padding: 0 15px;
    overflow-x: auto;
  }

  .nav-tab {
    padding: 12px 15px;
    white-space: nowrap;
  }
}
</style>
