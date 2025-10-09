<template>
  <div class="department-settings">
    <div class="settings-header">
      <h2><i class="fas fa-sitemap"></i> Department Settings</h2>
      <p>Manage chat departments and routing configuration</p>
    </div>
    
    <div class="settings-form">
      <div class="departments-list">
        <div 
          v-for="(department, index) in localSettings" 
          :key="index"
          class="department-item"
        >
          <div class="department-info">
            <div class="form-group">
              <label>Department Name</label>
              <input 
                type="text" 
                v-model="department.name" 
                placeholder="Department name"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Description</label>
              <input 
                type="text" 
                v-model="department.description" 
                placeholder="Department description"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Priority Level</label>
              <select v-model="department.priority" class="form-control">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div class="department-actions">
            <button 
              class="btn btn-danger btn-small"
              @click="removeDepartment(index)"
              :disabled="localSettings.length <= 1"
              title="Delete Department"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div class="add-department">
        <button class="btn btn-secondary" @click="addDepartment">
          <i class="fas fa-plus"></i> Add Department
        </button>
      </div>

      <div class="department-settings-options">
        <h3>Department Settings</h3>
        <div class="form-grid">
          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="autoAssign"
                v-model="departmentConfig.autoAssign"
              />
              <label for="autoAssign">Auto-assign chats to departments</label>
            </div>
          </div>
          
          <div class="form-group">
            <div class="checkbox-item">
              <input 
                type="checkbox" 
                id="allowTransfer"
                v-model="departmentConfig.allowTransfer"
              />
              <label for="allowTransfer">Allow chat transfers between departments</label>
            </div>
          </div>

          <div class="form-group">
            <label for="defaultDept">Default Department</label>
            <select id="defaultDept" v-model="departmentConfig.defaultDepartment" class="form-control">
              <option value="">Select default department</option>
              <option v-for="dept in localSettings" :key="dept.name" :value="dept.name">
                {{ dept.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="maxQueue">Max Queue Size per Department</label>
            <input 
              type="number" 
              id="maxQueue"
              v-model="departmentConfig.maxQueueSize" 
              placeholder="50"
              min="1"
              max="200"
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
        <span v-else>Save Department Settings</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'DepartmentSettings',
  props: {
    settings: {
      type: Array,
      required: true
    },
    saving: {
      type: Boolean,
      default: false
    }
  },
  emits: ['save'],
  setup(props, { emit }) {
    const localSettings = ref([
      { name: 'General', description: 'General inquiries and support', priority: 'medium' },
      { name: 'Technical', description: 'Technical support and troubleshooting', priority: 'high' },
      ...props.settings
    ])

    const departmentConfig = ref({
      autoAssign: true,
      allowTransfer: true,
      defaultDepartment: 'General',
      maxQueueSize: 50
    })

    // Watch for prop changes
    watch(() => props.settings, (newSettings) => {
      if (newSettings && newSettings.length > 0) {
        localSettings.value = [...newSettings]
      }
    }, { deep: true, immediate: true })

    const addDepartment = () => {
      localSettings.value.push({
        name: '',
        description: '',
        priority: 'medium'
      })
    }

    const removeDepartment = (index) => {
      if (localSettings.value.length > 1) {
        localSettings.value.splice(index, 1)
      }
    }

    const saveSettings = () => {
      emit('save', {
        departments: localSettings.value,
        config: departmentConfig.value
      })
    }

    return {
      localSettings,
      departmentConfig,
      addDepartment,
      removeDepartment,
      saveSettings
    }
  }
}
</script>

<style scoped>
.department-settings {
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

.departments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.department-item {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.department-info {
  display: grid;
  grid-template-columns: 1fr 1fr 150px;
  gap: 16px;
  flex: 1;
}

.department-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-department {
  margin-bottom: 32px;
}

.department-settings-options {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.department-settings-options h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 1.2rem;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
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
  padding: 8px 12px;
  font-size: 0.85rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

@media (max-width: 768px) {
  .department-item {
    flex-direction: column;
    align-items: stretch;
  }

  .department-info {
    grid-template-columns: 1fr;
  }

  .department-actions {
    justify-content: center;
  }

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
