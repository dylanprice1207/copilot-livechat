<template>
  <div class="organizations-management">
    <!-- Access Denied Message for non-global admins -->
    <div v-if="!isGlobalAdmin" class="access-denied">
      <div class="access-denied-content">
        <i class="fas fa-lock"></i>
        <h2>Global Admin Access Required</h2>
        <p>You need to be logged in as a Global Admin to manage organizations.</p>
        <p><strong>Current user:</strong> {{ currentUser?.username || 'Unknown' }} ({{ currentUser?.role || 'No role' }})</p>
        <div class="instructions">
          <h3>To access this page:</h3>
          <ol>
            <li>Log out from the current account</li>
            <li>Log in with Global Admin credentials:
              <ul>
                <li><strong>Username:</strong> globaladmin</li>
                <li><strong>Password:</strong> globaladmin123</li>
              </ul>
            </li>
            <li>Navigate back to this page</li>
          </ol>
        </div>
        <button class="btn btn-secondary" @click="logout">
          <i class="fas fa-sign-out-alt"></i> Logout & Switch Account
        </button>
      </div>
    </div>

    <!-- Normal content for global admins -->
    <div v-else>
      <div class="header">
        <h2><i class="fas fa-building"></i> Organizations Management</h2>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="bulkMagicLogin" v-if="organizations.length > 0">
            <i class="fas fa-magic"></i> Open All Portals
          </button>
          <button class="btn btn-primary" @click="showCreateModal = true">
            <i class="fas fa-plus"></i> Create Organization
          </button>
        </div>
      </div>

    <!-- Organizations List -->
    <div class="organizations-grid" v-if="!loading">
      <div 
        v-for="org in organizations" 
        :key="org._id"
        class="organization-card"
      >
        <div class="org-header">
          <div class="org-info">
            <h3>{{ org.name }}</h3>
            <p class="org-slug">{{ org.slug }}</p>
            <span :class="['status-badge', org.isActive ? 'active' : 'inactive']">
              {{ org.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="org-actions">
            <button class="btn-icon" @click="viewOrganization(org)" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" @click="editOrganization(org)" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon delete" @click="confirmDelete(org)" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div class="org-details">
          <p class="description">{{ org.description || 'No description provided' }}</p>
          
          <div class="org-stats">
            <div class="stat">
              <i class="fas fa-users"></i>
              <span>{{ org.stats?.userCount || 0 }} Users</span>
            </div>
            <div class="stat">
              <i class="fas fa-sitemap"></i>
              <span>{{ org.stats?.departmentCount || 0 }} Departments</span>
            </div>
            <div class="stat">
              <i class="fas fa-user-shield"></i>
              <span>{{ org.adminId?.username || 'No Admin' }}</span>
            </div>
          </div>

          <!-- Organization URLs -->
          <div class="org-urls">
            <h4><i class="fas fa-link"></i> Organization URLs</h4>
            <div class="url-list">
              <div class="url-item">
                <label>Admin Portal:</label>
                <div class="url-controls">
                  <input 
                    :value="getOrgUrl(org.slug, 'admin')" 
                    readonly 
                    class="url-input"
                    :id="'admin-url-' + org._id"
                  />
                  <button 
                    class="btn-copy" 
                    @click="copyUrl(getOrgUrl(org.slug, 'admin'))"
                    title="Copy URL"
                  >
                    <i class="fas fa-copy"></i>
                  </button>
                  <a 
                    :href="getOrgUrl(org.slug, 'admin')" 
                    target="_blank" 
                    class="btn-visit"
                    title="Visit Admin Portal"
                  >
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                  <button 
                    class="btn-magic-login"
                    @click="magicLoginToOrg(org)"
                    title="Magic Login as Admin"
                  >
                    <i class="fas fa-magic"></i>
                  </button>
                </div>
              </div>
              
              <div class="url-item">
                <label>Customer Chat:</label>
                <div class="url-controls">
                  <input 
                    :value="getOrgUrl(org.slug, 'chat')" 
                    readonly 
                    class="url-input"
                  />
                  <button 
                    class="btn-copy" 
                    @click="copyUrl(getOrgUrl(org.slug, 'chat'))"
                    title="Copy URL"
                  >
                    <i class="fas fa-copy"></i>
                  </button>
                  <a 
                    :href="getOrgUrl(org.slug, 'chat')" 
                    target="_blank" 
                    class="btn-visit"
                    title="Visit Customer Chat"
                  >
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </div>
              
              <div class="url-item">
                <label>Agent Dashboard:</label>
                <div class="url-controls">
                  <input 
                    :value="getOrgUrl(org.slug, 'agent')" 
                    readonly 
                    class="url-input"
                  />
                  <button 
                    class="btn-copy" 
                    @click="copyUrl(getOrgUrl(org.slug, 'agent'))"
                    title="Copy URL"
                  >
                    <i class="fas fa-copy"></i>
                  </button>
                  <a 
                    :href="getOrgUrl(org.slug, 'agent')" 
                    target="_blank" 
                    class="btn-visit"
                    title="Visit Agent Dashboard"
                  >
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div class="org-meta">
            <small>Created: {{ formatDate(org.createdAt) }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading organizations...</p>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && organizations.length === 0" class="empty-state">
      <i class="fas fa-building"></i>
      <h3>No Organizations Found</h3>
      <p>Create your first organization to get started.</p>
      <button class="btn btn-primary" @click="showCreateModal = true">
        Create Organization
      </button>
    </div>

    <!-- Create Organization Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Create New Organization</h3>
          <button class="btn-close" @click="showCreateModal = false">&times;</button>
        </div>
        
        <form @submit.prevent="createOrganization" class="modal-body">
          <div class="form-group">
            <label>Organization Name *</label>
            <input 
              v-model="newOrg.name" 
              type="text" 
              required 
              placeholder="Enter organization name"
            />
          </div>
          
          <div class="form-group">
            <label>Description</label>
            <textarea 
              v-model="newOrg.description" 
              placeholder="Brief description of the organization"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Primary Color</label>
              <input v-model="newOrg.primaryColor" type="color" />
            </div>
            <div class="form-group">
              <label>Timezone</label>
              <select v-model="newOrg.timezone">
                <option value="UTC">UTC</option>
                <option value="America/New_York">EST</option>
                <option value="America/Los_Angeles">PST</option>
                <option value="Europe/London">GMT</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>Welcome Message</label>
            <input 
              v-model="newOrg.welcomeMessage" 
              type="text" 
              placeholder="Welcome! How can we help you today?"
            />
          </div>
          
          <div class="form-section">
            <h4>Organization Administrator</h4>
            <div class="form-group">
              <label>
                <input v-model="newOrg.createAdmin" type="checkbox" />
                Create new admin account
              </label>
            </div>
            
            <template v-if="newOrg.createAdmin">
              <div class="form-row">
                <div class="form-group">
                  <label>Admin Username *</label>
                  <input v-model="newOrg.adminUsername" type="text" required />
                </div>
                <div class="form-group">
                  <label>Admin Email *</label>
                  <input v-model="newOrg.adminEmail" type="email" required />
                </div>
              </div>
              <div class="form-group">
                <label>Admin Password *</label>
                <input v-model="newOrg.adminPassword" type="password" required />
              </div>
            </template>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="showCreateModal = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="creating">
              {{ creating ? 'Creating...' : 'Create Organization' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="deleteConfirm" class="modal-overlay" @click="deleteConfirm = null">
      <div class="modal delete-modal" @click.stop>
        <div class="modal-header">
          <h3>Delete Organization</h3>
          <button class="btn-close" @click="deleteConfirm = null">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="warning-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p>Are you sure you want to delete <strong>{{ deleteConfirm.name }}</strong>?</p>
          <p class="warning">This action cannot be undone and will:</p>
          <ul>
            <li>Delete all departments in this organization</li>
            <li>Remove organization reference from all users</li>
            <li>Permanently remove all organization data</li>
          </ul>
        </div>
        
        <div class="form-actions">
          <button class="btn btn-secondary" @click="deleteConfirm = null">
            Cancel
          </button>
          <button class="btn btn-danger" @click="deleteOrganization" :disabled="deleting">
            {{ deleting ? 'Deleting...' : 'Delete Organization' }}
          </button>
        </div>
      </div>
    </div>
    </div> <!-- End v-else -->
  </div>
</template>

<script setup>
import { ref, onMounted, inject, computed } from 'vue'

// Injected dependencies
const showAlert = inject('showAlert')

// Get current user info from localStorage
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
  } catch (error) {
    console.error('Error parsing user data:', error)
  }
  return null
}

const currentUser = ref(getCurrentUser())

// Check if current user is global admin
const isGlobalAdmin = computed(() => {
  return currentUser.value && currentUser.value.role === 'global_admin'
})

// State
const loading = ref(true)
const creating = ref(false)
const deleting = ref(false)
const organizations = ref([])
const showCreateModal = ref(false)
const deleteConfirm = ref(null)

// Form data
const newOrg = ref({
  name: '',
  description: '',
  primaryColor: '#4299e1',
  timezone: 'UTC',
  welcomeMessage: 'Welcome! How can we help you today?',
  createAdmin: false,
  adminUsername: '',
  adminEmail: '',
  adminPassword: ''
})

// Methods
const loadOrganizations = async () => {
  try {
    loading.value = true
    const response = await fetch('/api/global-admin/organizations', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      organizations.value = data.data || []
    } else {
      throw new Error('Failed to load organizations')
    }
  } catch (error) {
    console.error('Error loading organizations:', error)
    showAlert('Failed to load organizations', 'error')
  } finally {
    loading.value = false
  }
}

const createOrganization = async () => {
  try {
    creating.value = true
    const response = await fetch('/api/global-admin/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newOrg.value)
    })
    
    const data = await response.json()
    
    if (response.ok) {
      showAlert('Organization created successfully', 'success')
      showCreateModal.value = false
      resetNewOrgForm()
      await loadOrganizations()
    } else {
      throw new Error(data.message || 'Failed to create organization')
    }
  } catch (error) {
    console.error('Error creating organization:', error)
    showAlert(error.message, 'error')
  } finally {
    creating.value = false
  }
}

const viewOrganization = (org) => {
  // Navigate to organization detail view
  // This would integrate with your routing system
  console.log('View organization:', org)
}

const editOrganization = (org) => {
  // Open edit modal or navigate to edit page
  console.log('Edit organization:', org)
}

const confirmDelete = (org) => {
  deleteConfirm.value = org
}

// URL Generation Methods
const getOrgUrl = (orgSlug, route) => {
  const baseUrl = window.location.origin
  return `${baseUrl}/${orgSlug}/${route}`
}

const copyUrl = async (url) => {
  try {
    await navigator.clipboard.writeText(url)
    showAlert('URL copied to clipboard!', 'success')
  } catch (error) {
    console.error('Failed to copy URL:', error)
    showAlert('Failed to copy URL to clipboard', 'error')
  }
}

// Magic Login Methods
const magicLoginToOrg = async (org) => {
  try {
    showAlert('Generating magic login...', 'info')
    
    // Generate magic login token for this organization
    const response = await fetch('/api/global-admin/magic-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        organizationId: org._id,
        organizationSlug: org.slug,
        targetRole: 'admin'
      })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      // Create magic login URL
      const magicUrl = `${getOrgUrl(org.slug, 'admin')}?magic_token=${data.magicToken}`
      
      // Open in new tab with magic login
      window.open(magicUrl, '_blank')
      showAlert(`Magic login to ${org.name} successful!`, 'success')
    } else {
      throw new Error(data.message || 'Failed to generate magic login')
    }
    
  } catch (error) {
    console.error('Magic login error:', error)
    showAlert('Failed to generate magic login: ' + error.message, 'error')
  }
}

const bulkMagicLogin = async () => {
  try {
    const activeOrgs = organizations.value.filter(org => org.isActive)
    
    if (activeOrgs.length === 0) {
      showAlert('No active organizations found', 'warning')
      return
    }
    
    showAlert(`Opening ${activeOrgs.length} organization portals...`, 'info')
    
    // Delay between opening tabs to avoid popup blocking
    for (let i = 0; i < activeOrgs.length; i++) {
      setTimeout(() => {
        magicLoginToOrg(activeOrgs[i])
      }, i * 500) // 500ms delay between each
    }
    
  } catch (error) {
    console.error('Bulk magic login error:', error)
    showAlert('Failed to open organization portals: ' + error.message, 'error')
  }
}

const deleteOrganization = async () => {
  try {
    deleting.value = true
    const response = await fetch(`/api/global-admin/organizations/${deleteConfirm.value._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      showAlert('Organization deleted successfully', 'success')
      deleteConfirm.value = null
      await loadOrganizations()
    } else {
      throw new Error(data.message || 'Failed to delete organization')
    }
  } catch (error) {
    console.error('Error deleting organization:', error)
    showAlert(error.message, 'error')
  } finally {
    deleting.value = false
  }
}

const resetNewOrgForm = () => {
  newOrg.value = {
    name: '',
    description: '',
    primaryColor: '#4299e1',
    timezone: 'UTC',
    welcomeMessage: 'Welcome! How can we help you today?',
    createAdmin: false,
    adminUsername: '',
    adminEmail: '',
    adminPassword: ''
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  showAlert('Logged out successfully. Please log in with Global Admin credentials.', 'info')
  // Redirect to login or refresh page
  window.location.href = '/'
}

// Lifecycle
onMounted(() => {
  if (isGlobalAdmin.value) {
    loadOrganizations()
  }
})
</script>

<style scoped>
.organizations-management {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 30px;
}

.header h2 {
  margin: 0;
  color: #2d3748;
}

.organizations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.organization-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.organization-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.org-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.org-info h3 {
  margin: 0 0 5px 0;
  color: #2d3748;
  font-size: 1.25em;
}

.org-slug {
  color: #718096;
  font-size: 0.9em;
  margin: 0;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 500;
  margin-top: 5px;
}

.status-badge.active {
  background: #c6f6d5;
  color: #22543d;
}

.status-badge.inactive {
  background: #fed7d7;
  color: #742a2a;
}

.org-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  color: #4a5568;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #edf2f7;
  color: #2d3748;
}

.btn-icon.delete:hover {
  background: #fed7d7;
  color: #c53030;
}

.org-stats {
  display: flex;
  gap: 15px;
  margin: 15px 0;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4a5568;
  font-size: 0.9em;
}

.stat i {
  color: #4299e1;
}

.org-urls {
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.org-urls h4 {
  margin: 0 0 15px 0;
  color: #495057;
  font-size: 1em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.url-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.url-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.url-item label {
  font-size: 0.85em;
  font-weight: 500;
  color: #6c757d;
}

.url-controls {
  display: flex;
  gap: 5px;
  align-items: center;
}

.url-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  font-size: 0.85em;
  color: #495057;
}

.btn-copy,
.btn-visit {
  background: #6c757d;
  color: white;
  border: none;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8em;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-copy:hover {
  background: #495057;
}

.btn-visit {
  background: #007bff;
}

.btn-visit:hover {
  background: #0056b3;
}

.org-meta {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e2e8f0;
}

.org-meta small {
  color: #718096;
}

/* Header Actions */
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* URL Controls */
.url-controls {
  display: flex;
  align-items: center;
  gap: 5px;
}

.url-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8f9fa;
  font-size: 0.85em;
  color: #4a5568;
}

.btn-copy, .btn-visit, .btn-magic-login {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  color: #4a5568;
  transition: all 0.2s ease;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-copy:hover {
  background: #e6fffa;
  color: #00b894;
  border-color: #00b894;
}

.btn-visit:hover {
  background: #e6f3ff;
  color: #0066cc;
  border-color: #0066cc;
}

.btn-magic-login {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
  border: none;
}

.btn-magic-login:hover {
  background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

/* Organization URLs Section */
.org-urls {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e2e8f0;
}

.org-urls h4 {
  margin: 0 0 10px 0;
  color: #4a5568;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.url-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.url-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.url-item label {
  font-size: 0.8em;
  color: #718096;
  font-weight: 500;
}

.loading, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
}

.loading i, .empty-state i {
  font-size: 3em;
  margin-bottom: 20px;
  color: #4299e1;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0 20px;
}

.modal-header h3 {
  margin: 0;
  color: #2d3748;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #718096;
  padding: 0;
  width: 30px;
  height: 30px;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #2d3748;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.form-section h4 {
  margin: 0 0 15px 0;
  color: #2d3748;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
}

.delete-modal .modal-body {
  text-align: center;
}

.warning-icon {
  font-size: 3em;
  color: #f56565;
  margin-bottom: 20px;
}

.warning {
  font-weight: 500;
  color: #c53030;
  margin-top: 15px;
}

.delete-modal ul {
  text-align: left;
  margin: 15px 0;
  color: #4a5568;
}

@media (max-width: 768px) {
  .organizations-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .org-stats {
    flex-direction: column;
    gap: 10px;
  }
}

/* Access Denied Styles */
.access-denied {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 40px;
}

.access-denied-content {
  background: white;
  border: 2px solid #f56565;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.access-denied-content i {
  font-size: 4rem;
  color: #f56565;
  margin-bottom: 20px;
}

.access-denied-content h2 {
  color: #2d3748;
  margin-bottom: 15px;
}

.access-denied-content p {
  color: #4a5568;
  margin-bottom: 20px;
}

.instructions {
  text-align: left;
  background: #f7fafc;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.instructions h3 {
  color: #2d3748;
  margin-bottom: 15px;
}

.instructions ol {
  margin-left: 20px;
}

.instructions li {
  margin-bottom: 10px;
  color: #4a5568;
}

.instructions ul {
  margin: 10px 0 10px 20px;
}

.instructions strong {
  color: #2d3748;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-secondary {
  background: #718096;
  color: white;
}

.btn-secondary:hover {
  background: #4a5568;
}
</style>
