<template>
  <div class="security-settings">
    <div class="settings-header">
      <h2><i class="fas fa-shield-alt"></i> Security Settings</h2>
      <p>Configure security and access control settings</p>
    </div>
    
    <div class="settings-form">
      <div class="form-grid">
        <div class="form-group">
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="requireAuth"
              v-model="localSettings.requireAuth"
            />
            <label for="requireAuth">Require Authentication for Chat</label>
          </div>
        </div>
        
        <div class="form-group">
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="enableGuestChat"
              v-model="localSettings.enableGuestChat"
            />
            <label for="enableGuestChat">Allow Guest Chat</label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="sessionTimeout">Session Timeout (hours)</label>
          <input 
            type="number" 
            id="sessionTimeout"
            v-model="localSettings.sessionTimeout" 
            placeholder="24"
            min="1"
            max="168"
            class="form-control"
          />
        </div>
        
        <div class="form-group">
          <label for="maxLoginAttempts">Max Login Attempts</label>
          <input 
            type="number" 
            id="maxLoginAttempts"
            v-model="localSettings.maxLoginAttempts" 
            placeholder="5"
            min="3"
            max="10"
            class="form-control"
          />
        </div>

        <div class="form-group">
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="enableTwoFactor"
              v-model="localSettings.enableTwoFactor"
            />
            <label for="enableTwoFactor">Enable Two-Factor Authentication</label>
          </div>
        </div>

        <div class="form-group">
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="enableIpWhitelist"
              v-model="localSettings.enableIpWhitelist"
            />
            <label for="enableIpWhitelist">Enable IP Whitelist</label>
          </div>
        </div>

        <div class="form-group">
          <label for="passwordMinLength">Minimum Password Length</label>
          <input 
            type="number" 
            id="passwordMinLength"
            v-model="localSettings.passwordMinLength" 
            placeholder="8"
            min="6"
            max="32"
            class="form-control"
          />
        </div>

        <div class="form-group">
          <div class="checkbox-item">
            <input 
              type="checkbox" 
              id="requireStrongPassword"
              v-model="localSettings.requireStrongPassword"
            />
            <label for="requireStrongPassword">Require Strong Password</label>
          </div>
        </div>
      </div>

      <div v-if="localSettings.enableIpWhitelist" class="ip-whitelist-section">
        <h3>IP Whitelist</h3>
        <p class="section-description">Add IP addresses that are allowed to access the system</p>
        
        <div class="ip-list">
          <div v-for="(ip, index) in localSettings.ipWhitelist" :key="index" class="ip-item">
            <input 
              type="text" 
              v-model="localSettings.ipWhitelist[index]" 
              placeholder="192.168.1.1 or 192.168.1.0/24"
              class="form-control"
            />
            <button 
              class="btn btn-danger btn-small"
              @click="removeIp(index)"
              :disabled="localSettings.ipWhitelist.length <= 1"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <button class="btn btn-secondary btn-small" @click="addIp">
          <i class="fas fa-plus"></i> Add IP Address
        </button>
      </div>

      <div class="security-options">
        <h3>Additional Security Options</h3>
        <div class="form-grid">
          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="logSecurityEvents"
                v-model="localSettings.logSecurityEvents"
              />
              <label for="logSecurityEvents">Log Security Events</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="enableRateLimit"
                v-model="localSettings.enableRateLimit"
              />
              <label for="enableRateLimit">Enable Rate Limiting</label>
            </div>
          </div>

          <div class="form-group">
            <label for="rateLimitRequests">Rate Limit (requests per minute)</label>
            <input 
              type="number" 
              id="rateLimitRequests"
              v-model="localSettings.rateLimitRequests" 
              placeholder="60"
              min="10"
              max="1000"
              class="form-control"
              :disabled="!localSettings.enableRateLimit"
            />
          </div>

          <div class="form-group">
            <label for="lockoutDuration">Account Lockout Duration (minutes)</label>
            <input 
              type="number" 
              id="lockoutDuration"
              v-model="localSettings.lockoutDuration" 
              placeholder="15"
              min="5"
              max="120"
              class="form-control"
            />
          </div>
        </div>
      </div>
    </div>
    
    <div class="form-actions">
      <button 
        class="btn btn-primary"
        @click="saveSettings"
        :disabled="saving"
      >
        <i class="fas fa-save"></i>
        <span v-if="saving">Saving...</span>
        <span v-else>Save Security Settings</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'SecuritySettings',
  props: {
    settings: {
      type: Object,
      required: true
    },
    saving: {
      type: Boolean,
      default: false
    }
  },
  emits: ['save'],
  setup(props, { emit }) {
    const localSettings = ref({
      requireAuth: false,
      enableGuestChat: true,
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      enableTwoFactor: false,
      enableIpWhitelist: false,
      ipWhitelist: ['127.0.0.1'],
      passwordMinLength: 8,
      requireStrongPassword: true,
      logSecurityEvents: true,
      enableRateLimit: true,
      rateLimitRequests: 60,
      lockoutDuration: 15,
      ...props.settings
    })

    // Watch for prop changes
    watch(() => props.settings, (newSettings) => {
      localSettings.value = { ...localSettings.value, ...newSettings }
    }, { deep: true, immediate: true })

    const addIp = () => {
      localSettings.value.ipWhitelist.push('')
    }

    const removeIp = (index) => {
      if (localSettings.value.ipWhitelist.length > 1) {
        localSettings.value.ipWhitelist.splice(index, 1)
      }
    }

    const saveSettings = () => {
      emit('save', localSettings.value)
    }

    return {
      localSettings,
      addIp,
      removeIp,
      saveSettings
    }
  }
}
</script>

<style scoped>
.security-settings {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f5f9;
}

.settings-header h2 {
  margin: 0 0 8px 0;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.5rem;
  font-weight: 600;
}

.settings-header h2 i {
  color: #3b82f6;
}

.settings-header p {
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
}

.settings-form {
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-control {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
  background: #ffffff;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control:disabled {
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-direction: row !important;
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: #3b82f6;
}

.checkbox-item label {
  margin: 0;
  cursor: pointer;
  flex: 1;
}

.ip-whitelist-section, .security-options {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.ip-whitelist-section h3, .security-options h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 1.2rem;
  font-weight: 600;
}

.section-description {
  margin: 0 0 16px 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.ip-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.ip-item {
  display: flex;
  gap: 12px;
  align-items: center;
}

.ip-item input {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
  transform: translateY(-1px);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-small {
  padding: 8px 16px;
  font-size: 0.85rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .ip-item {
    flex-direction: column;
  }
  
  .ip-item input {
    margin-bottom: 8px;
  }
  
  .form-actions {
    justify-content: stretch;
  }
  
  .btn {
    justify-content: center;
  }
}
</style>
