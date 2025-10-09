<template>
  <SettingsLayout 
    :current-page="currentPage"
    :saving="saving"
    :message="message"
    @change-page="changePage"
    @export-all="exportAllSettings"
    @import="importSettings" 
    @reset-all="resetAllSettings"
  >
    <!-- Organization Settings -->
    <OrganizationSettings 
      v-if="currentPage === 'organization'"
      :settings="settings.organization"
      :saving="saving"
      @save="saveOrganizationSettings"
    />
    
    <!-- AI Configuration -->
    <AISettings 
      v-if="currentPage === 'ai'"
      :settings="settings.ai"
      :saving="saving"
      @save="saveAISettings"
      @test="testAIConnection"
    />
    
    <!-- Knowledge Base -->
    <KnowledgeBaseSettings v-if="currentPage === 'knowledge'" />
    
    <!-- Departments -->
    <DepartmentSettings 
      v-if="currentPage === 'departments'"
      :settings="settings.departments"
      :saving="saving"
      @save="saveDepartmentSettings"
    />
    
    <!-- Security -->
    <SecuritySettings 
      v-if="currentPage === 'security'"
      :settings="settings.security"
      :saving="saving"
      @save="saveSecuritySettings"
    />
    
    <!-- Notifications -->
    <NotificationSettings 
      v-if="currentPage === 'notifications'"
      :settings="settings.notifications"
      :saving="saving"
      @save="saveNotificationSettings"
    />
    
    <!-- Integrations -->
    <IntegrationSettings 
      v-if="currentPage === 'integrations'"
      :settings="settings.integrations"
      :saving="saving"
      @save="saveIntegrationSettings"
    />
  </SettingsLayout>

  <!-- Success/Error Messages -->
  <div v-if="message.show" :class="`alert alert-${message.type}`">
    <i :class="message.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
    <span>{{ message.text }}</span>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import SettingsLayout from '@/components/SettingsLayout.vue'
import KnowledgeBaseSettings from '@/components/KnowledgeBaseSettings.vue'
import OrganizationSettings from '@/components/OrganizationSettings.vue'
import AISettings from '@/components/AISettings.vue'
import DepartmentSettings from '@/components/DepartmentSettings.vue'
import SecuritySettings from '@/components/SecuritySettings.vue'
import NotificationSettings from '@/components/NotificationSettings.vue'
import IntegrationSettings from '@/components/IntegrationSettings.vue'

export default {
  name: 'Settings',
  components: {
    SettingsLayout,
    KnowledgeBaseSettings,
    OrganizationSettings,
    AISettings,
    DepartmentSettings,
    SecuritySettings,
    NotificationSettings,
    IntegrationSettings
  },
  setup() {
    const currentPage = ref('organization')
    const saving = ref(false)
    const message = ref({ show: false, type: '', text: '' })
    
    const settings = ref({
      organization: {
        name: 'Lightwave AI',
        domain: 'lightwave.ai',
        timezone: 'UTC',
        language: 'en'
      },
      ai: {
        openaiApiKey: '',
        defaultModel: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7,
        enabled: true
      },
      departments: [
        { name: 'General', description: 'General inquiries and support' },
        { name: 'Technical', description: 'Technical support and troubleshooting' }
      ],
      security: {
        requireAuth: false,
        enableGuestChat: true,
        sessionTimeout: 24,
        maxLoginAttempts: 5
      },
      notifications: {
        email: true,
        browser: true,
        sound: false,
        notificationEmail: 'admin@lightwave.ai'
      },
      integrations: {
        webhook: '',
        apiKey: ''
      }
    })

    const changePage = (page) => {
      currentPage.value = page
    }

    const saveOrganizationSettings = async (orgSettings) => {
      // Save organization settings
      settings.value.organization = orgSettings
      await saveSettings('organization')
    }

    const saveAISettings = async (aiSettings) => {
      // Save AI settings
      settings.value.ai = aiSettings
      await saveSettings('ai')
    }

    const saveDepartmentSettings = async (deptSettings) => {
      // Save department settings
      settings.value.departments = deptSettings
      await saveSettings('departments')
    }

    const saveSecuritySettings = async (secSettings) => {
      // Save security settings
      settings.value.security = secSettings
      await saveSettings('security')
    }

    const saveNotificationSettings = async (notifSettings) => {
      // Save notification settings
      settings.value.notifications = notifSettings
      await saveSettings('notifications')
    }

    const saveIntegrationSettings = async (intSettings) => {
      // Save integration settings
      settings.value.integrations = intSettings
      await saveSettings('integrations')
    }

    const saveSettings = async (section) => {
      try {
        saving.value = true
        
        const response = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            section,
            settings: settings.value[section] 
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          showMessage('success', `${section} settings saved successfully!`)
        } else {
          throw new Error(result.message || 'Failed to save settings')
        }
      } catch (error) {
        console.error('Error saving settings:', error)
        showMessage('error', 'Failed to save settings: ' + error.message)
      } finally {
        saving.value = false
      }
    }

    const testAIConnection = async () => {
      try {
        const response = await fetch('/api/admin/settings/test-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            apiKey: settings.value.ai.openaiApiKey,
            model: settings.value.ai.defaultModel
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          showMessage('success', 'AI connection test successful!')
        } else {
          showMessage('error', result.message)
        }
      } catch (error) {
        showMessage('error', 'Connection test failed: ' + error.message)
      }
    }

    const exportAllSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings/export', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `lightwave-settings-${new Date().toISOString().split('T')[0]}.json`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          showMessage('success', 'Settings exported successfully!')
        }
      } catch (error) {
        showMessage('error', 'Failed to export settings: ' + error.message)
      }
    }

    const importSettings = () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        try {
          const text = await file.text()
          const importedSettings = JSON.parse(text)
          settings.value = { ...settings.value, ...importedSettings }
          showMessage('success', 'Settings imported successfully!')
        } catch (error) {
          showMessage('error', 'Failed to import settings: ' + error.message)
        }
      }
      input.click()
    }

    const resetAllSettings = async () => {
      if (!confirm('Are you sure you want to reset all settings?')) return
      
      try {
        const response = await fetch('/api/admin/settings/reset', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        const result = await response.json()
        
        if (result.success) {
          settings.value = result.settings
          showMessage('success', 'Settings reset successfully!')
        }
      } catch (error) {
        showMessage('error', 'Failed to reset settings: ' + error.message)
      }
    }

    const showMessage = (type, text) => {
      message.value = { show: true, type, text }
      setTimeout(() => {
        message.value.show = false
      }, 3000)
    }

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.settings) {
            settings.value = { ...settings.value, ...data.settings }
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }

    onMounted(() => {
      loadSettings()
    })

    return {
      currentPage,
      saving,
      message,
      settings,
      changePage,
      saveOrganizationSettings,
      saveAISettings,
      saveDepartmentSettings,
      saveSecuritySettings,
      saveNotificationSettings,
      saveIntegrationSettings,
      testAIConnection,
      exportAllSettings,
      importSettings,
      resetAllSettings
    }
  }
}
</script>

<style scoped>
.settings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.alert {
  padding: 15px 20px;
  border-radius: 8px;
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.alert-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}
</style>
