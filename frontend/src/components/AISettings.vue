<template>
  <div class="ai-settings">
    <div class="settings-header">
      <h2><i class="fas fa-robot"></i> AI Configuration</h2>
      <p>Configure AI assistant settings and API integration</p>
    </div>
    
    <div class="settings-form">
      <div class="form-group full-width">
        <label for="openaiApiKey">OpenAI API Key</label>
        <div class="api-key-wrapper">
          <input 
            :type="showApiKey ? 'text' : 'password'"
            id="openaiApiKey"
            v-model="localSettings.openaiApiKey" 
            placeholder="sk-..."
            class="form-control api-key-input"
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
      
      <div class="form-grid">
        <div class="form-group">
          <label for="defaultModel">Default AI Model</label>
          <select id="defaultModel" v-model="localSettings.defaultModel" class="form-control">
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
            v-model="localSettings.maxTokens" 
            placeholder="2000"
            min="100"
            max="8000"
            class="form-control"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="aiTemperature">
          Response Creativity: {{ localSettings.temperature }}
        </label>
        <input 
          type="range" 
          id="aiTemperature"
          v-model.number="localSettings.temperature"
          min="0" 
          max="1" 
          step="0.1"
          class="slider"
        />
        <div class="slider-labels">
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>
      
      <div class="form-group">
        <label for="presencePenalty">
          Repetition Control: {{ localSettings.presencePenalty }}
        </label>
        <input 
          type="range" 
          id="presencePenalty"
          v-model.number="localSettings.presencePenalty"
          min="0" 
          max="2" 
          step="0.1"
          class="slider"
        />
        <div class="slider-labels">
          <span>Allow Repetition</span>
          <span>Avoid Repetition</span>
        </div>
      </div>

      <div class="form-group">
        <div class="checkbox-item">
          <input 
            type="checkbox" 
            id="enableAI"
            v-model="localSettings.enabled"
          />
          <label for="enableAI">Enable AI Assistant</label>
        </div>
      </div>

      <div class="form-group">
        <label for="systemPrompt">System Prompt</label>
        <textarea 
          id="systemPrompt"
          v-model="localSettings.systemPrompt" 
          placeholder="You are a helpful AI assistant..."
          class="form-control"
          rows="4"
        ></textarea>
      </div>
    </div>
    
    <div class="form-actions">
      <button 
        class="btn btn-secondary" 
        @click="testConnection"
        :disabled="saving || !localSettings.openaiApiKey"
      >
        <i class="fas fa-flask"></i> Test AI Connection
      </button>
      
      <button 
        class="btn btn-primary"
        @click="saveSettings"
        :disabled="saving"
      >
        <i class="fas fa-save"></i>
        <span v-if="saving">Saving...</span>
        <span v-else>Save AI Settings</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'AISettings',
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
  emits: ['save', 'test'],
  setup(props, { emit }) {
    const showApiKey = ref(false)
    
    const localSettings = ref({
      openaiApiKey: '',
      defaultModel: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
      presencePenalty: 0.6,
      enabled: true,
      systemPrompt: 'You are a helpful AI assistant for customer support. Be friendly, professional, and provide accurate information.',
      ...props.settings
    })

    // Watch for prop changes
    watch(() => props.settings, (newSettings) => {
      localSettings.value = { ...localSettings.value, ...newSettings }
    }, { deep: true, immediate: true })

    const saveSettings = () => {
      emit('save', localSettings.value)
    }

    const testConnection = () => {
      emit('test', localSettings.value)
    }

    return {
      showApiKey,
      localSettings,
      saveSettings,
      testConnection
    }
  }
}
</script>

<style scoped>
.ai-settings {
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
  margin-bottom: 20px;
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

.slider {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  background: #2563eb;
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.8rem;
  color: #6b7280;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
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
    flex-direction: column;
  }
  
  .btn {
    justify-content: center;
  }
}
</style>
