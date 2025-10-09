<template>
  <div class="agent-dashboard">
    <div class="dashboard-header">
      <h1>
        <i class="fas fa-headset"></i>
        Agent Dashboard
      </h1>
      <div class="agent-info" v-if="agent">
        <span class="agent-name">{{ agent.name }}</span>
        <span class="agent-status" :class="agent.status">{{ agent.status }}</span>
        <button @click="toggleStatus" class="btn btn-sm" :class="agent.status === 'online' ? 'btn-warning' : 'btn-success'">
          {{ agent.status === 'online' ? 'Go Offline' : 'Go Online' }}
        </button>
        <button @click="logout" class="btn btn-sm btn-danger">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>

    <!-- Chat Queue -->
    <div class="chat-queue">
      <h3>
        <i class="fas fa-users"></i>
        Waiting Customers ({{ waitingCustomers.length }})
      </h3>
      <div v-if="waitingCustomers.length === 0" class="no-customers">
        <i class="fas fa-clock"></i>
        No customers waiting
      </div>
      <div v-else class="customer-list">
        <div 
          v-for="customer in waitingCustomers" 
          :key="customer.id"
          class="customer-item"
          @click="acceptChat(customer)"
        >
          <div class="customer-info">
            <strong>{{ customer.name }}</strong>
            <span class="wait-time">Waiting: {{ formatWaitTime(customer.waitingSince) }}</span>
          </div>
          <button class="btn btn-primary btn-sm">
            <i class="fas fa-comments"></i>
            Accept Chat
          </button>
        </div>
      </div>
    </div>

    <!-- Active Chats -->
    <div class="active-chats" v-if="activeChats.length > 0">
      <h3>
        <i class="fas fa-comment-dots"></i>
        Active Chats ({{ activeChats.length }})
      </h3>
      <div class="chat-tabs">
        <div 
          v-for="chat in activeChats"
          :key="chat.id"
          class="chat-tab"
          :class="{ active: selectedChat?.id === chat.id }"
          @click="selectChat(chat)"
        >
          <span>{{ chat.customerName }}</span>
          <button @click.stop="endChat(chat)" class="close-btn">Ã—</button>
        </div>
      </div>
    </div>

    <!-- Chat Interface -->
    <div v-if="selectedChat" class="chat-interface">
      <div class="chat-header">
        <h4>{{ selectedChat.customerName }}</h4>
        <div class="chat-actions">
          <button @click="transferChat" class="btn btn-sm btn-secondary">
            <i class="fas fa-exchange-alt"></i>
            Transfer
          </button>
          <button @click="endChat(selectedChat)" class="btn btn-sm btn-danger">
            <i class="fas fa-phone-slash"></i>
            End Chat
          </button>
        </div>
      </div>

      <div class="chat-messages" ref="messagesContainer">
        <div 
          v-for="message in selectedChat.messages"
          :key="message.id"
          class="message"
          :class="message.sender"
        >
          <div class="message-content">
            <p>{{ message.text }}</p>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>
        </div>
        <div v-if="selectedChat.typing" class="typing-indicator">
          {{ selectedChat.customerName }} is typing...
        </div>
      </div>

      <div class="chat-input">
        <div class="input-group">
          <input 
            v-model="messageText"
            @keyup.enter="sendMessage"
            placeholder="Type your message..."
            class="form-control"
            :disabled="!selectedChat"
          />
          <button @click="sendMessage" class="btn btn-primary" :disabled="!messageText.trim()">
            <i class="fas fa-paper-plane"></i>
            Send
          </button>
        </div>
      </div>
    </div>

    <!-- No Chat Selected -->
    <div v-else class="no-chat-selected">
      <i class="fas fa-comments"></i>
      <p>Select a chat to start messaging</p>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useSocket } from '../composables/useSocket'
import { useAuth } from '../composables/useAuth'

export default {
  name: 'AgentDashboard',
  setup() {
    const { socket, connect, disconnect } = useSocket()
    const { user, logout: authLogout } = useAuth()
    
    const agent = ref(null)
    const waitingCustomers = ref([])
    const activeChats = ref([])
    const selectedChat = ref(null)
    const messageText = ref('')
    const messagesContainer = ref(null)

    onMounted(async () => {
      await connect()
      
      // Set agent from authenticated user
      agent.value = {
        id: user.value?.id,
        name: user.value?.username || 'Agent',
        status: 'online'
      }

      // Join agent room
      socket.emit('agent-join', agent.value)

      // Socket event listeners
      socket.on('waiting-customers', (customers) => {
        waitingCustomers.value = customers
      })

      socket.on('chat-assigned', (chatData) => {
        activeChats.value.push(chatData)
        selectChat(chatData)
      })

      socket.on('message-received', (messageData) => {
        const chat = activeChats.value.find(c => c.id === messageData.chatId)
        if (chat) {
          chat.messages.push(messageData)
          scrollToBottom()
        }
      })

      socket.on('customer-typing', (data) => {
        const chat = activeChats.value.find(c => c.id === data.chatId)
        if (chat) {
          chat.typing = data.isTyping
        }
      })

      socket.on('chat-ended', (chatId) => {
        activeChats.value = activeChats.value.filter(c => c.id !== chatId)
        if (selectedChat.value?.id === chatId) {
          selectedChat.value = activeChats.value[0] || null
        }
      })
    })

    onUnmounted(() => {
      disconnect()
    })

    const toggleStatus = () => {
      agent.value.status = agent.value.status === 'online' ? 'offline' : 'online'
      socket.emit('agent-status-change', {
        agentId: agent.value.id,
        status: agent.value.status
      })
    }

    const acceptChat = (customer) => {
      socket.emit('accept-chat', {
        customerId: customer.id,
        agentId: agent.value.id
      })
    }

    const selectChat = (chat) => {
      selectedChat.value = chat
      nextTick(() => {
        scrollToBottom()
      })
    }

    const sendMessage = () => {
      if (!messageText.value.trim() || !selectedChat.value) return

      const message = {
        id: Date.now(),
        chatId: selectedChat.value.id,
        text: messageText.value,
        sender: 'agent',
        timestamp: new Date()
      }

      selectedChat.value.messages.push(message)
      socket.emit('send-message', message)
      messageText.value = ''
      scrollToBottom()
    }

    const endChat = (chat) => {
      if (confirm(`End chat with ${chat.customerName}?`)) {
        socket.emit('end-chat', chat.id)
      }
    }

    const transferChat = () => {
      if (confirm('Transfer this chat to another agent?')) {
        socket.emit('transfer-chat', {
          chatId: selectedChat.value.id,
          fromAgent: agent.value.id
        })
      }
    }

    const logout = async () => {
      if (confirm('Are you sure you want to logout?')) {
        socket.emit('agent-disconnect', agent.value.id)
        await authLogout()
        window.location.href = '/login'
      }
    }

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
      })
    }

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    const formatWaitTime = (waitingSince) => {
      const minutes = Math.floor((Date.now() - new Date(waitingSince)) / 60000)
      return `${minutes}m`
    }

    return {
      agent,
      waitingCustomers,
      activeChats,
      selectedChat,
      messageText,
      messagesContainer,
      toggleStatus,
      acceptChat,
      selectChat,
      sendMessage,
      endChat,
      transferChat,
      logout,
      formatTime,
      formatWaitTime
    }
  }
}
</script>

<style scoped>
/* Fallback for Font Awesome icons */
.fas, .far, .fab, .fal, .fad, .fa {
  font-family: "Font Awesome 6 Free", "Font Awesome 6 Pro", "FontAwesome", sans-serif;
  font-weight: 900;
  display: inline-block;
  font-style: normal;
  font-variant: normal;
  text-rendering: auto;
  line-height: 1;
}

/* Basic icon fallbacks */
.fa-headset:before { content: "ðŸŽ§"; }
.fa-users:before { content: "ðŸ‘¥"; }
.fa-comments:before { content: "ðŸ’¬"; }
.fa-comment-dots:before { content: "ðŸ’­"; }
.fa-exchange-alt:before { content: "ðŸ”„"; }
.fa-phone-slash:before { content: "ðŸ“µ"; }
.fa-paper-plane:before { content: "âœˆï¸"; }
.fa-sign-out-alt:before { content: "ðŸšª"; }
.fa-clock:before { content: "ðŸ•"; }

.agent-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: #f8f9fa;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.dashboard-header h1 {
  margin: 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.agent-name {
  font-weight: bold;
  color: #333;
}

.agent-status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  text-transform: uppercase;
}

.agent-status.online {
  background: #d4edda;
  color: #155724;
}

.agent-status.offline {
  background: #f8d7da;
  color: #721c24;
}

.chat-queue, .active-chats {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.chat-queue h3, .active-chats h3 {
  margin: 0 0 15px 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.no-customers {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.customer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.customer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.customer-item:hover {
  background: #f8f9fa;
}

.customer-info {
  display: flex;
  flex-direction: column;
}

.wait-time {
  font-size: 12px;
  color: #666;
}

.chat-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.chat-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background: #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-tab.active {
  background: #007bff;
  color: white;
}

.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #666;
}

.chat-tab.active .close-btn {
  color: white;
}

.chat-interface {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  height: 500px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #dee2e6;
}

.chat-header h4 {
  margin: 0;
  color: #333;
}

.chat-actions {
  display: flex;
  gap: 10px;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  display: flex;
}

.message.agent {
  justify-content: flex-end;
}

.message.customer {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 12px;
}

.message.agent .message-content {
  background: #007bff;
  color: white;
}

.message.customer .message-content {
  background: #e9ecef;
  color: #333;
}

.message-content p {
  margin: 0 0 5px 0;
}

.timestamp {
  font-size: 11px;
  opacity: 0.7;
}

.typing-indicator {
  font-style: italic;
  color: #666;
  padding: 10px;
}

.chat-input {
  padding: 15px 20px;
  border-top: 1px solid #dee2e6;
}

.input-group {
  display: flex;
  gap: 10px;
}

.form-control {
  flex: 1;
  padding: 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  outline: none;
}

.form-control:focus {
  border-color: #007bff;
}

.no-chat-selected {
  background: white;
  border-radius: 8px;
  padding: 60px 20px;
  text-align: center;
  color: #666;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.no-chat-selected i {
  font-size: 48px;
  margin-bottom: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #1e7e34;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

