<template>
  <div class="public-chat">
    <div class="chat-header">
      <h2>
        <i class="fas fa-comments"></i>
        Customer Support Chat
      </h2>
      <div v-if="!chatStarted" class="chat-status">
        Click "Start Chat" to connect with an agent
      </div>
      <div v-else-if="connected" class="chat-status connected">
        <i class="fas fa-circle"></i>
        Connected to agent: {{ agentName }}
      </div>
      <div v-else class="chat-status waiting">
        <i class="fas fa-clock"></i>
        Waiting for an agent...
      </div>
    </div>

    <div v-if="!chatStarted" class="chat-welcome">
      <div class="welcome-content">
        <i class="fas fa-headset"></i>
        <h3>Welcome to Customer Support</h3>
        <p>Our agents are ready to help you with any questions or issues.</p>
        
        <form @submit.prevent="startChat" class="customer-form">
          <div class="form-group">
            <label for="name">Your Name</label>
            <input
              id="name"
              v-model="customerInfo.name"
              type="text"
              class="form-control"
              placeholder="Enter your name"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="email">Email (Optional)</label>
            <input
              id="email"
              v-model="customerInfo.email"
              type="email"
              class="form-control"
              placeholder="Enter your email"
            />
          </div>
          
          <div class="form-group">
            <label for="message">How can we help you?</label>
            <textarea
              id="message"
              v-model="customerInfo.initialMessage"
              class="form-control"
              rows="3"
              placeholder="Describe your question or issue..."
              required
            ></textarea>
          </div>
          
          <button type="submit" class="btn btn-primary btn-large">
            <i class="fas fa-comments"></i>
            Start Chat
          </button>
        </form>
      </div>
    </div>

    <div v-else class="chat-interface">
      <div class="chat-messages" ref="messagesContainer">
        <div 
          v-for="message in messages"
          :key="message.id"
          class="message"
          :class="message.sender"
        >
          <div class="message-content">
            <div class="message-header" v-if="message.sender === 'agent'">
              <strong>{{ agentName || 'Agent' }}</strong>
            </div>
            <p>{{ message.text }}</p>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>
        </div>
        
        <div v-if="agentTyping" class="typing-indicator">
          {{ agentName || 'Agent' }} is typing...
        </div>
      </div>

      <div class="chat-input">
        <div class="input-group">
          <input 
            v-model="messageText"
            @keyup.enter="sendMessage"
            @input="handleTyping"
            placeholder="Type your message..."
            class="form-control"
            :disabled="!connected"
          />
          <button @click="sendMessage" class="btn btn-primary" :disabled="!messageText.trim() || !connected">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useSocket } from '../composables/useSocket'

export default {
  name: 'PublicChat',
  setup() {
    const { socket, connect, disconnect } = useSocket()
    
    const chatStarted = ref(false)
    const connected = ref(false)
    const agentName = ref('')
    const agentTyping = ref(false)
    const messages = ref([])
    const messageText = ref('')
    const messagesContainer = ref(null)
    const chatId = ref(null)
    
    const customerInfo = reactive({
      name: '',
      email: '',
      initialMessage: ''
    })

    let typingTimer = null

    onMounted(async () => {
      await connect()
      
      // Socket event listeners
      socket.on('agent-assigned', (data) => {
        connected.value = true
        agentName.value = data.agentName
        chatId.value = data.chatId
        
        // Add welcome message
        messages.value.push({
          id: Date.now(),
          text: `Hi ${customerInfo.name}! I'm ${data.agentName} and I'll be helping you today.`,
          sender: 'agent',
          timestamp: new Date()
        })
        
        scrollToBottom()
      })

      socket.on('message-received', (messageData) => {
        messages.value.push(messageData)
        scrollToBottom()
      })

      socket.on('agent-typing', (data) => {
        agentTyping.value = data.isTyping
      })

      socket.on('chat-ended', () => {
        messages.value.push({
          id: Date.now(),
          text: 'The agent has ended this chat session. Thank you for contacting us!',
          sender: 'system',
          timestamp: new Date()
        })
        connected.value = false
        scrollToBottom()
      })

      socket.on('no-agents-available', () => {
        messages.value.push({
          id: Date.now(),
          text: 'Sorry, no agents are currently available. Please try again later.',
          sender: 'system',
          timestamp: new Date()
        })
      })
    })

    onUnmounted(() => {
      if (chatId.value) {
        socket.emit('customer-disconnect', chatId.value)
      }
      disconnect()
    })

    const startChat = () => {
      if (!customerInfo.name || !customerInfo.initialMessage) return

      chatStarted.value = true
      
      // Add initial message from customer
      messages.value.push({
        id: Date.now(),
        text: customerInfo.initialMessage,
        sender: 'customer',
        timestamp: new Date()
      })

      // Request chat with agent
      socket.emit('request-chat', {
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        initialMessage: customerInfo.initialMessage,
        timestamp: new Date()
      })

      scrollToBottom()
    }

    const sendMessage = () => {
      if (!messageText.value.trim() || !connected.value) return

      const message = {
        id: Date.now(),
        chatId: chatId.value,
        text: messageText.value,
        sender: 'customer',
        timestamp: new Date()
      }

      messages.value.push(message)
      socket.emit('send-message', message)
      messageText.value = ''
      scrollToBottom()
    }

    const handleTyping = () => {
      if (connected.value) {
        socket.emit('customer-typing', {
          chatId: chatId.value,
          isTyping: true
        })

        clearTimeout(typingTimer)
        typingTimer = setTimeout(() => {
          socket.emit('customer-typing', {
            chatId: chatId.value,
            isTyping: false
          })
        }, 1000)
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
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    return {
      chatStarted,
      connected,
      agentName,
      agentTyping,
      messages,
      messageText,
      messagesContainer,
      customerInfo,
      startChat,
      sendMessage,
      handleTyping,
      formatTime
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

.fa-comments:before { content: "ðŸ’¬"; }
.fa-circle:before { content: "ðŸ”´"; }
.fa-clock:before { content: "ðŸ•"; }
.fa-headset:before { content: "ðŸŽ§"; }
.fa-paper-plane:before { content: "âœˆï¸"; }

.public-chat {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  height: 100vh;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.chat-header {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  color: white;
  padding: 20px;
  text-align: center;
}

.chat-header h2 {
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.chat-status {
  font-size: 14px;
  opacity: 0.9;
}

.chat-status.connected {
  color: #d4edda;
}

.chat-status.waiting {
  color: #fff3cd;
}

.chat-welcome {
  flex: 1;
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-content {
  text-align: center;
  max-width: 400px;
}

.welcome-content i {
  font-size: 48px;
  color: #1e88e5;
  margin-bottom: 20px;
}

.welcome-content h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.welcome-content p {
  color: #666;
  margin-bottom: 30px;
}

.customer-form {
  text-align: left;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #1e88e5;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.chat-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
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

.message.customer {
  justify-content: flex-end;
}

.message.agent {
  justify-content: flex-start;
}

.message.system {
  justify-content: center;
}

.message-content {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 12px;
}

.message.customer .message-content {
  background: #1e88e5;
  color: white;
}

.message.agent .message-content {
  background: #f1f3f4;
  color: #333;
}

.message.system .message-content {
  background: #fff3cd;
  color: #856404;
  text-align: center;
  font-style: italic;
}

.message-header {
  margin-bottom: 5px;
  font-size: 12px;
  opacity: 0.8;
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
  padding: 10px 15px;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e1e5e9;
}

.input-group {
  display: flex;
  gap: 10px;
}

.input-group .form-control {
  flex: 1;
  margin: 0;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary {
  background: #1e88e5;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5a6fd8;
}

.btn-large {
  padding: 12px 24px;
  font-size: 16px;
  width: 100%;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .public-chat {
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }
  
  .chat-welcome {
    padding: 20px;
  }
  
  .welcome-content {
    max-width: none;
  }
  
  .message-content {
    max-width: 85%;
  }
}
</style>

