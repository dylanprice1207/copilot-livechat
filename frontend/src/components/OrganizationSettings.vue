<template>
  <div class="organization-settings">
    <div class="settings-header">
      <h2><i class="fas fa-building"></i> Organization Settings</h2>
      <p>Basic organization information and configuration</p>
    </div>
    
    <div class="settings-form">
      <div class="form-grid">
        <div class="form-group">
          <label for="orgName">Organization Name</label>
          <input 
            type="text" 
            id="orgName"
            v-model="localSettings.name" 
            placeholder="Enter organization name"
            class="form-control"
          />
        </div>
        
        <div class="form-group">
          <label for="orgDomain">Domain</label>
          <input 
            type="text" 
            id="orgDomain"
            v-model="localSettings.domain" 
            placeholder="example.com"
            class="form-control"
          />
        </div>
        
        <div class="form-group">
          <label for="orgTimezone">Timezone</label>
          <select id="orgTimezone" v-model="localSettings.timezone" class="form-control">
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="orgLanguage">Default Language</label>
          <select id="orgLanguage" v-model="localSettings.language" class="form-control">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
          </select>
        </div>

        <div class="form-group">
          <label for="orgPhone">Phone Number</label>
          <input 
            type="tel" 
            id="orgPhone"
            v-model="localSettings.phone" 
            placeholder="+1 (555) 123-4567"
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label for="orgEmail">Contact Email</label>
          <input 
            type="email" 
            id="orgEmail"
            v-model="localSettings.email" 
            placeholder="contact@example.com"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-group full-width">
        <label for="orgAddress">Address</label>
        <textarea 
          id="orgAddress"
          v-model="localSettings.address" 
          placeholder="Enter organization address"
          class="form-control"
          rows="3"
        ></textarea>
      </div>

      <div class="form-group full-width">
        <label for="orgDescription">Description</label>
        <textarea 
          id="orgDescription"
          v-model="localSettings.description" 
          placeholder="Brief description of your organization"
          class="form-control"
          rows="4"
        ></textarea>
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
        <span v-else>Save Organization Settings</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'OrganizationSettings',
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
      name: '',
      domain: '',
      timezone: 'UTC',
      language: 'en',
      phone: '',
      email: '',
      address: '',
      description: '',
      ...props.settings
    })

    // Watch for prop changes
    watch(() => props.settings, (newSettings) => {
      localSettings.value = { ...localSettings.value, ...newSettings }
    }, { deep: true, immediate: true })

    const saveSettings = () => {
      emit('save', localSettings.value)
    }

    return {
      localSettings,
      saveSettings
    }
  }
}
</script>

<style scoped>
.organization-settings {
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
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

@media (max-width: 768px) {
  .form-grid {
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
