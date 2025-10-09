<template>
  <div>
    <!-- Chat Analytics -->
    <div class="section">
      <h3><i class="fas fa-chart-line"></i> Chat Analytics</h3>
      
      <div v-if="loading" style="text-align: center; padding: 40px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: #4299e1;"></i>
        <p style="margin-top: 15px; color: #718096;">Loading analytics data...</p>
      </div>

      <div v-else class="stats-grid">
        <div class="metric-card">
          <h4>{{ analytics.dailyChats || 0 }}</h4>
          <p>Daily Chats</p>
        </div>
        <div class="metric-card">
          <h4>{{ analytics.weeklyChats || 0 }}</h4>
          <p>Weekly Chats</p>
        </div>
        <div class="metric-card">
          <h4>{{ analytics.monthlyChats || 0 }}</h4>
          <p>Monthly Chats</p>
        </div>
        <div class="metric-card">
          <h4>{{ analytics.resolvedChats || 0 }}%</h4>
          <p>Resolution Rate</p>
        </div>
      </div>
    </div>

    <!-- Department Performance -->
    <div class="section">
      <h3><i class="fas fa-chart-pie"></i> Department Performance</h3>
      
      <div v-if="analytics.departmentStats" class="stats-grid">
        <div 
          v-for="(stats, dept) in analytics.departmentStats" 
          :key="dept"
          class="metric-card"
        >
          <h4>{{ stats.totalChats }}</h4>
          <p>{{ dept.charAt(0).toUpperCase() + dept.slice(1) }} Chats</p>
          <small>Avg Response: {{ stats.avgResponse }}s</small>
        </div>
      </div>
      
      <div v-else-if="!loading" style="text-align: center; padding: 40px; color: #718096;">
        No department statistics available
      </div>
    </div>

    <!-- Top Performing Agents -->
    <div class="section">
      <h3><i class="fas fa-trophy"></i> Top Performing Agents</h3>
      
      <div v-if="topAgents.length > 0" class="agent-performance">
        <div 
          v-for="(agent, index) in topAgents" 
          :key="agent.id"
          class="agent-card"
        >
          <div class="rank">
            <i :class="getRankIcon(index)"></i>
            #{{ index + 1 }}
          </div>
          <div class="agent-info">
            <h4>{{ agent.name }}</h4>
            <p>{{ agent.totalChats }} chats completed</p>
            <small>Avg duration: {{ agent.avgDuration }} minutes</small>
            <div class="departments">
              <span 
                v-for="dept in agent.departments" 
                :key="dept"
                class="department-badge"
              >
                {{ dept }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="!loading" style="text-align: center; padding: 40px; color: #718096;">
        No agent performance data available
      </div>
    </div>

    <!-- Hourly Activity Chart -->
    <div class="section">
      <h3><i class="fas fa-clock"></i> 24-Hour Activity Pattern</h3>
      
      <div v-if="hourlyData.length > 0" class="hourly-chart">
        <div 
          v-for="hour in hourlyData" 
          :key="hour.hour"
          class="hour-bar"
          :style="{ height: getBarHeight(hour.messages) + '%' }"
          :title="`${hour.hour}:00 - ${hour.messages} messages`"
        >
          <div class="hour-label">{{ hour.hour }}</div>
        </div>
      </div>
      
      <div v-else-if="!loading" style="text-align: center; padding: 40px; color: #718096;">
        No hourly activity data available
      </div>
    </div>

    <!-- Refresh Button -->
    <div style="text-align: center; margin-top: 30px;">
      <button class="btn" @click="loadAllAnalytics" :disabled="loading">
        <i class="fas fa-refresh"></i> {{ loading ? 'Refreshing...' : 'Refresh Data' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '@/services/api'

// Injected dependencies
const showAlert = inject('showAlert')

// State
const loading = ref(true)
const analytics = ref({})
const topAgents = ref([])
const hourlyData = ref([])

// Methods
const loadAllAnalytics = async () => {
  try {
    loading.value = true
    await Promise.all([
      loadAnalytics(),
      loadTopAgents(),
      loadHourlyData()
    ])
  } catch (error) {
    console.error('Error loading analytics:', error)
    showAlert('Failed to load analytics data', 'error')
  } finally {
    loading.value = false
  }
}

const loadAnalytics = async () => {
  try {
    console.log('Loading analytics...')
    const response = await api.getAnalytics()
    console.log('Analytics response:', response)
    analytics.value = response || {}
  } catch (error) {
    console.error('Error loading analytics:', error)
    analytics.value = {}
  }
}

const loadTopAgents = async () => {
  try {
    const response = await fetch('/api/admin/analytics/top-agents', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    if (response.ok) {
      const data = await response.json()
      // Handle both array response and object with agents property
      if (Array.isArray(data)) {
        topAgents.value = data.slice(0, 5)
      } else if (data.success && Array.isArray(data.agents)) {
        topAgents.value = data.agents.slice(0, 5)
      } else {
        topAgents.value = []
      }
    }
  } catch (error) {
    console.error('Failed to load top agents:', error)
    topAgents.value = []
  }
}

const loadHourlyData = async () => {
  try {
    const response = await fetch('/api/admin/analytics/hourly', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    if (response.ok) {
      const responseData = await response.json()
      // Handle both array response and object with data property
      if (Array.isArray(responseData)) {
        hourlyData.value = responseData
      } else if (responseData.success && responseData.data) {
        hourlyData.value = responseData.data
      } else {
        hourlyData.value = []
      }
    }
  } catch (error) {
    console.error('Failed to load hourly data:', error)
    hourlyData.value = []
  }
}

const getRankIcon = (index) => {
  const icons = [
    'fas fa-medal rank-gold',      // 1st place
    'fas fa-medal rank-silver',    // 2nd place
    'fas fa-medal rank-bronze',    // 3rd place
    'fas fa-star',                 // 4th place
    'fas fa-star'                  // 5th place
  ]
  return icons[index] || 'fas fa-star'
}

const getBarHeight = (messages) => {
  if (hourlyData.value.length === 0) return 0
  const maxMessages = Math.max(...hourlyData.value.map(h => h.messages))
  if (maxMessages === 0) return 0
  return Math.max((messages / maxMessages) * 100, 5) // Minimum 5% height for visibility
}

// Lifecycle
onMounted(() => {
  loadAllAnalytics()
})
</script>

<style scoped>
.fa-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Agent Performance */
.agent-performance {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.agent-card {
  display: flex;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 1px solid #e2e8f0;
}

.rank {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20px;
  min-width: 60px;
  font-weight: bold;
  color: #4299e1;
}

.rank i {
  font-size: 1.5em;
  margin-bottom: 5px;
}

.rank-gold { color: #ffd700; }
.rank-silver { color: #c0c0c0; }
.rank-bronze { color: #cd7f32; }

.agent-info {
  flex: 1;
}

.agent-info h4 {
  margin: 0 0 5px 0;
  color: #2d3748;
}

.agent-info p {
  margin: 0 0 5px 0;
  color: #4299e1;
  font-weight: 500;
}

.agent-info small {
  color: #718096;
}

.departments {
  margin-top: 10px;
}

.department-badge {
  display: inline-block;
  background: #e6f3ff;
  color: #2c5aa0;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  margin-right: 8px;
  margin-top: 5px;
}

/* Hourly Activity Chart */
.hourly-chart {
  display: flex;
  align-items: end;
  justify-content: space-between;
  height: 200px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow-x: auto;
  gap: 2px;
}

.hour-bar {
  flex: 1;
  min-width: 25px;
  background: linear-gradient(to top, #4299e1, #63b3ed);
  border-radius: 2px 2px 0 0;
  display: flex;
  align-items: end;
  justify-content: center;
  position: relative;
  transition: all 0.3s ease;
  cursor: pointer;
}

.hour-bar:hover {
  background: linear-gradient(to top, #3182ce, #4299e1);
  transform: translateY(-2px);
}

.hour-label {
  position: absolute;
  bottom: -20px;
  font-size: 0.7em;
  color: #718096;
  white-space: nowrap;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .agent-card {
    flex-direction: column;
    text-align: center;
  }
  
  .rank {
    margin-right: 0;
    margin-bottom: 15px;
  }
  
  .hourly-chart {
    padding: 15px 10px;
    height: 150px;
  }
  
  .hour-bar {
    min-width: 15px;
  }
  
  .hour-label {
    font-size: 0.6em;
    bottom: -15px;
  }
}
</style>
