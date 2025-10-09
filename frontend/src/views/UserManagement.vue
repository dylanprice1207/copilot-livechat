<template>
  <div>
    <!-- User Management Header -->
    <div class="header">
      <div class="header-content">
        <h1><i class="fas fa-users"></i> User Management</h1>
        <p>Manage users, agents, and administrators</p>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h3>Users & Agents</h3>
        <button class="btn btn-primary" @click="openCreateUserModal">
          <i class="fas fa-plus"></i> Add New User
        </button>
      </div>
    
    <!-- Search -->
    <div class="form-group">
      <input 
        type="text" 
        v-model="searchTerm"
        placeholder="Search users by name or email..."
        @input="filterUsers"
      >
    </div>

    <!-- Loading State -->
    <div v-if="loading" style="text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 2em; color: #4299e1;"></i>
      <p style="margin-top: 15px; color: #718096;">Loading users...</p>
    </div>

    <!-- Users Table -->
    <table v-else class="users-table">
      <thead>
        <tr>
          <th>User</th>
          <th>Email</th>
          <th>Role</th>
          <th>Departments</th>
          <th>Status</th>
          <th>Last Active</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in filteredUsers" :key="user._id">
          <td>
            <span :class="['status-indicator', user.isOnline ? 'status-online' : 'status-offline']"></span>
            {{ user.username }}
          </td>
          <td>{{ user.email }}</td>
          <td>
            <span class="department-badge">{{ user.role }}</span>
          </td>
          <td>
            <span 
              v-for="dept in (user.departments || [])" 
              :key="dept"
              class="department-badge"
            >
              {{ dept }}
            </span>
          </td>
          <td>{{ user.isOnline ? 'Online' : 'Offline' }}</td>
          <td>{{ formatDate(user.lastActive) }}</td>
          <td>
            <button class="btn" @click="editUser(user)" style="margin-right: 5px;">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger" @click="deleteUser(user._id)">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
        <tr v-if="filteredUsers.length === 0">
          <td colspan="7" style="text-align: center; padding: 40px; color: #718096;">
            {{ searchTerm ? 'No users found matching your search.' : 'No users found.' }}
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '@/services/api'

// Injected dependencies
const openUserModal = inject('openUserModal')
const showAlert = inject('showAlert')

// State
const loading = ref(true)
const users = ref([])
const searchTerm = ref('')

// Computed
const filteredUsers = computed(() => {
  if (!searchTerm.value) return users.value
  
  const term = searchTerm.value.toLowerCase()
  return users.value.filter(user => 
    user.username.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term)
  )
})

// Methods
const loadUsers = async () => {
  try {
    loading.value = true
    const response = await api.getUsers()
    users.value = response.users || []
  } catch (error) {
    console.error('Error loading users:', error)
    showAlert('Failed to load users', 'error')
  } finally {
    loading.value = false
  }
}

const openCreateUserModal = () => {
  openUserModal(null)
}

const editUser = (user) => {
  openUserModal(user)
}

const deleteUser = async (userId) => {
  if (!confirm('Are you sure you want to delete this user?')) return
  
  try {
    await api.deleteUser(userId)
    showAlert('User deleted successfully', 'success')
    await loadUsers() // Refresh list
  } catch (error) {
    console.error('Error deleting user:', error)
    showAlert('Failed to delete user', 'error')
  }
}

const filterUsers = () => {
  // This is handled by the computed property
}

const formatDate = (date) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleString()
}

// Lifecycle
onMounted(() => {
  loadUsers()
})

// Expose methods for parent component
defineExpose({
  loadUsers
})
</script>

<style scoped>
.header {
  margin-bottom: 30px;
  padding: 20px 0;
  border-bottom: 2px solid #e2e8f0;
  display: flex;
  justify-content: center;
}

.header-content {
  text-align: center;
  max-width: 600px;
}

.header h1 {
  font-size: 2.5rem;
  color: #2d3748;
  margin: 0 0 10px 0;
  font-weight: 600;
  text-align: center;
  margin-left: 20px;
}

.header h1 i {
  color: #4299e1;
  margin-right: 10px;
}

.header p {
  color: #718096;
  font-size: 1.1rem;
  margin: 0;
  text-align: left;
  margin-left: -10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #2d3748;
  font-weight: 600;
}

.btn-primary {
  background: #4299e1;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background: #3182ce;
}

.btn-primary i {
  margin-right: 8px;
}

.fa-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
