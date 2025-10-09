<template>
  <div>
    <!-- Dashboard Header -->
    <div class="header">
      <div class="header-content">
        <h1><i class="fas fa-tachometer-alt"></i> Admin Dashboard</h1>
        <p>Monitor system performance and user activity</p>
      </div>
    </div>

    <!-- Statistics Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>{{ stats.totalUsers || 0 }}</h3>
        <p><i class="fas fa-users"></i> Total Users</p>
      </div>
      <div class="stat-card">
        <h3>{{ stats.activeAgents || 0 }}</h3>
        <p><i class="fas fa-headset"></i> Active Agents</p>
      </div>
      <div class="stat-card">
        <h3>{{ stats.totalChats || 0 }}</h3>
        <p><i class="fas fa-comments"></i> Total Chats</p>
      </div>
      <div class="stat-card">
        <h3>{{ stats.aiInteractions || 0 }}</h3>
        <p><i class="fas fa-robot"></i> AI Interactions</p>
      </div>
    </div>

    <!-- Real-time Metrics -->
    <div class="section">
      <h3><i class="fas fa-chart-bar"></i> Real-time Metrics</h3>
      <div class="stats-grid">
        <div class="metric-card">
          <h4>{{ realTimeStats.onlineUsers || 0 }}</h4>
          <p>Online Users</p>
        </div>
        <div class="metric-card">
          <h4>{{ realTimeStats.activeChats || 0 }}</h4>
          <p>Active Chats</p>
        </div>
        <div class="metric-card">
          <h4>{{ realTimeStats.avgResponseTime || 0 }}s</h4>
          <p>Avg Response Time</p>
        </div>
        <div class="metric-card">
          <h4>{{ realTimeStats.satisfactionRate || 0 }}%</h4>
          <p>Satisfaction Rate</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="section">
      <div style="text-align: center; padding: 40px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: #4299e1;"></i>
        <p style="margin-top: 15px; color: #718096;">Loading dashboard data...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '@/services/api'

// Injected dependencies
const socket = inject('socket')
const showAlert = inject('showAlert')

// State
const loading = ref(true)
const stats = ref({})
const realTimeStats = ref({})

// Methods
const loadDashboardData = async () => {
  try {
    loading.value = true
    console.log('Loading dashboard data...')
    const data = await api.getDashboardStats()
    console.log('Dashboard data received:', data)
    stats.value = data || {}
    realTimeStats.value = {
      onlineUsers: data?.onlineUsers || 0,
      activeChats: data?.activeChats || 0,
      avgResponseTime: data?.avgResponseTime || 0,
      satisfactionRate: data?.satisfactionRate || 0
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    // Provide fallback data to prevent blank page
    stats.value = {
      totalUsers: 0,
      activeAgents: 0,
      totalChats: 0,
      aiInteractions: 0
    }
    realTimeStats.value = {
      onlineUsers: 0,
      activeChats: 0,
      avgResponseTime: 0,
      satisfactionRate: 0
    }
    showAlert('Failed to load dashboard data', 'error')
  } finally {
    loading.value = false
  }
}

const updateOnlineMetrics = async () => {
  try {
    const data = await api.getOnlineMetrics()
    realTimeStats.value.onlineUsers = data.onlineUsers
  } catch (error) {
    console.error('Error updating online metrics:', error)
  }
}

const updateChatMetrics = async () => {
  try {
    const data = await api.getChatMetrics()
    realTimeStats.value.activeChats = data.activeChats
    stats.value.totalChats = data.totalChats
  } catch (error) {
    console.error('Error updating chat metrics:', error)
  }
}

// Socket event listeners
const setupSocketListeners = () => {
  if (socket) {
    socket.on('user_joined', updateOnlineMetrics)
    socket.on('user_left', updateOnlineMetrics)
    socket.on('new_chat', updateChatMetrics)
  }
}

// Lifecycle
onMounted(async () => {
  await loadDashboardData()
  setupSocketListeners()
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(() => {
    loadDashboardData()
  }, 30000)
  
  // Cleanup on unmount
  return () => {
    clearInterval(interval)
  }
})
</script>

<style scoped>
.header {
  margin-bottom: 30px;
  padding: 20px 0;
  border-bottom: 2px solid #e2e8f0;
  display: flex;
  justify-content: center;
}

.header-content {
  text-align: center;
  max-width: 600px;
}

.header h1 {
  font-size: 2.5rem;
  color: #2d3748;
  margin: 0 0 10px 0;
  font-weight: 600;
  text-align: center;
  margin-left: 20px;
}

.header h1 i {
  color: #4299e1;
  margin-right: 10px;
}

.header p {
  color: #718096;
  font-size: 1.1rem;
  margin: 0;
  text-align: left;
  margin-left: -10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card, .metric-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover, .metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-card h3, .metric-card h4 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 10px 0;
}

.stat-card p, .metric-card p {
  color: #718096;
  font-size: 1rem;
  margin: 0;
  font-weight: 500;
}

.stat-card i {
  color: #4299e1;
  margin-right: 8px;
}

.section {
  margin-bottom: 30px;
}

.section h3 {
  font-size: 1.5rem;
  color: #2d3748;
  margin-bottom: 20px;
  font-weight: 600;
}

.section h3 i {
  color: #4299e1;
  margin-right: 10px;
}

.fa-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
