<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="modal-close" @click="$emit('close')">&times;</button>
      <h2>{{ user ? 'Edit User' : 'Create New User' }}</h2>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username"
            v-model="formData.username" 
            required
          >
        </div>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email"
            v-model="formData.email" 
            required
          >
        </div>
        
        <div class="form-group">
          <label for="role">Role</label>
          <select 
            id="role" 
            v-model="formData.role" 
            @change="handleRoleChange"
          >
            <option value="customer">Customer</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div v-if="showDepartments" class="form-group">
          <label>Departments</label>
          <div class="checkbox-group">
            <label v-for="dept in availableDepartments" :key="dept">
              <input 
                type="checkbox" 
                :value="dept"
                v-model="formData.departments"
              > 
              {{ dept.charAt(0).toUpperCase() + dept.slice(1) }}
            </label>
          </div>
        </div>
        
        <div v-if="!user" class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password"
            v-model="formData.password" 
            :required="!user"
          >
        </div>
        
        <div style="margin-top: 30px; text-align: right;">
          <button type="button" class="btn" @click="$emit('close')">
            Cancel
          </button>
          <button 
            type="submit" 
            class="btn btn-success" 
            style="margin-left: 10px;"
            :disabled="saving"
          >
            <i class="fas fa-save"></i> 
            {{ saving ? 'Saving...' : 'Save User' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue'
import api from '@/services/api'

// Props
const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['save', 'close'])

// Injected dependencies
const showAlert = inject('showAlert')

// State
const saving = ref(false)
const availableDepartments = ['general', 'sales', 'technical', 'support', 'billing']

const formData = ref({
  username: '',
  email: '',
  role: 'customer',
  departments: [],
  password: ''
})

// Computed
const showDepartments = computed(() => {
  return formData.value.role === 'agent' || formData.value.role === 'admin'
})

// Methods
const handleRoleChange = () => {
  if (formData.value.role === 'admin') {
    formData.value.departments = [...availableDepartments]
  } else if (formData.value.role === 'customer') {
    formData.value.departments = []
  }
}

const handleSubmit = async () => {
  if (!formData.value.username || !formData.value.email) {
    showAlert('Username and email are required', 'error')
    return
  }

  if (!props.user && !formData.value.password) {
    showAlert('Password is required for new users', 'error')
    return
  }

  try {
    saving.value = true
    
    if (props.user) {
      // Update existing user
      await api.updateUser(props.user._id, {
        username: formData.value.username,
        email: formData.value.email,
        role: formData.value.role,
        departments: formData.value.departments
      })
      showAlert('User updated successfully', 'success')
    } else {
      // Create new user
      await api.createUser({
        username: formData.value.username,
        email: formData.value.email,
        password: formData.value.password,
        role: formData.value.role,
        departments: formData.value.departments
      })
      showAlert('User created successfully', 'success')
    }
    
    emit('save')
  } catch (error) {
    console.error('Error saving user:', error)
    const message = error.response?.data?.message || 'Failed to save user'
    showAlert(message, 'error')
  } finally {
    saving.value = false
  }
}

// Initialize form data
const initializeForm = () => {
  if (props.user) {
    formData.value = {
      username: props.user.username,
      email: props.user.email,
      role: props.user.role,
      departments: [...(props.user.departments || [])],
      password: ''
    }
  } else {
    formData.value = {
      username: '',
      email: '',
      role: 'customer',
      departments: [],
      password: ''
    }
  }
}

// Watch for user changes
watch(() => props.user, initializeForm, { immediate: true })

// Lifecycle
onMounted(() => {
  initializeForm()
})
</script>

<style scoped>
/* Modal styles are in the global CSS */
</style>
