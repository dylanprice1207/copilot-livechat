<template>
  <div class="knowledge-base-settings">
    <div class="page-header">
      <h2><i class="fas fa-brain"></i> Knowledge Base Management</h2>
      <p>Train your AI with organization-specific content, documents, and FAQs</p>
    </div>

    <!-- Knowledge Base Stats -->
    <div class="stats-section">
      <div class="stats-header">
        <h3><i class="fas fa-chart-bar"></i> Knowledge Base Statistics</h3>
        <button @click="loadStats" class="btn-refresh" :disabled="loadingStats">
          <i :class="['fas fa-sync', { 'fa-spin': loadingStats }]"></i>
        </button>
      </div>
      
      <div v-if="stats" class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ stats.totalItems || 0 }}</div>
          <div class="stat-label">Total Items</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.categories || 0 }}</div>
          <div class="stat-label">Categories</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.searchTerms || 0 }}</div>
          <div class="stat-label">Search Terms</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ fileStats.totalFiles || 0 }}</div>
          <div class="stat-label">Uploaded Files</div>
        </div>
        <div class="stat-card">
          <div :class="['stat-indicator', stats.isLoaded ? 'active' : 'inactive']">
            {{ stats.isLoaded ? 'Active' : 'Inactive' }}
          </div>
          <div class="stat-label">Status</div>
        </div>
      </div>
      
      <div v-else class="stats-loading">
        <p>Click refresh to load knowledge base statistics</p>
      </div>
    </div>

    <!-- File Upload Section -->
    <div class="upload-section">
      <div class="section-header">
        <h3><i class="fas fa-cloud-upload-alt"></i> Upload Documents</h3>
        <p>Upload documents to automatically extract knowledge content</p>
      </div>
      
      <div class="upload-area">
        <div 
          @drop="handleDrop" 
          @dragover.prevent 
          @dragenter.prevent
          :class="['dropzone', { 'dragover': isDragOver }]"
          @dragenter="isDragOver = true"
          @dragleave="isDragOver = false"
        >
          <div class="dropzone-content">
            <i class="fas fa-cloud-upload-alt"></i>
            <h4>Drop files here or click to select</h4>
            <p>Supports: PDF, DOC, DOCX, TXT, MD files</p>
            <input 
              ref="fileInput" 
              type="file" 
              multiple 
              accept=".pdf,.doc,.docx,.txt,.md"
              @change="handleFileSelect"
              style="display: none;"
            />
            <button @click="$refs.fileInput.click()" class="btn btn-primary">
              <i class="fas fa-plus"></i> Select Files
            </button>
          </div>
        </div>
        
        <!-- Upload Progress -->
        <div v-if="uploadQueue.length > 0" class="upload-progress">
          <h4>Upload Progress</h4>
          <div v-for="upload in uploadQueue" :key="upload.id" class="upload-item">
            <div class="upload-info">
              <span class="filename">{{ upload.file.name }}</span>
              <span class="filesize">({{ formatFileSize(upload.file.size) }})</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="`width: ${upload.progress}%`"></div>
            </div>
            <span class="upload-status">{{ upload.status }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Categories Management -->
    <div class="categories-section">
      <div class="section-header">
        <h3><i class="fas fa-folder-open"></i> Knowledge Categories</h3>
        <button @click="initializeKnowledge" class="btn btn-secondary" :disabled="initializing">
          <i :class="['fas fa-database', { 'fa-spin': initializing }]"></i>
          {{ initializing ? 'Initializing...' : 'Initialize Default KB' }}
        </button>
      </div>
      
      <div v-if="categories.length > 0" class="categories-grid">
        <div v-for="category in categories" :key="category" class="category-card">
          <div class="category-info">
            <h4>{{ formatCategoryName(category) }}</h4>
            <span class="item-count">{{ getCategoryItemCount(category) }} items</span>
          </div>
          <div class="category-actions">
            <button @click="viewCategory(category)" class="btn-icon" title="View Items">
              <i class="fas fa-eye"></i>
            </button>
            <button @click="editCategory(category)" class="btn-icon" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button @click="exportCategory(category)" class="btn-icon" title="Export">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div v-else class="no-categories">
        <p>No categories found. Initialize the knowledge base to get started.</p>
      </div>
    </div>

    <!-- Manual Knowledge Entry -->
    <div class="manual-entry-section">
      <div class="section-header">
        <h3><i class="fas fa-edit"></i> Add Knowledge Manually</h3>
      </div>
      
      <form @submit.prevent="addKnowledge" class="knowledge-form">
        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select v-model="newItem.category" required class="form-control">
              <option value="">Select Category</option>
              <option v-for="category in categories" :key="category" :value="category">
                {{ formatCategoryName(category) }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Item ID</label>
            <input 
              v-model="newItem.id" 
              type="text" 
              class="form-control" 
              placeholder="e.g., dimmer-pairing-guide"
              required
            />
          </div>
        </div>
        
        <div class="form-group">
          <label>Title</label>
          <input 
            v-model="newItem.title" 
            type="text" 
            class="form-control" 
            placeholder="e.g., How to Pair Dimmer Switch"
            required
          />
        </div>
        
        <div class="form-group">
          <label>Content</label>
          <textarea 
            v-model="newItem.content" 
            class="form-control content-textarea"
            placeholder="Detailed explanation, instructions, or information..."
            rows="6"
            required
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Keywords (comma-separated)</label>
            <input 
              v-model="newItem.keywordsText" 
              type="text" 
              class="form-control" 
              placeholder="dimmer, pairing, switch, setup, installation"
            />
          </div>
          
          <div class="form-group">
            <label>Priority</label>
            <select v-model="newItem.priority" class="form-control">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>Quick Answers (one per line)</label>
          <textarea 
            v-model="newItem.answersText" 
            class="form-control"
            placeholder="Short, direct answers to common questions..."
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="adding">
            <i class="fas fa-plus"></i> 
            {{ adding ? 'Adding...' : 'Add Knowledge Item' }}
          </button>
          <button type="button" @click="resetForm" class="btn btn-secondary">
            <i class="fas fa-undo"></i> Reset Form
          </button>
        </div>
      </form>
    </div>

    <!-- Knowledge Search & Testing -->
    <div class="search-section">
      <div class="section-header">
        <h3><i class="fas fa-search"></i> Test Knowledge Base</h3>
      </div>
      
      <div class="search-form">
        <div class="search-input-group">
          <input 
            v-model="searchQuery" 
            type="text" 
            class="form-control search-input" 
            placeholder="Ask a question to test the knowledge base..."
            @keyup.enter="searchKnowledge"
          />
          <button @click="searchKnowledge" class="btn btn-primary" :disabled="searching">
            <i :class="['fas fa-search', { 'fa-spin': searching }]"></i>
            {{ searching ? 'Searching...' : 'Search' }}
          </button>
        </div>
        
        <div class="search-options">
          <label class="checkbox-label">
            <input type="checkbox" v-model="searchOptions.includeFiles" />
            <span>Include uploaded files</span>
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="searchOptions.fuzzySearch" />
            <span>Fuzzy search</span>
          </label>
          <select v-model="searchOptions.category" class="form-control small">
            <option value="">All Categories</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ formatCategoryName(category) }}
            </option>
          </select>
        </div>
      </div>
      
      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="search-results">
        <h4>{{ searchResults.length }} Result(s) Found</h4>
        <div v-for="result in searchResults" :key="result.id" class="result-item">
          <div class="result-header">
            <h5>{{ result.title }}</h5>
            <div class="result-meta">
              <span class="result-category">{{ formatCategoryName(result.category) }}</span>
              <span v-if="result.source" class="result-source">{{ result.source }}</span>
            </div>
          </div>
          <p class="result-content">{{ result.content.substring(0, 300) }}...</p>
          <div v-if="result.answers && result.answers.length > 0" class="result-answers">
            <strong>Quick Answers:</strong>
            <ul>
              <li v-for="answer in result.answers.slice(0, 3)" :key="answer">{{ answer }}</li>
            </ul>
          </div>
          <div class="result-actions">
            <button @click="editItem(result)" class="btn-small btn-secondary">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button @click="deleteItem(result.id)" class="btn-small btn-danger">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
      
      <div v-else-if="searchQuery && !searching" class="no-results">
        <i class="fas fa-search"></i>
        <p>No knowledge base entries found for "{{ searchQuery }}"</p>
        <p class="hint">Try using different keywords or check your spelling</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'KnowledgeBaseSettings',
  setup() {
    // Reactive data
    const stats = ref(null)
    const fileStats = ref({ totalFiles: 0, totalSize: 0 })
    const categories = ref([])
    const searchResults = ref([])
    const uploadQueue = ref([])
    
    const newItem = ref({
      category: '',
      id: '',
      title: '',
      content: '',
      keywordsText: '',
      answersText: '',
      priority: 'medium'
    })
    
    const searchQuery = ref('')
    const searchOptions = ref({
      includeFiles: true,
      fuzzySearch: false,
      category: ''
    })
    
    // Loading states
    const loadingStats = ref(false)
    const adding = ref(false)
    const searching = ref(false)
    const initializing = ref(false)
    const isDragOver = ref(false)
    
    // Methods
    const loadStats = async () => {
      try {
        loadingStats.value = true
        const response = await fetch('/api/knowledge/stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const result = await response.json()
        if (result.success) {
          stats.value = result.stats
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        loadingStats.value = false
      }
    }
    
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/knowledge/categories', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const result = await response.json()
        if (result.success) {
          categories.value = result.categories
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      }
    }
    
    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files)
      uploadFiles(files)
    }
    
    const handleDrop = (event) => {
      event.preventDefault()
      isDragOver.value = false
      const files = Array.from(event.dataTransfer.files)
      uploadFiles(files)
    }
    
    const uploadFiles = async (files) => {
      for (const file of files) {
        const uploadItem = {
          id: Date.now() + Math.random(),
          file: file,
          progress: 0,
          status: 'Uploading...'
        }
        
        uploadQueue.value.push(uploadItem)
        
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('category', 'uploaded-documents')
          
          const response = await fetch('/api/knowledge/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
          })
          
          const result = await response.json()
          
          if (result.success) {
            uploadItem.progress = 100
            uploadItem.status = 'Complete'
            loadStats()
            loadCategories()
          } else {
            uploadItem.status = 'Failed: ' + result.message
          }
        } catch (error) {
          uploadItem.status = 'Failed: ' + error.message
        }
        
        // Remove from queue after 3 seconds
        setTimeout(() => {
          const index = uploadQueue.value.findIndex(item => item.id === uploadItem.id)
          if (index > -1) uploadQueue.value.splice(index, 1)
        }, 3000)
      }
    }
    
    const addKnowledge = async () => {
      try {
        adding.value = true
        
        const keywords = newItem.value.keywordsText
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0)
        
        const answers = newItem.value.answersText
          .split('\n')
          .map(a => a.trim())
          .filter(a => a.length > 0)
        
        const item = {
          id: newItem.value.id,
          title: newItem.value.title,
          content: newItem.value.content,
          keywords: keywords,
          answers: answers,
          priority: newItem.value.priority,
          tags: []
        }
        
        const response = await fetch('/api/knowledge/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            category: newItem.value.category,
            item: item
          })
        })
        
        const result = await response.json()
        if (result.success) {
          resetForm()
          loadStats()
          loadCategories()
        }
      } catch (error) {
        console.error('Error adding knowledge:', error)
      } finally {
        adding.value = false
      }
    }
    
    const searchKnowledge = async () => {
      if (!searchQuery.value.trim()) return
      
      try {
        searching.value = true
        const params = new URLSearchParams({
          query: searchQuery.value,
          category: searchOptions.value.category,
          includeFiles: searchOptions.value.includeFiles,
          fuzzy: searchOptions.value.fuzzySearch,
          limit: 10
        })
        
        const response = await fetch(`/api/knowledge/search?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        
        const result = await response.json()
        if (result.success) {
          searchResults.value = result.results
        }
      } catch (error) {
        console.error('Error searching:', error)
      } finally {
        searching.value = false
      }
    }
    
    const initializeKnowledge = async () => {
      try {
        initializing.value = true
        const response = await fetch('/api/knowledge/initialize', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const result = await response.json()
        if (result.success) {
          stats.value = result.stats
          loadCategories()
        }
      } catch (error) {
        console.error('Error initializing:', error)
      } finally {
        initializing.value = false
      }
    }
    
    const resetForm = () => {
      newItem.value = {
        category: '',
        id: '',
        title: '',
        content: '',
        keywordsText: '',
        answersText: '',
        priority: 'medium'
      }
    }
    
    const formatCategoryName = (category) => {
      return category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
    
    const getCategoryItemCount = (category) => {
      if (!stats.value?.categoryCounts) return 0
      return stats.value.categoryCounts[category] || 0
    }
    
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    const viewCategory = (category) => {
      // Navigate to category detail view
      console.log('View category:', category)
    }
    
    const editCategory = (category) => {
      // Open category edit modal
      console.log('Edit category:', category)
    }
    
    const exportCategory = (category) => {
      // Export category data
      console.log('Export category:', category)
    }
    
    const editItem = (item) => {
      // Pre-fill form with item data for editing
      newItem.value = {
        category: item.category,
        id: item.id,
        title: item.title,
        content: item.content,
        keywordsText: item.keywords ? item.keywords.join(', ') : '',
        answersText: item.answers ? item.answers.join('\n') : '',
        priority: item.priority || 'medium'
      }
    }
    
    const deleteItem = async (itemId) => {
      if (!confirm('Are you sure you want to delete this knowledge item?')) return
      
      try {
        const response = await fetch(`/api/knowledge/delete/${itemId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        
        if (response.ok) {
          searchKnowledge() // Refresh results
          loadStats()
        }
      } catch (error) {
        console.error('Error deleting item:', error)
      }
    }
    
    onMounted(() => {
      loadStats()
      loadCategories()
    })
    
    return {
      // Data
      stats,
      fileStats,
      categories,
      searchResults,
      uploadQueue,
      newItem,
      searchQuery,
      searchOptions,
      // Loading states
      loadingStats,
      adding,
      searching,
      initializing,
      isDragOver,
      // Methods
      loadStats,
      loadCategories,
      handleFileSelect,
      handleDrop,
      uploadFiles,
      addKnowledge,
      searchKnowledge,
      initializeKnowledge,
      resetForm,
      formatCategoryName,
      getCategoryItemCount,
      formatFileSize,
      viewCategory,
      editCategory,
      exportCategory,
      editItem,
      deleteItem
    }
  }
}
</script>

<style scoped>
.knowledge-base-settings {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #1a202c;
  font-size: 1.5rem;
}

.page-header p {
  margin: 0;
  color: #64748b;
  font-size: 1rem;
}

.stats-section, .upload-section, .categories-section, .manual-entry-section, .search-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.section-header, .stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3, .stats-header h3 {
  margin: 0;
  color: #1a202c;
  font-size: 1.2rem;
}

.section-header p {
  margin: 4px 0 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.btn-refresh {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  color: #1e88e5;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: #f1f5f9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: bold;
  color: #1e88e5;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
}

.stat-indicator {
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.stat-indicator.active {
  background: #10b981;
  color: white;
}

.stat-indicator.inactive {
  background: #ef4444;
  color: white;
}

.dropzone {
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  background: #fafbfc;
  transition: all 0.2s;
  cursor: pointer;
}

.dropzone.dragover {
  border-color: #1e88e5;
  background: #f0f4ff;
}

.dropzone-content i {
  font-size: 3rem;
  color: #94a3b8;
  margin-bottom: 16px;
}

.dropzone-content h4 {
  margin: 0 0 8px 0;
  color: #1a202c;
}

.dropzone-content p {
  margin: 0 0 20px 0;
  color: #64748b;
}

.upload-progress {
  margin-top: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.upload-progress h4 {
  margin: 0 0 16px 0;
  font-size: 1rem;
}

.upload-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.upload-info {
  flex: 1;
  min-width: 0;
}

.filename {
  font-weight: 500;
  color: #1a202c;
}

.filesize {
  color: #64748b;
  font-size: 0.85rem;
}

.progress-bar {
  width: 200px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #1e88e5;
  transition: width 0.2s;
}

.upload-status {
  font-size: 0.85rem;
  color: #64748b;
  width: 100px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.category-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-info h4 {
  margin: 0 0 4px 0;
  color: #1a202c;
}

.item-count {
  font-size: 0.85rem;
  color: #64748b;
}

.category-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  color: #64748b;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e2e8f0;
  color: #1a202c;
}

.knowledge-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-weight: 500;
  color: #374151;
}

.form-control {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #1e88e5;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.content-textarea {
  min-height: 120px;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 16px;
  border-radius: 6px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-primary {
  background: #1e88e5;
  color: white;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.85rem;
}

.btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.btn-danger:hover {
  background: #fecaca;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input-group {
  display: flex;
  gap: 12px;
}

.search-input {
  flex: 1;
}

.search-options {
  display: flex;
  align-items: center;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.form-control.small {
  width: auto;
  min-width: 150px;
}

.search-results h4 {
  margin: 0 0 16px 0;
  color: #1a202c;
}

.result-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 8px;
}

.result-header h5 {
  margin: 0;
  color: #1a202c;
}

.result-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.result-category, .result-source {
  background: #1e88e5;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.result-source {
  background: #059669;
}

.result-content {
  color: #4a5568;
  line-height: 1.5;
  margin-bottom: 12px;
}

.result-answers ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.result-answers li {
  margin-bottom: 4px;
  color: #4a5568;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.no-results, .no-categories, .stats-loading {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.no-results i {
  font-size: 2rem;
  margin-bottom: 12px;
  color: #94a3b8;
}

.no-results .hint {
  font-size: 0.85rem;
  font-style: italic;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .categories-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .search-input-group {
    flex-direction: column;
  }
  
  .search-options {
    flex-direction: column;
    align-items: start;
    gap: 8px;
  }
  
  .result-header {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
