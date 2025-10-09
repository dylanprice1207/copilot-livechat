import { createRouter, createWebHashHistory } from 'vue-router'

// Import views
import Dashboard from '../views/Dashboard.vue'
import Analytics from '../views/Analytics.vue'
import UserManagement from '../views/UserManagement.vue'
import Settings from '../views/Settings.vue'
import ChatFlow from '../views/ChatFlow.vue'
import GlobalAdmin from '../views/GlobalAdmin.vue'
import AgentDashboard from '../views/AgentDashboard_clean.vue'
import PublicChat from '../views/PublicChat.vue'
import StaffLogin from '../views/StaffLogin.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/analytics',
    name: 'Analytics', 
    component: Analytics
  },
  {
    path: '/users',
    name: 'UserManagement',
    component: UserManagement
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true }
  },
  {
    path: '/chatflow',
    name: 'ChatFlow',
    component: ChatFlow,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/chats',
    name: 'Chats',
    component: () => import('../views/Chats.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUserManagement',
    component: UserManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/global-admin',
    name: 'GlobalAdmin',
    component: GlobalAdmin,
    meta: { requiresGlobalAdmin: true }
  },
  {
    path: '/agent',
    name: 'AgentDashboard',
    component: AgentDashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/agent.html',
    redirect: '/agent'
  },
  {
    path: '/chat',
    name: 'PublicChat',
    component: PublicChat,
    meta: { public: true }
  },
  {
    path: '/chatkit',
    name: 'ChatKitCustomerChat',
    component: () => import('../views/ChatKitCustomerChat.vue'),
    meta: { public: true }
  },
  {
    path: '/login',
    name: 'StaffLogin',
    component: StaffLogin,
    meta: { public: true }
  },
  {
    path: '/admin',
    redirect: '/dashboard'
  },
  {
    path: '/admin/chats',
    name: 'AdminChats',
    component: () => import('../views/Chats.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: UserManagement,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Navigation guards with role-based permissions
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const isAuthenticated = !!token
  
  // Parse user info from token
  let user = null
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      user = {
        id: payload.id,
        username: payload.username,
        role: payload.role
      }
    } catch (error) {
      localStorage.removeItem('token')
    }
  }

  // Public routes - no authentication required
  if (to.meta.public) {
    next()
    return
  }

  // Protected routes - authentication required
  if (!isAuthenticated) {
    next('/login')
    return
  }

  // Permission-based route access
  const userRole = user?.role
  const routePath = to.path

  // Check specific route permissions
  if (routePath === '/analytics' || routePath === '/users' || routePath === '/admin/users') {
    if (!['admin', 'global_admin'].includes(userRole)) {
      alert('Admin access required for this section')
      next('/dashboard')
      return
    }
  }

  if (routePath === '/global-admin') {
    if (userRole !== 'global_admin') {
      alert('Global admin access required')
      next('/dashboard')
      return
    }
  }

  // Dashboard and Chats are available to agents and admins
  if (['/dashboard', '/admin/chats'].includes(routePath)) {
    if (!['agent', 'admin', 'global_admin'].includes(userRole)) {
      alert('Agent or admin access required')
      next('/login')
      return
    }
  }

  // Allow access to authorized routes
  next()
})

export default router