<template>
  <div>
    <!-- Organization Profile -->
    <div class="section">
      <h3><i class="fas fa-building"></i> Organization Profile</h3>
      
      <div v-if="loading" style="text-align: center; padding: 40px;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: #4299e1;"></i>
        <p style="margin-top: 15px; color: #718096;">Loading organization settings...</p>
      </div>

      <div v-else class="config-grid">
        <div class="form-group">
          <label for="orgName">Organization Name</label>
          <input 
            type="text" 
            id="orgName"
            v-model="settings.orgName"
          >
        </div>
        
        <div class="form-group">
          <label for="orgDomain">Domain</label>
          <input 
            type="text" 
            id="orgDomain"
            v-model="settings.orgDomain"
          >
        </div>
        
        <div class="form-group">
          <label for="maxConcurrentChats">Max Concurrent Chats per Agent</label>
          <input 
            type="number" 
            id="maxConcurrentChats"
            v-model.number="settings.maxConcurrentChats"
            min="1" 
            max="20"
          >
        </div>
        
        <div class="form-group">
          <label for="chatTimeout">Chat Timeout (minutes)</label>
          <input 
            type="number" 
            id="chatTimeout"
            v-model.number="settings.chatTimeout"
            min="5" 
            max="120"
          >
        </div>
      </div>
      
      <button 
        v-if="!loading"
        class="btn btn-success" 
        @click="saveOrgSettings" 
        :disabled="saving"
      >
        <i class="fas fa-save"></i> {{ saving ? 'Saving...' : 'Save Settings' }}
      </button>
    </div>

    <!-- Security Settings -->
    <div class="section">
      <h3><i class="fas fa-shield-alt"></i> Security Settings</h3>
      
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input 
            type="checkbox" 
            v-model="settings.requireMFA"
          > 
          Require Multi-Factor Authentication
        </label>
      </div>
      
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input 
            type="checkbox" 
            v-model="settings.enableLogging"
          > 
          Enable Detailed Logging
        </label>
      </div>
      
      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input 
            type="checkbox" 
            v-model="settings.allowGuestChat"
          > 
          Allow Guest Chat
        </label>
      </div>
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

const settings = ref({
  orgName: 'Lightwave AI',
  orgDomain: 'lightwave',
  maxConcurrentChats: 5,
  chatTimeout: 30,
  requireMFA: false,
  enableLogging: true,
  allowGuestChat: true
})

// Methods
const loadOrgSettings = async () => {
  try {
    loading.value = true
    const response = await api.getOrgSettings()
    if (response.success) {
      settings.value = { ...settings.value, ...response.settings }
    }
  } catch (error) {
    console.error('Error loading organization settings:', error)
    showAlert('Failed to load organization settings', 'error')
  } finally {
    loading.value = false
  }
}

const saveOrgSettings = async () => {
  if (!settings.value.orgName || !settings.value.orgDomain) {
    showAlert('Organization name and domain are required', 'error')
    return
  }

  try {
    saving.value = true
    const response = await api.updateOrgSettings(settings.value)
    
    if (response.success) {
      showAlert('Organization settings saved successfully', 'success')
    } else {
      throw new Error(response.message)
    }
  } catch (error) {
    console.error('Error saving organization settings:', error)
    showAlert('Failed to save organization settings', 'error')
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadOrgSettings()
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

input[type="checkbox"] {
  width: auto !important;
}
</style>
