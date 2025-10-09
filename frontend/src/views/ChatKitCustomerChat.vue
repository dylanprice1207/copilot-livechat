<template>
  <div class="chatkit-customer-page">
    <!-- Header -->
    <header class="chat-header">
      <div class="header-content">
        <div class="company-info">
          <h1>{{ organizationName }} Support</h1>
          <p>Get instant help from our AI-powered support team</p>
        </div>
        <div class="status-indicator" :class="{ 'online': isOnline, 'offline': !isOnline }">
          <span class="status-dot"></span>
          {{ isOnline ? 'Online' : 'Connecting...' }}
        </div>
      </div>
    </header>

    <!-- Chat Area -->
    <main class="chat-main">
      <div class="chat-container">
        <!-- Welcome Section -->
        <div v-if="!chatStarted" class="welcome-section">
          <div class="welcome-content">
            <div class="welcome-avatar">
              <div class="avatar-circle">
                <span>ðŸ¤–</span>
              </div>
            </div>
            <h2>Welcome to {{ organizationName }}!</h2>
            <p>Our AI assistant is here to help you 24/7. Choose how you'd like to get started:</p>
            
            <!-- Department Selection -->
            <div class="department-options">
              <button 
                v-for="dept in departments" 
                :key="dept.id"
                @click="startChat(dept.id)"
                class="dept-button"
                :class="dept.id"
              >
                <span class="dept-icon">{{ dept.emoji }}</span>
                <div class="dept-info">
                  <h3>{{ dept.name }}</h3>
                  <p>{{ dept.description }}</p>
                </div>
              </button>
            </div>

            <!-- General Chat Option -->
            <div class="general-chat-option">
              <button @click="startChat('general')" class="general-chat-button">
                <span class="chat-icon">ðŸ’¬</span>
                Start General Chat
              </button>
              <p class="general-help-text">Not sure? Start here and we'll connect you with the right specialist.</p>
            </div>
          </div>
        </div>

        <!-- ChatKit Integration -->
        <div v-if="chatStarted" class="chat-widget-container">
          <ChatKitIntegration
            :customer-id="customerId"
            :customer-name="customerName"
            :department="selectedDepartment"
            :organization-id="organizationId"
            :class-name="'h-[500px] w-full max-w-4xl'"
            :debug="debugMode"
            @message="handleMessage"
            @session-update="handleSessionUpdate"
            @error="handleChatError"
          />
          
          <!-- Chat Controls -->
          <div class="chat-controls">
            <button @click="endChat" class="end-chat-button">
              End Chat
            </button>
            <button @click="switchDepartment" class="switch-dept-button">
              Switch Department
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar Info -->
      <aside class="chat-sidebar">
        <div class="sidebar-content">
          <!-- Current Session Info -->
          <div v-if="chatStarted && currentSession" class="session-info">
            <h3>Current Session</h3>
            <div class="session-details">
              <div class="detail-item">
                <label>Department:</label>
                <span class="department-badge" :class="currentSession.department">
                  {{ getDepartmentName(currentSession.department) }}
                </span>
              </div>
              <div class="detail-item" v-if="currentSession.botInfo">
                <label>Assistant:</label>
                <span>{{ currentSession.botInfo.botName }}</span>
              </div>
              <div class="detail-item">
                <label>Started:</label>
                <span>{{ formatTime(sessionStartTime) }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <h3>Quick Actions</h3>
            <div class="action-buttons">
              <button class="action-button" @click="openFeedback">
                <span>ðŸ“</span> Leave Feedback
              </button>
              <button class="action-button" @click="downloadTranscript">
                <span>ðŸ“„</span> Download Chat
              </button>
              <button class="action-button" @click="openHelp">
                <span>â“</span> Help Center
              </button>
            </div>
          </div>

          <!-- FAQ Links -->
          <div class="faq-links">
            <h3>Common Questions</h3>
            <ul>
              <li><a href="#" @click="askQuestion('How do I reset my password?')">Password Reset</a></li>
              <li><a href="#" @click="askQuestion('What are your business hours?')">Business Hours</a></li>
              <li><a href="#" @click="askQuestion('How can I contact billing?')">Billing Support</a></li>
              <li><a href="#" @click="askQuestion('Do you offer technical support?')">Technical Help</a></li>
            </ul>
          </div>
        </div>
      </aside>
    </main>

    <!-- Feedback Modal -->
    <div v-if="showFeedback" class="modal-overlay" @click="closeFeedback">
      <div class="modal-content" @click.stop>
        <h3>How was your experience?</h3>
        <div class="feedback-form">
          <div class="rating">
            <span v-for="star in 5" :key="star" 
                  class="star" 
                  :class="{ active: star <= feedbackRating }"
                  @click="feedbackRating = star">
              â­
            </span>
          </div>
          <textarea 
            v-model="feedbackText" 
            placeholder="Tell us about your experience..."
            class="feedback-textarea"
          ></textarea>
          <div class="modal-actions">
            <button @click="submitFeedback" class="submit-button">Submit</button>
            <button @click="closeFeedback" class="cancel-button">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ChatKitIntegration from '../components/ChatKitIntegration.vue';

export default {
  name: 'ChatKitCustomerChat',
  components: {
    ChatKitIntegration
  },
  props: {
    organizationId: {
      type: String,
      default: 'lightwave'
    }
  },
  data() {
    return {
      // UI State
      chatStarted: false,
      isOnline: false,
      debugMode: process.env.NODE_ENV === 'development',
      
      // Organization & User Info
      organizationName: 'Lightwave',
      customerId: this.generateCustomerId(),
      customerName: 'Customer',
      
      // Chat Session
      selectedDepartment: 'general',
      currentSession: null,
      sessionStartTime: null,
      
      // Departments
      departments: [
        {
          id: 'sales',
          name: 'Sales',
          description: 'Product info, pricing, and purchases',
          emoji: 'ðŸ’°'
        },
        {
          id: 'technical',
          name: 'Technical Support',
          description: 'Technical issues and troubleshooting',
          emoji: 'ðŸ”§'
        },
        {
          id: 'support',
          name: 'Customer Support',
          description: 'Account help and general support',
          emoji: 'ðŸŽ§'
        },
        {
          id: 'billing',
          name: 'Billing',
          description: 'Payment and subscription questions',
          emoji: 'ðŸ’³'
        }
      ],
      
      // Feedback
      showFeedback: false,
      feedbackRating: 0,
      feedbackText: ''
    };
  },
  async mounted() {
    await this.checkServiceStatus();
    await this.loadOrganizationInfo();
    this.setupCustomerInfo();
  },
  methods: {
    /**
     * Check if the chat service is online
     */
    async checkServiceStatus() {
      try {
        const response = await fetch('/api/chatkit/health');
        const status = await response.json();
        this.isOnline = status.success && status.status === 'ready';
      } catch (error) {
        console.error('âŒ Failed to check service status:', error);
        this.isOnline = false;
      }
    },

    /**
     * Load organization information
     */
    async loadOrganizationInfo() {
      try {
        // This could fetch from your organization API
        // For now, using default values
        this.organizationName = 'Lightwave';
      } catch (error) {
        console.warn('âš ï¸ Failed to load organization info:', error);
      }
    },

    /**
     * Setup customer information (could be from URL params, localStorage, etc.)
     */
    setupCustomerInfo() {
      // Get customer name from URL params or prompt
      const urlParams = new URLSearchParams(window.location.search);
      const nameParam = urlParams.get('name');
      
      if (nameParam) {
        this.customerName = nameParam;
      } else {
        // Could prompt for name or use guest mode
        this.customerName = 'Guest';
      }
    },

    /**
     * Start chat with selected department
     */
    startChat(department = 'general') {
      this.selectedDepartment = department;
      this.chatStarted = true;
      this.sessionStartTime = new Date();
      
      console.log(`ðŸš€ Starting chat with department: ${department}`);
    },

    /**
     * End current chat session
     */
    endChat() {
      if (confirm('Are you sure you want to end this chat session?')) {
        this.chatStarted = false;
        this.currentSession = null;
        this.sessionStartTime = null;
        console.log('ðŸ”š Chat session ended');
      }
    },

    /**
     * Switch to different department
     */
    switchDepartment() {
      // Show department selection again
      this.chatStarted = false;
      setTimeout(() => {
        // This allows the ChatKit component to cleanup first
      }, 100);
    },

    /**
     * Handle message from ChatKit
     */
    handleMessage(event) {
      console.log('ðŸ“¨ Message received:', event);
      // Could log messages, show notifications, etc.
    },

    /**
     * Handle session updates (department transfers, etc.)
     */
    handleSessionUpdate(event) {
      console.log('ðŸ”„ Session update:', event);
      
      if (event.metadata) {
        this.currentSession = {
          ...this.currentSession,
          ...event.metadata
        };
        
        // Update selected department if transferred
        if (event.metadata.department) {
          this.selectedDepartment = event.metadata.department;
        }
      }
    },

    /**
     * Handle chat errors
     */
    handleChatError(event) {
      console.error('âŒ Chat error:', event);
      
      // Show user-friendly error message
      alert('There was a problem with the chat. Please try refreshing the page.');
    },

    /**
     * Ask a pre-defined question
     */
    askQuestion(question) {
      if (!this.chatStarted) {
        this.startChat('general');
      }
      
      // Wait for chat to initialize, then send question
      setTimeout(() => {
        // This would need to be implemented in the ChatKit component
        this.$refs.chatkit?.sendMessage?.(question);
      }, 1000);
    },

    /**
     * Open feedback modal
     */
    openFeedback() {
      this.showFeedback = true;
    },

    /**
     * Close feedback modal
     */
    closeFeedback() {
      this.showFeedback = false;
      this.feedbackRating = 0;
      this.feedbackText = '';
    },

    /**
     * Submit feedback
     */
    async submitFeedback() {
      try {
        // Send feedback to backend
        await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: this.currentSession?.sessionId,
            rating: this.feedbackRating,
            comment: this.feedbackText,
            customerId: this.customerId
          })
        });

        alert('Thank you for your feedback!');
        this.closeFeedback();

      } catch (error) {
        console.error('âŒ Failed to submit feedback:', error);
        alert('Failed to submit feedback. Please try again.');
      }
    },

    /**
     * Download chat transcript
     */
    async downloadTranscript() {
      try {
        // This would fetch the chat history and create a downloadable file
        alert('Chat transcript download would be implemented here');
      } catch (error) {
        console.error('âŒ Failed to download transcript:', error);
      }
    },

    /**
     * Open help center
     */
    openHelp() {
      window.open('/help', '_blank');
    },

    /**
     * Generate unique customer ID
     */
    generateCustomerId() {
      return `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Get department display name
     */
    getDepartmentName(deptId) {
      const dept = this.departments.find(d => d.id === deptId);
      return dept ? dept.name : deptId.charAt(0).toUpperCase() + deptId.slice(1);
    },

    /**
     * Format time for display
     */
    formatTime(date) {
      if (!date) return '';
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }
  }
};
</script>

<style scoped>
.chatkit-customer-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.chat-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.company-info h1 {
  margin: 0;
  color: #333;
  font-size: 1.75rem;
  font-weight: 600;
}

.company-info p {
  margin: 0.25rem 0 0 0;
  color: #666;
  font-size: 0.9rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.status-indicator.online {
  color: #10b981;
}

.status-indicator.offline {
  color: #f59e0b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.chat-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 768px) {
  .chat-main {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

.chat-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.welcome-section {
  padding: 3rem;
  text-align: center;
}

.welcome-avatar {
  margin-bottom: 1.5rem;
}

.avatar-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  font-size: 2rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.welcome-content h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.8rem;
  font-weight: 600;
}

.welcome-content > p {
  margin: 0 0 2rem 0;
  color: #666;
  font-size: 1rem;
}

.department-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.dept-button {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.dept-button:hover {
  border-color: #1e88e5;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.dept-icon {
  font-size: 1.5rem;
}

.dept-info h3 {
  margin: 0 0 0.25rem 0;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
}

.dept-info p {
  margin: 0;
  color: #666;
  font-size: 0.875rem;
}

.general-chat-option {
  border-top: 1px solid #e5e7eb;
  padding-top: 2rem;
}

.general-chat-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  margin: 0 auto 1rem auto;
}

.general-chat-button:hover {
  transform: translateY(-1px);
}

.chat-icon {
  font-size: 1.25rem;
}

.general-help-text {
  color: #666;
  font-size: 0.875rem;
  margin: 0;
}

.chat-widget-container {
  padding: 1rem;
}

.chat-controls {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.end-chat-button,
.switch-dept-button {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.end-chat-button:hover {
  background: #fee;
  border-color: #fcc;
  color: #c33;
}

.switch-dept-button:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar-content > div {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.sidebar-content h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-item label {
  color: #666;
  font-size: 0.875rem;
  font-weight: 500;
}

.department-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.department-badge.sales {
  background: #fef3c7;
  color: #92400e;
}

.department-badge.technical {
  background: #e0f2fe;
  color: #0369a1;
}

.department-badge.support {
  background: #f0fdf4;
  color: #166534;
}

.department-badge.billing {
  background: #fdf4ff;
  color: #86198f;
}

.department-badge.general {
  background: #f3f4f6;
  color: #374151;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  text-align: left;
}

.action-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.faq-links ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.faq-links li {
  margin-bottom: 0.5rem;
}

.faq-links a {
  color: #1e88e5;
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.faq-links a:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
  text-align: center;
}

.rating {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.star {
  cursor: pointer;
  font-size: 1.5rem;
  opacity: 0.3;
  transition: opacity 0.2s;
}

.star.active {
  opacity: 1;
}

.feedback-textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.submit-button {
  padding: 0.5rem 1rem;
  background: #1e88e5;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.cancel-button {
  padding: 0.5rem 1rem;
  background: #f9fafb;
  color: #374151;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
}
</style>
