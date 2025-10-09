<template>
  <div class="settings-layout">
    <!-- Settings Header -->
    <div class="settings-header">
      <div class="header-content">
        <h1><i class="fas fa-cog"></i> Settings</h1>
        <p>Configure your organization's chat system</p>
      </div>
    </div>

    <!-- Settings Navigation -->
    <div class="settings-nav">
      <div class="nav-container">
        <button 
          v-for="page in settingsPages" 
          :key="page.id"
          @click="$emit('change-page', page.id)"
          :class="['nav-item', { active: currentPage === page.id }]"
        >
          <i :class="page.icon"></i>
          <span>{{ page.label }}</span>
        </button>
      </div>
    </div>

    <!-- Settings Content -->
    <div class="settings-content">
      <slot></slot>
    </div>

    <!-- Global Actions -->
    <div class="settings-actions">
      <button class="btn btn-secondary" @click="$emit('export-all')" :disabled="saving">
        <i class="fas fa-download"></i> Export All Settings
      </button>
      <button class="btn btn-secondary" @click="$emit('import')" :disabled="saving">
        <i class="fas fa-upload"></i> Import Settings
      </button>
      <button class="btn btn-danger" @click="$emit('reset-all')" :disabled="saving">
        <i class="fas fa-undo"></i> Reset All
      </button>
    </div>

    <!-- Global Messages -->
    <div v-if="message.show" :class="`alert alert-${message.type}`">
      <i :class="message.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
      <span>{{ message.text }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsLayout',
  props: {
    currentPage: {
      type: String,
      required: true
    },
    saving: {
      type: Boolean,
      default: false
    },
    message: {
      type: Object,
      default: () => ({ show: false, type: '', text: '' })
    }
  },
  emits: ['change-page', 'export-all', 'import', 'reset-all'],
  setup() {
    const settingsPages = [
      { id: 'organization', label: 'Organization', icon: 'fas fa-building' },
      { id: 'ai', label: 'AI Configuration', icon: 'fas fa-robot' },
      { id: 'knowledge', label: 'Knowledge Base', icon: 'fas fa-brain' },
      { id: 'departments', label: 'Departments', icon: 'fas fa-users' },
      { id: 'security', label: 'Security', icon: 'fas fa-shield-alt' },
      { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
      { id: 'integrations', label: 'Integrations', icon: 'fas fa-plug' }
    ]

    return {
      settingsPages
    }
  }
}
</script>

<style scoped>
.settings-layout {
  min-height: 100vh;
  background: #f8fafc;
}

.settings-header {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
  padding: 30px 40px;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-content h1 i {
  color: rgba(255, 255, 255, 0.9);
}

.header-content p {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.settings-nav {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 40px;
  overflow-x: auto;
}

.nav-container {
  display: flex;
  gap: 0;
  min-width: max-content;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 0.95rem;
}

.nav-item:hover {
  color: #1a202c;
  background: #f8fafc;
}

.nav-item.active {
  color: #1e88e5;
  border-bottom-color: #1e88e5;
  background: #f8fafc;
}

.nav-item i {
  font-size: 1.1rem;
}

.settings-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px;
}

.settings-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 20px 40px;
  background: white;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.btn-danger:hover:not(:disabled) {
  background: #fecaca;
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.alert {
  margin: 20px 40px;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}

.alert-success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.alert-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.alert-info {
  background: #f0f9ff;
  color: #0c4a6e;
  border: 1px solid #bae6fd;
}

@media (max-width: 768px) {
  .settings-header, .settings-content {
    padding: 20px;
  }
  
  .settings-nav {
    padding: 0 20px;
  }
  
  .nav-item {
    padding: 12px 16px;
  }
  
  .nav-item span {
    display: none;
  }
  
  .settings-actions {
    flex-direction: column;
    align-items: stretch;
    padding: 20px;
  }
}
</style>
