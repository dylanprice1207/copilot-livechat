<template>
  <div>
    <!-- AI Configuration Grid -->
    <div class="config-grid">
      <!-- API Configuration -->
      <div class="section">
        <h3><i class="fas fa-key"></i> API Configuration</h3>
        
        <div class="form-group">
          <label for="openaiApiKey">OpenAI API Key</label>
          <input 
            type="password" 
            id="openaiApiKey"
            v-model="config.openaiApiKey"
            placeholder="sk-..."
          >
        </div>
        
        <div class="form-group">
          <label for="defaultModel">Default AI Model</label>
          <select id="defaultModel" v-model="config.defaultModel">
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="maxTokens">Max Tokens per Response</label>
          <input 
            type="number" 
            id="maxTokens"
            v-model.number="config.maxTokens"
            min="100" 
            max="8000"
          >
        </div>
        
        <button class="btn btn-success" @click="saveAIConfig" :disabled="saving">
          <i class="fas fa-save"></i> {{ saving ? 'Saving...' : 'Save Configuration' }}
        </button>
      </div>

      <!-- Department AI Agents -->
      <div class="section">
        <h3><i class="fas fa-robot"></i> Department AI Agents</h3>
        <div class="ai-model-card" v-for="dept in departments" :key="dept">
          <h4>{{ dept.charAt(0).toUpperCase() + dept.slice(1) }} Department</h4>
          <p>AI Agent: <strong>{{ getAgentName(dept) }}</strong></p>
          <small>Specialized in {{ dept }} inquiries</small>
        </div>
      </div>
    </div>

    <!-- AI Behavior Settings -->
    <div class="section">
      <h3><i class="fas fa-brain"></i> AI Behavior Settings</h3>
      <div class="config-grid">
        <div class="form-group">
          <label for="aiTemperature">
            Response Creativity (Temperature): {{ config.temperature }}
          </label>
          <input 
            type="range" 
            id="aiTemperature"
            v-model.number="config.temperature"
            min="0" 
            max="1" 
            step="0.1"
          >
        </div>
        <div class="form-group">
          <label for="aiPresencePenalty">
            Presence Penalty: {{ config.presencePenalty }}
          </label>
          <input 
            type="range" 
            id="aiPresencePenalty"
            v-model.number="config.presencePenalty"
            min="0" 
            max="2" 
            step="0.1"
          >
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" style="text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: #4299e1;"></i>
      <p style="margin-top: 15px; color: #718096;">Loading AI configuration...</p>
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
const saving = ref(false)
const departments = ['general', 'sales', 'technical', 'support', 'billing']

const config = ref({
  openaiApiKey: '',
  defaultModel: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.7,
  presencePenalty: 0.6
})

// Methods
const loadAIConfig = async () => {
  try {
    loading.value = true
    const response = await api.getAIConfig()
    if (response.success) {
      const configData = response.config
      config.value = {
        openaiApiKey: configData.hasApiKey ? 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢' : '',
        defaultModel: configData.defaultModel || 'gpt-4',
        maxTokens: configData.maxTokens || 2000,
        temperature: configData.temperature !== undefined ? configData.temperature : 0.7,
        presencePenalty: configData.presencePenalty !== undefined ? configData.presencePenalty : 0.6
      }
    }
  } catch (error) {
    console.error('Error loading AI config:', error)
    showAlert('Failed to load AI configuration', 'error')
  } finally {
    loading.value = false
  }
}

const saveAIConfig = async () => {
  try {
    saving.value = true
    const response = await api.updateAIConfig({
      openaiApiKey: config.value.openaiApiKey,
      defaultModel: config.value.defaultModel,
      maxTokens: config.value.maxTokens,
      temperature: config.value.temperature,
      presencePenalty: config.value.presencePenalty
    })
    
    if (response.success) {
      showAlert('AI configuration saved successfully', 'success')
    } else {
      throw new Error(response.message)
    }
  } catch (error) {
    console.error('Error saving AI config:', error)
    showAlert('Failed to save AI configuration', 'error')
  } finally {
    saving.value = false
  }
}

const getAgentName = (department) => {
  const agentNames = {
    general: 'Alex',
    sales: 'Sarah',
    technical: 'Mike',
    support: 'Emma',
    billing: 'David'
  }
  return agentNames[department] || 'AI Assistant'
}

// Lifecycle
onMounted(() => {
  loadAIConfig()
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

.ai-model-card {
  margin-bottom: 15px;
}
</style>
