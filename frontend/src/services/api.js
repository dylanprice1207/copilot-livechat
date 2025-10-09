import axios from 'axios'

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/admin.html'
    }
    return Promise.reject(error)
  }
)

export default {
  // Users
  async getUsers() {
    const response = await api.get('/admin/users')
    return response.data
  },

  async createUser(userData) {
    const response = await api.post('/admin/users', userData)
    return response.data
  },

  async updateUser(userId, userData) {
    const response = await api.put(`/admin/users/${userId}`, userData)
    return response.data
  },

  async deleteUser(userId) {
    const response = await api.delete(`/admin/users/${userId}`)
    return response.data
  },

  // Agents
  async getAgents() {
    const response = await api.get('/agents')
    return response.data
  },

  async updateAgentDepartments(agentId, departments) {
    const response = await api.put(`/agents/agent/${agentId}/departments`, { departments })
    return response.data
  },

  async getAgentDepartments(agentId) {
    const response = await api.get(`/agents/agent/${agentId}/departments`)
    return response.data
  },

  // Dashboard
  async getDashboardStats() {
    const response = await api.get('/admin/dashboard')
    return response.data
  },

  // Analytics
  async getAnalytics() {
    const response = await api.get('/admin/analytics')
    return response.data
  },

  async getOnlineMetrics() {
    const response = await api.get('/admin/metrics/online')
    return response.data
  },

  async getChatMetrics() {
    const response = await api.get('/admin/metrics/chats')
    return response.data
  },

  // AI Configuration
  async getAIConfig() {
    const response = await api.get('/ai/config')
    return response.data
  },

  async updateAIConfig(config) {
    const response = await api.put('/ai/config', config)
    return response.data
  },

  // Organization Settings
  async getOrgSettings() {
    const response = await api.get('/organization/settings')
    return response.data
  },

  async updateOrgSettings(settings) {
    const response = await api.put('/organization/settings', settings)
    return response.data
  },

  async getOrgInfo() {
    const response = await api.get('/organization/info')
    return response.data
  },

  // Settings
  async getSettings() {
    const response = await api.get('/admin/settings')
    return response.data
  },

  async saveSettings(settings) {
    const response = await api.post('/admin/settings', settings)
    return response.data
  },

  async resetSettings() {
    const response = await api.post('/admin/settings/reset')
    return response.data
  },

  async validateSettings(settings) {
    const response = await api.post('/admin/settings/validate', settings)
    return response.data
  },

  async exportSettings() {
    const response = await api.get('/admin/settings/export')
    return response.data
  },

  async importSettings(settings) {
    const response = await api.post('/admin/settings/import', settings)
    return response.data
  },

  async testAI(config) {
    const response = await api.post('/admin/settings/test-ai', config)
    return response.data
  },

  async chatAI(message, department = 'general') {
    console.log('🌐 API.chatAI called:')
    console.log('  📝 Message:', message)
    console.log('  🏢 Department:', department)
    console.log('  🔗 Endpoint: POST /ai/chat')
    
    const payload = { message, department }
    console.log('  📦 Payload:', payload)
    
    try {
      const response = await api.post('/ai/chat', payload)
      console.log('  📨 Raw API Response:')
      console.log('  📊 Status:', response.status)
      console.log('  📋 Headers:', response.headers)
      console.log('  💾 Data:', response.data)
      
      return response.data
    } catch (error) {
      console.error('  ❌ API chatAI Error:')
      console.error('  🔥 Message:', error.message)
      console.error('  📊 Status:', error.response?.status)
      console.error('  📋 Response data:', error.response?.data)
      throw error
    }
  },

  // Knowledge Base API methods
  async getKnowledgeStats() {
    const response = await api.get('/knowledge/stats')
    return response.data
  },

  async getKnowledgeCategories() {
    const response = await api.get('/knowledge/categories')
    return response.data
  },

  async searchKnowledge(query, category = null, limit = 5) {
    const params = { query, limit }
    if (category) params.category = category
    
    const response = await api.get('/knowledge/search', { params })
    return response.data
  },

  async addKnowledge(category, item) {
    const response = await api.post('/knowledge/add', { category, item })
    return response.data
  },

  async getKnowledgeByCategory(category) {
    const response = await api.get(`/knowledge/category/${category}`)
    return response.data
  },

  async initializeKnowledge() {
    const response = await api.post('/knowledge/initialize')
    return response.data
  },

  async uploadKnowledgeFiles(files, category) {
    const formData = new FormData()
    
    // Add files to form data
    files.forEach(file => {
      formData.append('files', file)
    })
    
    // Add category
    formData.append('category', category)
    
    const response = await api.post('/knowledge/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }
}