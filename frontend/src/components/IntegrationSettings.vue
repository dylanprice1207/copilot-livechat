<template>
  <div class="integration-settings">
    <div class="settings-header">
      <h2><i class="fas fa-plug"></i> Integration Settings</h2>
      <p>Configure external service integrations and webhooks</p>
    </div>
    
    <div class="settings-form">
      <div class="webhook-settings">
        <h3>Webhooks</h3>
        <p class="section-description">Configure webhooks to receive real-time notifications about chat events</p>
        
        <div class="form-group">
          <label for="webhookUrl">Webhook URL</label>
          <input 
            type="url" 
            id="webhookUrl"
            v-model="localSettings.webhook" 
            placeholder="https://your-domain.com/webhook"
            class="form-control"
          />
        </div>

        <div class="form-grid">
          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="webhookOnNewChat"
                v-model="localSettings.webhookOnNewChat"
              />
              <label for="webhookOnNewChat">Trigger on New Chat</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="webhookOnChatEnd"
                v-model="localSettings.webhookOnChatEnd"
              />
              <label for="webhookOnChatEnd">Trigger on Chat End</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="webhookOnAgentJoin"
                v-model="localSettings.webhookOnAgentJoin"
              />
              <label for="webhookOnAgentJoin">Trigger on Agent Join</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="webhookOnMessage"
                v-model="localSettings.webhookOnMessage"
              />
              <label for="webhookOnMessage">Trigger on New Message</label>
            </div>
          </div>
        </div>

        <div class="webhook-actions">
          <button class="btn btn-secondary" @click="testWebhook" :disabled="!localSettings.webhook">
            <i class="fas fa-flask"></i> Test Webhook
          </button>
        </div>
      </div>

      <div class="api-settings">
        <h3>API Configuration</h3>
        <p class="section-description">Configure API access for external applications</p>
        
        <div class="form-grid">
          <div class="form-group">
            <label for="apiKey">API Key</label>
            <div class="api-key-wrapper">
              <input 
                :type="showApiKey ? 'text' : 'password'"
                id="apiKey"
                v-model="localSettings.apiKey" 
                placeholder="Your API key"
                class="form-control api-key-input"
                readonly
              />
              <button 
                type="button" 
                class="btn-toggle-key" 
                @click="showApiKey = !showApiKey"
              >
                <i :class="showApiKey ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="apiRateLimit">API Rate Limit (requests per minute)</label>
            <input 
              type="number" 
              id="apiRateLimit"
              v-model="localSettings.apiRateLimit" 
              placeholder="1000"
              min="10"
              max="10000"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="enableApiAccess"
                v-model="localSettings.enableApiAccess"
              />
              <label for="enableApiAccess">Enable API Access</label>
            </div>
          </div>

          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="requireApiAuth"
                v-model="localSettings.requireApiAuth"
              />
              <label for="requireApiAuth">Require API Authentication</label>
            </div>
          </div>
        </div>

        <div class="api-actions">
          <button class="btn btn-secondary" @click="regenerateApiKey">
            <i class="fas fa-refresh"></i> Regenerate API Key
          </button>
        </div>
      </div>

      <div class="third-party-integrations">
        <h3>Third-Party Integrations</h3>
        <p class="section-description">Connect with external services and platforms</p>
        
        <div class="integration-grid">
          <!-- Slack Integration -->
          <div class="integration-card">
            <div class="integration-header">
              <i class="fab fa-slack"></i>
              <h4>Slack</h4>
              <span :class="['status-badge', localSettings.slackConnected ? 'connected' : 'disconnected']">
                {{ localSettings.slackConnected ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
            <div class="integration-content">
              <div class="form-group">
                <label for="slackWebhook">Slack Webhook URL</label>
                <input 
                  type="url" 
                  id="slackWebhook"
                  v-model="localSettings.slackWebhook" 
                  placeholder="https://hooks.slack.com/services/..."
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label for="slackChannel">Default Channel</label>
                <input 
                  type="text" 
                  id="slackChannel"
                  v-model="localSettings.slackChannel" 
                  placeholder="#general"
                  class="form-control"
                />
              </div>
            </div>
            <div class="integration-actions">
              <button class="btn btn-sm" :class="localSettings.slackConnected ? 'btn-danger' : 'btn-primary'" @click="toggleSlack">
                {{ localSettings.slackConnected ? 'Disconnect' : 'Connect' }}
              </button>
            </div>
          </div>

          <!-- Email Integration -->
          <div class="integration-card">
            <div class="integration-header">
              <i class="fas fa-envelope"></i>
              <h4>Email (SMTP)</h4>
              <span :class="['status-badge', localSettings.emailConnected ? 'connected' : 'disconnected']">
                {{ localSettings.emailConnected ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
            <div class="integration-content">
              <div class="form-group">
                <label for="smtpHost">SMTP Host</label>
                <input 
                  type="text" 
                  id="smtpHost"
                  v-model="localSettings.smtpHost" 
                  placeholder="smtp.gmail.com"
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label for="smtpPort">SMTP Port</label>
                <input 
                  type="number" 
                  id="smtpPort"
                  v-model="localSettings.smtpPort" 
                  placeholder="587"
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label for="smtpUser">Username</label>
                <input 
                  type="text" 
                  id="smtpUser"
                  v-model="localSettings.smtpUser" 
                  placeholder="your-email@example.com"
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label for="smtpPass">Password</label>
                <input 
                  type="password" 
                  id="smtpPass"
                  v-model="localSettings.smtpPass" 
                  placeholder="Your password or app password"
                  class="form-control"
                />
              </div>
            </div>
            <div class="integration-actions">
              <button class="btn btn-secondary btn-sm" @click="testEmailConnection">
                <i class="fas fa-flask"></i> Test Connection
              </button>
            </div>
          </div>

          <!-- CRM Integration -->
          <div class="integration-card">
            <div class="integration-header">
              <i class="fas fa-users"></i>
              <h4>CRM Integration</h4>
              <span :class="['status-badge', localSettings.crmConnected ? 'connected' : 'disconnected']">
                {{ localSettings.crmConnected ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
            <div class="integration-content">
              <div class="form-group">
                <label for="crmType">CRM Type</label>
                <select id="crmType" v-model="localSettings.crmType" class="form-control">
                  <option value="">Select CRM</option>
                  <option value="salesforce">Salesforce</option>
                  <option value="hubspot">HubSpot</option>
                  <option value="pipedrive">Pipedrive</option>
                  <option value="zoho">Zoho CRM</option>
                  <option value="custom">Custom API</option>
                </select>
              </div>
              <div class="form-group">
                <label for="crmApiUrl">API URL</label>
                <input 
                  type="url" 
                  id="crmApiUrl"
                  v-model="localSettings.crmApiUrl" 
                  placeholder="https://api.yourcrm.com"
                  class="form-control"
                />
              </div>
              <div class="form-group">
                <label for="crmApiKey">API Key</label>
                <input 
                  type="password" 
                  id="crmApiKey"
                  v-model="localSettings.crmApiKey" 
                  placeholder="Your CRM API key"
                  class="form-control"
                />
              </div>
            </div>
            <div class="integration-actions">
              <button class="btn btn-secondary btn-sm" @click="testCrmConnection">
                <i class="fas fa-flask"></i> Test Connection
              </button>
            </div>
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
        <span v-else>Save Integration Settings</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'IntegrationSettings',
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
    const showApiKey = ref(false)
    
    const localSettings = ref({
      webhook: '',
      webhookOnNewChat: true,
      webhookOnChatEnd: true,
      webhookOnAgentJoin: false,
      webhookOnMessage: false,
      apiKey: '',
      apiRateLimit: 1000,
      enableApiAccess: true,
      requireApiAuth: true,
      slackWebhook: '',
      slackChannel: '#general',
      slackConnected: false,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPass: '',
      emailConnected: false,
      crmType: '',
      crmApiUrl: '',
      crmApiKey: '',
      crmConnected: false,
      ...props.settings
    })

    // Watch for prop changes
    watch(() => props.settings, (newSettings) => {
      localSettings.value = { ...localSettings.value, ...newSettings }
    }, { deep: true, immediate: true })

    const saveSettings = () => {
      emit('save', localSettings.value)
    }

    const testWebhook = async () => {
      try {
        const response = await fetch('/api/integrations/test-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            url: localSettings.value.webhook
          })
        })
        
        const result = await response.json()
        alert(result.success ? 'Webhook test successful!' : 'Webhook test failed: ' + result.message)
      } catch (error) {
        alert('Webhook test failed: ' + error.message)
      }
    }

    const regenerateApiKey = () => {
      if (confirm('Are you sure you want to regenerate the API key? This will invalidate the current key.')) {
        const newKey = 'lw_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        localSettings.value.apiKey = newKey
      }
    }

    const toggleSlack = () => {
      localSettings.value.slackConnected = !localSettings.value.slackConnected
    }

    const testEmailConnection = async () => {
      try {
        const response = await fetch('/api/integrations/test-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            host: localSettings.value.smtpHost,
            port: localSettings.value.smtpPort,
            user: localSettings.value.smtpUser,
            pass: localSettings.value.smtpPass
          })
        })
        
        const result = await response.json()
        alert(result.success ? 'Email connection test successful!' : 'Email test failed: ' + result.message)
      } catch (error) {
        alert('Email test failed: ' + error.message)
      }
    }

    const testCrmConnection = async () => {
      try {
        const response = await fetch('/api/integrations/test-crm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            type: localSettings.value.crmType,
            url: localSettings.value.crmApiUrl,
            key: localSettings.value.crmApiKey
          })
        })
        
        const result = await response.json()
        alert(result.success ? 'CRM connection test successful!' : 'CRM test failed: ' + result.message)
      } catch (error) {
        alert('CRM test failed: ' + error.message)
      }
    }

    return {
      showApiKey,
      localSettings,
      saveSettings,
      testWebhook,
      regenerateApiKey,
      toggleSlack,
      testEmailConnection,
      testCrmConnection
    }
  }
}
</script>

<style scoped>
.integration-settings {
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

.webhook-settings, .api-settings, .third-party-integrations {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.webhook-settings h3, .api-settings h3, .third-party-integrations h3 {
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
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

.api-key-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.api-key-input {
  padding-right: 50px;
}

.btn-toggle-key {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-toggle-key:hover {
  color: #3b82f6;
  background: #f1f5f9;
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

.webhook-actions, .api-actions {
  margin-top: 16px;
}

.integration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.integration-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.integration-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.integration-header i {
  font-size: 1.2rem;
  color: #3b82f6;
}

.integration-header h4 {
  margin: 0;
  color: #1f2937;
  font-size: 1rem;
  font-weight: 600;
  flex: 1;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.connected {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.disconnected {
  background: #fee2e2;
  color: #991b1b;
}

.integration-content {
  margin-bottom: 12px;
}

.integration-actions {
  display: flex;
  gap: 8px;
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

.btn-sm {
  padding: 8px 16px;
  font-size: 0.85rem;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .integration-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    justify-content: stretch;
  }
  
  .btn {
    justify-content: center;
  }
}
</style>
