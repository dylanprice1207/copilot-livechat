<template>
  <div class="section">
    <h3><i class="fas fa-building"></i> Department Agent Assignments</h3>
    
    <!-- Loading State -->
    <div v-if="loading" style="text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: #4299e1;"></i>
      <p style="margin-top: 15px; color: #718096;">Loading department data...</p>
    </div>

    <div v-else>
      <!-- Department Overview -->
      <div class="stats-grid">
        <div v-for="dept in departments" :key="dept" class="metric-card">
          <h4>{{ getAgentsInDepartment(dept).length }}</h4>
          <p>{{ dept.charAt(0).toUpperCase() + dept.slice(1) }} Agents</p>
          <div style="margin-top: 10px;">
            <span 
              v-for="agent in getAgentsInDepartment(dept).slice(0, 3)" 
              :key="agent.id"
              class="department-badge"
            >
              {{ agent.username }}
            </span>
            <span 
              v-if="getAgentsInDepartment(dept).length > 3"
              class="department-badge"
              style="background: #718096;"
            >
              +{{ getAgentsInDepartment(dept).length - 3 }} more
            </span>
          </div>
        </div>
      </div>

      <!-- Agent Assignments Table -->
      <div class="section" style="margin-top: 20px;">
        <h4>Agent Department Assignments</h4>
        <table class="users-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Departments</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="agent in agentsList" :key="agent.id">
              <td>
                <span :class="['status-indicator', agent.isOnline ? 'status-online' : 'status-offline']"></span>
                {{ agent.username }}
              </td>
              <td>
                <span 
                  v-for="dept in (agent.departments || [])" 
                  :key="dept"
                  class="department-badge"
                >
                  {{ dept }}
                </span>
                <span v-if="!agent.departments || agent.departments.length === 0" style="color: #718096; font-style: italic;">
                  No departments assigned
                </span>
              </td>
              <td>{{ agent.isOnline ? 'Online' : 'Offline' }}</td>
              <td>
                <button class="btn" @click="openDepartmentManagement(agent.id)">
                  <i class="fas fa-edit"></i> Edit Departments
                </button>
              </td>
            </tr>
            <tr v-if="agentsList.length === 0">
              <td colspan="4" style="text-align: center; padding: 40px; color: #718096;">
                No agents found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/services/api'

// Injected dependencies
const showAlert = inject('showAlert')

// State
const loading = ref(true)
const agents = ref([])
const departments = ['general', 'sales', 'technical', 'support', 'billing']

// Computed
const agentsList = computed(() => {
  return agents.value.filter(agent => 
    agent.role === 'agent' || agent.role === 'admin'
  )
})

// Methods
const loadAgents = async () => {
  try {
    loading.value = true
    const response = await api.getAgents()
    agents.value = response.agents || []
  } catch (error) {
    console.error('Error loading agents:', error)
    showAlert('Failed to load agent data', 'error')
  } finally {
    loading.value = false
  }
}

const getAgentsInDepartment = (department) => {
  return agentsList.value.filter(agent => 
    agent.departments && agent.departments.includes(department)
  )
}

const openDepartmentManagement = (agentId) => {
  // Open the dedicated department management interface in a new window
  window.open(`/agent-departments.html?agentId=${agentId}`, '_blank')
}

// Lifecycle
onMounted(() => {
  loadAgents()
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
</style>
