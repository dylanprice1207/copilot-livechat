<template>
  <div class="chatkit-container">
    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Initializing chat...</p>
    </div>

    <!-- Error state -->
    <div v-if="error" class="error-state">
      <div class="error-message">
        <h3>Chat Unavailable</h3>
        <p>{{ error }}</p>
        <button @click="initializeChat" class="retry-button">
          Try Again
        </button>
      </div>
    </div>

    <!-- ChatKit integration container -->
    <div 
      v-show="!loading && !error"
      ref="chatkitContainer" 
      :id="chatkitId"
      class="chatkit-widget"
    ></div>

    <!-- Debug info (only in development) -->
    <div v-if="showDebug && debugInfo" class="debug-info">
      <h4>Debug Info</h4>
      <pre>{{ JSON.stringify(debugInfo, null, 2) }}</pre>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatKitIntegration',
  props: {
    // Customer information
    customerId: {
      type: String,
      default: () => `customer_${Date.now()}`
    },
    customerName: {
      type: String,
      default: 'Customer'
    },
    // Initial department (sales, technical, support, billing, general)
    department: {
      type: String,
      default: 'general'
    },
    // Organization ID for multi-tenant support
    organizationId: {
      type: String,
      default: null
    },
    // Custom styling
    className: {
      type: String,
      default: 'h-[600px] w-[400px]'
    },
    // Debug mode
    debug: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      loading: true,
      error: null,
      sessionId: null,
      chatkitInstance: null,
      chatkitId: `chatkit-${Math.random().toString(36).substr(2, 9)}`,
      debugInfo: null,
      showDebug: this.debug || process.env.NODE_ENV === 'development'
    };
  },
  async mounted() {
    await this.loadChatKitScript();
    await this.initializeChat();
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    /**
     * Load ChatKit script dynamically
     */
    async loadChatKitScript() {
      return new Promise((resolve, reject) => {
        // Check if ChatKit is already loaded
        if (window.ChatKit) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.platform.openai.com/deployments/chatkit/chatkit.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load ChatKit script'));
        
        document.head.appendChild(script);
      });
    },

    /**
     * Initialize ChatKit with custom backend
     */
    async initializeChat() {
      try {
        this.loading = true;
        this.error = null;

        // Create a new chat session with our backend
        const sessionResponse = await fetch('/api/chatkit/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: this.customerId,
            customerName: this.customerName,
            department: this.department,
            organizationId: this.organizationId
          })
        });

        if (!sessionResponse.ok) {
          throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
        }

        const sessionData = await sessionResponse.json();
        this.sessionId = sessionData.session.sessionId;

        this.debugInfo = {
          sessionId: this.sessionId,
          botInfo: sessionData.session.botInfo,
          config: sessionData.session.config
        };

        // Initialize ChatKit with custom backend
        if (window.ChatKit) {
          this.chatkitInstance = window.ChatKit.create({
            container: `#${this.chatkitId}`,
            api: {
              url: `/api/chatkit`,
              fetch: this.customFetch.bind(this),
              // Custom backend configuration
              sessionId: this.sessionId
            },
            ui: {
              className: this.className,
              theme: 'light', // or 'dark'
              showHeader: true,
              headerTitle: sessionData.session.botInfo?.greeting ? 
                `Chat with ${sessionData.session.botInfo.botName}` : 
                'Live Support Chat'
            },
            onMessage: this.handleMessage.bind(this),
            onError: this.handleError.bind(this),
            onSessionUpdate: this.handleSessionUpdate.bind(this)
          });

          console.log('âœ… ChatKit initialized successfully');
          
          // Send initial greeting if available
          if (sessionData.session.botInfo?.greeting) {
            setTimeout(() => {
              this.addBotMessage(sessionData.session.botInfo.greeting);
            }, 500);
          }
        } else {
          throw new Error('ChatKit not loaded');
        }

        this.loading = false;

      } catch (error) {
        console.error('âŒ Failed to initialize ChatKit:', error);
        this.error = error.message;
        this.loading = false;
      }
    },

    /**
     * Custom fetch function for ChatKit API calls
     */
    async customFetch(url, options = {}) {
      // Add session ID to requests
      const sessionUrl = url.includes('?') 
        ? `${url}&sessionId=${this.sessionId}`
        : `${url}?sessionId=${this.sessionId}`;

      // Add custom headers
      const customOptions = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      return fetch(sessionUrl, customOptions);
    },

    /**
     * Handle messages from ChatKit
     */
    handleMessage(message) {
      console.log('ðŸ“¨ Message from ChatKit:', message);
      
      // Emit message event to parent component
      this.$emit('message', {
        sessionId: this.sessionId,
        message: message,
        timestamp: new Date()
      });

      // Send message to our backend
      this.sendMessageToBackend(message.content);
    },

    /**
     * Send message to our custom backend
     */
    async sendMessageToBackend(content) {
      try {
        const response = await fetch(`/api/chatkit/sessions/${this.sessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            type: 'user'
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Update debug info
        if (this.showDebug) {
          this.debugInfo = {
            ...this.debugInfo,
            lastResponse: result,
            messageCount: result.messages?.length || 0
          };
        }

        // Handle bot response
        const botMessage = result.messages?.find(msg => msg.role === 'assistant');
        if (botMessage) {
          // Add some delay for natural feel
          setTimeout(() => {
            this.addBotMessage(botMessage.content);
          }, 1000);
        }

        // Handle session updates (department transfers, etc.)
        if (result.metadata?.transferred || result.metadata?.departmentOptions) {
          this.handleSessionUpdate(result.metadata);
        }

      } catch (error) {
        console.error('âŒ Failed to send message to backend:', error);
        this.handleError(error);
      }
    },

    /**
     * Add bot message to ChatKit
     */
    addBotMessage(content) {
      if (this.chatkitInstance) {
        this.chatkitInstance.addMessage({
          role: 'assistant',
          content: content,
          timestamp: new Date().toISOString()
        });
      }
    },

    /**
     * Handle session updates (department changes, etc.)
     */
    handleSessionUpdate(metadata) {
      console.log('ðŸ”„ Session update:', metadata);
      
      this.$emit('sessionUpdate', {
        sessionId: this.sessionId,
        metadata: metadata,
        timestamp: new Date()
      });

      // Update debug info
      if (this.showDebug) {
        this.debugInfo = {
          ...this.debugInfo,
          lastUpdate: metadata
        };
      }
    },

    /**
     * Handle errors
     */
    handleError(error) {
      console.error('âŒ ChatKit error:', error);
      
      this.$emit('error', {
        sessionId: this.sessionId,
        error: error,
        timestamp: new Date()
      });

      // Show user-friendly error
      this.error = 'Something went wrong with the chat. Please try refreshing the page.';
    },

    /**
     * Cleanup ChatKit instance
     */
    cleanup() {
      if (this.chatkitInstance) {
        try {
          this.chatkitInstance.destroy();
        } catch (error) {
          console.warn('âš ï¸ Error destroying ChatKit instance:', error);
        }
      }

      // Close session on backend
      if (this.sessionId) {
        fetch(`/api/chatkit/sessions/${this.sessionId}`, {
          method: 'DELETE'
        }).catch(error => {
          console.warn('âš ï¸ Error closing session:', error);
        });
      }
    },

    /**
     * Retry initialization
     */
    async retryInit() {
      this.error = null;
      await this.initializeChat();
    }
  }
};
</script>

<style scoped>
.chatkit-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 400px;
  padding: 2rem;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 300px;
}

.error-message h3 {
  color: #c33;
  margin: 0 0 0.5rem 0;
}

.error-message p {
  color: #666;
  margin: 0 0 1rem 0;
}

.retry-button {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: #2980b9;
}

.chatkit-widget {
  width: 100%;
  height: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.debug-info {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  max-width: 300px;
  max-height: 200px;
  overflow: auto;
  z-index: 1000;
}

.debug-info h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
}

.debug-info pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
