<template>
  <div>
    <!-- Chats Header -->
    <div class="header">
      <div class="header-content">
        <h1><i class="fas fa-comments"></i> Chat Management</h1>
        <p>Monitor and manage all chat conversations</p>
      </div>
    </div>

    <!-- Chat Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>Status:</label>
        <select v-model="filters.status" @change="loadChats">
          <option value="active,waiting">Active & Waiting</option>
          <option value="active">Active Only</option>
          <option value="waiting">Waiting Only</option>
          <option value="closed">Closed Only</option>
          <option value="">All Chats</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Department:</label>
        <select v-model="filters.department" @change="loadChats">
          <option value="">All Departments</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
          <option value="technical">Technical</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Search:</label>
        <input 
          type="text" 
          v-model="filters.search" 
          placeholder="Search by customer or agent..."
          @input="debounceSearch"
        />
      </div>
    </div>

    <!-- Chat Statistics -->
    <div class="stats-row">
      <div class="stat-item clickable" :class="{ 'active': filters.status === '' }" @click="filterByStatus('')">
        <i class="fas fa-comments text-blue"></i>
        <span class="stat-number">{{ chatStats.total || 0 }}</span>
        <span class="stat-label">All Chats</span>
      </div>
      <div class="stat-item clickable" :class="{ 'active': filters.status === 'active' }" @click="filterByStatus('active')">
        <i class="fas fa-play-circle text-green"></i>
        <span class="stat-number">{{ chatStats.active || 0 }}</span>
        <span class="stat-label">Active</span>
      </div>
      <div class="stat-item clickable" :class="{ 'active': filters.status === 'waiting' }" @click="filterByStatus('waiting')">
        <i class="fas fa-clock text-orange"></i>
        <span class="stat-number">{{ chatStats.waiting || 0 }}</span>
        <span class="stat-label">Waiting</span>
      </div>
      <div class="stat-item clickable" :class="{ 'active': filters.status === 'closed' }" @click="filterByStatus('closed')">
        <i class="fas fa-check-circle text-gray"></i>
        <span class="stat-number">{{ chatStats.closed || 0 }}</span>
        <span class="stat-label">Closed</span>
      </div>
    </div>

    <!-- Chat List -->
    <div class="chat-list">
      <div v-if="loading" class="loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading chats...</p>
      </div>

      <div v-else-if="chats.length === 0" class="no-chats">
        <i class="fas fa-comments"></i>
        <p>No chats found</p>
      </div>

      <div v-else>
        <div 
          v-for="chat in chats" 
          :key="chat._id"
          class="chat-card"
          :class="{ 'active': chat.status === 'active' }"
        >
          <div class="chat-header">
            <div class="chat-info">
              <h3>{{ chat.customerName || 'Anonymous Customer' }}</h3>
              <span class="chat-id">#{{ chat._id.slice(-6) }}</span>
              <span :class="`status ${chat.status}`">{{ chat.status }}</span>
            </div>
            <div class="chat-time">
              <span>{{ formatTime(chat.createdAt) }}</span>
              <span class="duration">{{ calculateDuration(chat.createdAt, chat.updatedAt) }}</span>
            </div>
          </div>

          <div class="chat-details">
            <div class="participants">
              <div class="customer">
                <i class="fas fa-user"></i>
                <span>{{ chat.customerEmail || 'No email' }}</span>
              </div>
              <div class="agent" v-if="chat.agent">
                <i class="fas fa-headset"></i>
                <span>{{ chat.agent.name || 'Unassigned' }}</span>
              </div>
              <div class="department">
                <i class="fas fa-building"></i>
                <span>{{ chat.department || 'General' }}</span>
              </div>
            </div>

            <div class="last-message" v-if="chat.lastMessage">
              <p>"{{ chat.lastMessage.content }}"</p>
              <small>{{ formatTime(chat.lastMessage.timestamp) }}</small>
            </div>

            <div class="message-count">
              <i class="fas fa-comment-dots"></i>
              <span>{{ chat.messageCount || 0 }} messages</span>
            </div>
          </div>

          <div class="chat-actions">
            <button 
              class="btn btn-view" 
              @click="viewChat(chat)"
              title="View Chat"
            >
              <i class="fas fa-eye"></i>
            </button>
            <button 
              v-if="chat.status === 'waiting' && !chat.agent"
              class="btn btn-assign" 
              @click="assignToSelf(chat)"
              title="Take Chat"
            >
              <i class="fas fa-user-plus"></i>
            </button>
            <button 
              v-if="chat.status === 'active'"
              class="btn btn-close" 
              @click="closeChat(chat)"
              title="Close Chat"
            >
              <i class="fas fa-times"></i>
            </button>
            <button 
              class="btn btn-download" 
              @click="exportChat(chat)"
              title="Export Chat"
            >
              <i class="fas fa-download"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1">
      <button 
        @click="currentPage--" 
        :disabled="currentPage === 1"
        class="page-btn"
      >
        <i class="fas fa-chevron-left"></i>
      </button>
      
      <span class="page-info">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      
      <button 
        @click="currentPage++" 
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>

    <!-- Chat Modal for Real-time Viewing -->
    <div v-if="selectedChat" class="chat-modal-overlay" @click="closeChatModal">
      <div class="chat-modal" @click.stop>
        <div class="modal-header">
          <h3>
            <i class="fas fa-comments"></i>
            Chat with {{ selectedChat.customerName || 'Anonymous' }}
          </h3>
          <button class="btn btn-close-modal" @click="closeChatModal">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="chat-info-bar">
            <div class="info-item">
              <strong>Status:</strong> 
              <span :class="`status ${selectedChat.status}`">{{ selectedChat.status }}</span>
            </div>
            <div class="info-item">
              <strong>Department:</strong> {{ selectedChat.department || 'General' }}
            </div>
            <div class="info-item" v-if="selectedChat.agent">
              <strong>Agent:</strong> {{ selectedChat.agent.name }}
            </div>
          </div>

          <div class="messages-container">
            <div 
              v-for="message in messages" 
              :key="message._id || message.timestamp"
              :class="getMessageWrapperClass(message)"
            >
              <div :class="getMessageBubbleClass(message)">
                <div class="message-content">{{ message.content }}</div>
                <div class="message-meta">
                  <span class="sender-name">{{ message.senderName || (isCustomerMessage(message) ? 'Customer' : 'Agent') }}</span>
                  <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="messages.length === 0" class="no-messages">
              <i class="fas fa-comment-dots"></i>
              <p>Start the conversation...</p>
            </div>
          </div>

          <div class="message-input" v-if="selectedChat.status === 'active' || selectedChat.status === 'waiting'">
            <input 
              type="text" 
              v-model="newMessage" 
              placeholder="Type your response..."
              @keyup.enter="sendMessage"
            />
            <button class="btn btn-send" @click="sendMessage">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
          <div v-else-if="selectedChat.status === 'closed'" class="message-input-disabled">
            <p><i class="fas fa-info-circle"></i> This chat has been closed</p>
          </div>
          <div v-else class="message-input-disabled">
            <p><i class="fas fa-exclamation-triangle"></i> Chat status: {{ selectedChat.status }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSocket } from '../composables/useSocket'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { socket, connect, disconnect } = useSocket()
const { user } = useAuth()

// Reactive data
const loading = ref(false)
const chats = ref([])
const chatStats = ref({})
const currentPage = ref(1)
const totalPages = ref(1)
const searchTimeout = ref(null)
const selectedChat = ref(null)
const messages = ref([])
const newMessage = ref('')

const filters = ref({
  status: '',
  department: '',
  search: ''
})

// Methods
const loadChats = async () => {
  try {
    loading.value = true
    console.log('Loading chats with filters:', filters.value)
    
    // Use filters as specified by user (show all chats by default)
    const filterParams = { ...filters.value }
    
    const queryParams = new URLSearchParams({
      page: currentPage.value,
      limit: 20,
      ...filterParams
    })

    const response = await fetch(`/api/admin/chats?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      chats.value = data.chats || []
      chatStats.value = data.stats || {}
      totalPages.value = data.totalPages || 1
      console.log('Chats loaded:', data)
    } else {
      console.error('Failed to load chats')
      // Provide mock data for development
      chats.value = generateMockChats().filter(chat => 
        !filterParams.status || filterParams.status.includes(chat.status)
      )
      chatStats.value = {
        total: 15,
        active: 3,
        waiting: 2,
        closed: 10
      }
    }
  } catch (error) {
    console.error('Error loading chats:', error)
    // Provide mock data on error
    chats.value = generateMockChats().filter(chat => 
      !filters.value.status || filters.value.status.includes(chat.status)
    )
    chatStats.value = {
      total: 15,
      active: 3,
      waiting: 2,
      closed: 10
    }
  } finally {
    loading.value = false
  }
}

const generateMockChats = () => [
  {
    _id: '66f1a2b3c4d5e6f7890abcde',
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    status: 'active',
    department: 'support',
    agent: { name: 'Sarah Wilson' },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessage: {
      content: 'I need help with my account settings',
      timestamp: new Date().toISOString()
    },
    messageCount: 12
  },
  {
    _id: '66f1a2b3c4d5e6f7890abcdf',
    customerName: 'Alice Johnson',
    customerEmail: 'alice@example.com',
    status: 'waiting',
    department: 'sales',
    agent: null,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    lastMessage: {
      content: 'Can you tell me about your pricing plans?',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    messageCount: 3
  },
  {
    _id: '66f1a2b3c4d5e6f7890abce0',
    customerName: 'Bob Davis',
    customerEmail: 'bob@example.com',
    status: 'closed',
    department: 'technical',
    agent: { name: 'Mike Chen' },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    lastMessage: {
      content: 'Thanks for the help!',
      timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()
    },
    messageCount: 28
  }
]

const debounceSearch = () => {
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    currentPage.value = 1
    loadChats()
  }, 500)
}

const filterByStatus = (status) => {
  console.log('ðŸ“Š Filtering by status:', status)
  filters.value.status = status
  currentPage.value = 1
  loadChats()
}

const viewChat = async (chat) => {
  console.log('ðŸ” ViewChat called with chat:', chat)
  selectedChat.value = chat
  
  // Load messages for this chat
  await loadChatMessages(chat.roomId || chat._id)
  
  // Join the specific chat room for real-time updates
  if (socket.value && socket.value.connected) {
    const joinData = {
      roomId: chat.roomId || chat._id,
      userId: user.value.id,
      role: user.value.role
    }
    console.log('ðŸšª Joining room with data:', joinData)
    
    socket.value.emit('join_room', joinData)
    
    // Set up room-specific listener for this chat
    const roomId = chat.roomId || chat._id
    
    // Remove any existing listener for this room to avoid duplicates
    socket.value.off(`receive_message_${roomId}`)
    
    // Add room-specific listener
    socket.value.on(`receive_message_${roomId}`, (messageData) => {
      console.log('ðŸ”” Room-specific message received for', roomId, ':', messageData)
      
      const newMessageObj = {
        _id: messageData._id || Date.now(),
        content: messageData.content || messageData.message,
        sender: messageData.sender || messageData.senderRole,
        senderRole: messageData.senderRole || messageData.sender,
        senderName: messageData.senderName,
        timestamp: messageData.timestamp
      }
      
      messages.value.push(newMessageObj)
      console.log('âœ… Message added to modal. Total messages:', messages.value.length)
      
      // Force Vue reactivity update
      messages.value = [...messages.value]
      
      // Auto-scroll to bottom
      nextTick(() => {
        const container = document.querySelector('.messages-container')
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    })
    
    console.log('âœ… Room-specific listener set up for:', roomId)
  } else {
    console.log('âŒ Socket not available or not connected')
  }
}

const loadChatMessages = async (roomId) => {
  try {
    console.log('Loading messages for room:', roomId)
    const response = await fetch(`/api/admin/chats/${roomId}/messages`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      // Normalize message format from API (database messages use 'message' field)
      messages.value = (data.messages || []).map(msg => ({
        _id: msg._id,
        content: msg.message, // API uses 'message' field
        sender: msg.sender || msg.senderRole, // Preserve original sender field
        senderRole: msg.senderRole, // Also keep senderRole for detection
        senderName: msg.senderName,
        timestamp: msg.timestamp
      }))
      console.log('Loaded messages:', messages.value)
    } else {
      console.error('Failed to load messages')
      messages.value = []
    }
  } catch (error) {
    console.error('Error loading messages:', error)
    messages.value = []
  }
}

const assignToSelf = async (chat) => {
  try {
    const response = await fetch(`/api/admin/chats/${chat._id}/assign`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentId: user.value.id,
        agentName: user.value.username
      })
    })
    
    if (response.ok) {
      // Update local chat data
      chat.agent = {
        id: user.value.id,
        name: user.value.username
      }
      chat.status = 'active'
      
      // Emit socket event for real-time update
      if (socket.value) {
        socket.value.emit('agent_assigned', {
          chatId: chat._id,
          roomId: chat.roomId,
          agent: chat.agent
        })
      }
    }
  } catch (error) {
    console.error('Error assigning chat:', error)
  }
}

const sendMessage = async () => {
  console.log('ðŸ”§ SendMessage called:', {
    hasMessage: !!newMessage.value.trim(),
    hasSelectedChat: !!selectedChat.value,
    hasSocket: !!socket.value,
    socketConnected: socket.value?.connected,
    selectedChatStatus: selectedChat.value?.status,
    selectedChatId: selectedChat.value?._id,
    selectedChatRoomId: selectedChat.value?.roomId
  })
  
  if (!newMessage.value.trim()) {
    console.log('âŒ SendMessage validation failed: No message content')
    return
  }
  
  if (!selectedChat.value) {
    console.log('âŒ SendMessage validation failed: No selected chat')
    return
  }
  
  if (!socket.value || !socket.value.connected) {
    console.log('âŒ SendMessage validation failed: Socket not connected')
    return
  }

  const messageData = {
    roomId: selectedChat.value.roomId || selectedChat.value._id,
    content: newMessage.value.trim(),
    sender: 'agent',
    senderName: user.value.username,
    timestamp: new Date().toISOString()
  }

  console.log('ðŸ“¤ Sending message via socket:', messageData)
  
  // Send message via socket - let server broadcast handle adding to messages
  socket.value.emit('send_message', messageData)
  
  // Clear input
  newMessage.value = ''
}

const closeChatModal = () => {
  const currentChat = selectedChat.value
  
  // Clean up room-specific listeners
  if (socket.value && currentChat) {
    const roomId = currentChat.roomId || currentChat._id
    socket.value.emit('leave_room', { roomId })
    socket.value.off(`receive_message_${roomId}`)
    console.log('ðŸ§¹ Cleaned up listeners for room:', roomId)
  }
  
  selectedChat.value = null
  messages.value = []
  newMessage.value = ''
}

const closeChat = async (chat) => {
  try {
    const response = await fetch(`/api/admin/chats/${chat._id}/close`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      // Update chat status instead of removing from array
      const chatIndex = chats.value.findIndex(c => c._id === chat._id)
      if (chatIndex !== -1) {
        chats.value[chatIndex].status = 'closed'
        chats.value[chatIndex].closedAt = new Date().toISOString()
      }
      
      // Refetch chats to get updated stats from server
      await loadChats()
      
      // Emit socket event for real-time updates
      if (socket.value) {
        socket.value.emit('chat_status_changed', {
          chatId: chat._id,
          roomId: chat.roomId,
          status: 'closed'
        })
      }
      
      // Close modal if this chat was being viewed
      if (selectedChat.value && selectedChat.value._id === chat._id) {
        closeChatModal()
      }
      
      console.log('Chat closed and removed from view')
    }
  } catch (error) {
    console.error('Error closing chat:', error)
  }
}

const exportChat = async (chat) => {
  try {
    const response = await fetch(`/api/admin/chats/${chat._id}/export`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-${chat._id}.json`
      a.click()
      window.URL.revokeObjectURL(url)
    }
  } catch (error) {
    console.error('Error exporting chat:', error)
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

const isCustomerMessage = (message) => {
  console.log('ðŸ” Message sender check:', { sender: message.sender, senderRole: message.senderRole, senderName: message.senderName })
  
  // Check multiple possible fields for customer/guest identification
  const isCustomer = message.sender === 'customer' || 
                    message.sender === 'guest' || 
                    message.senderRole === 'guest' ||
                    message.senderRole === 'customer' ||
                    (message.senderName && message.senderName !== 'testadmin' && message.sender !== 'agent')
  
  console.log('ðŸ” Is customer message?', isCustomer)
  return isCustomer
}

const getMessageWrapperClass = (message) => {
  const isCustomer = isCustomerMessage(message)
  const wrapperClass = `message-wrapper ${isCustomer ? 'customer-side' : 'agent-side'}`
  console.log('ðŸ“± Message wrapper class:', wrapperClass, 'for sender:', message.sender)
  return wrapperClass
}

const getMessageBubbleClass = (message) => {
  const isCustomer = isCustomerMessage(message)
  const bubbleClass = `message-bubble ${isCustomer ? 'customer-bubble' : 'agent-bubble'}`
  console.log('ðŸ’¬ Message bubble class:', bubbleClass, 'for sender:', message.sender)
  return bubbleClass
}

const calculateDuration = (start, end) => {
  const duration = new Date(end) - new Date(start)
  const minutes = Math.floor(duration / 60000)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  return `${minutes}m`
}

// Watchers
watch(currentPage, loadChats)

// Auto-refresh chats every 30 seconds
let chatRefreshInterval = null

// Real-time socket handlers
const setupSocketListeners = () => {
  console.log('ðŸŽ§ Setting up socket listeners, socket available:', !!socket.value, 'socket connected:', socket.value?.connected)
  if (!socket.value) {
    console.log('âŒ No socket available for listeners')
    return
  }

  // Test socket connectivity
  console.log('ðŸ§ª Testing socket connectivity...')
  socket.value.emit('ping')
  socket.value.on('pong', (data) => {
    console.log('ðŸ“ Pong received:', data)
  })

  // Test if receive_message listener is working
  console.log('ðŸ§ª Setting up receive_message listener with debugging...')

  // Start auto-refresh for chats
  if (chatRefreshInterval) clearInterval(chatRefreshInterval)
  chatRefreshInterval = setInterval(() => {
    console.log('ðŸ”„ Auto-refreshing chats...')
    loadChats()
  }, 30000) // Refresh every 30 seconds

  // Listen for new chat requests (immediate refresh)
  socket.value.on('new_chat_request', (chatData) => {
    console.log('ðŸ”” New chat request received:', chatData)
    loadChats() // Immediately refresh chat list
    updateChatStats()
  })

  // Listen for new chat rooms
  socket.value.on('new_chat_room', (roomData) => {
    console.log('New chat room created:', roomData)
    loadChats() // Refresh the chat list
    updateChatStats()
  })

  // Listen for chat updates
  socket.value.on('chat_updated', (chatData) => {
    console.log('Chat updated:', chatData)
    // Update specific chat in the list
    const chatIndex = chats.value.findIndex(chat => chat._id === chatData._id)
    if (chatIndex !== -1) {
      chats.value[chatIndex] = chatData
    }
  })

  // Listen for new messages in any chat (fallback)
  socket.value.on('receive_message', (messageData) => {
    console.log('ðŸ”” Global RECEIVE_MESSAGE EVENT:', messageData)
    console.log('ðŸ” Current selected chat room:', selectedChat.value?.roomId || selectedChat.value?._id)
    console.log('ðŸ” Message room ID:', messageData.roomId)
    
    // If this message is for the currently selected chat, add it to messages
    if (selectedChat.value && messageData.roomId === (selectedChat.value.roomId || selectedChat.value._id)) {
      console.log('âœ… Global listener: Adding message to current chat')
      
      // Create properly formatted message object
      const newMessageObj = {
        _id: messageData._id || Date.now(),
        content: messageData.content || messageData.message,
        sender: messageData.sender || messageData.senderRole,
        senderRole: messageData.senderRole || messageData.sender,
        senderName: messageData.senderName,
        timestamp: messageData.timestamp
      }
      
      // Check if message already exists to prevent duplicates
      const existingMessageIndex = messages.value.findIndex(msg => 
        msg.content === newMessageObj.content && 
        msg.senderName === newMessageObj.senderName &&
        Math.abs(new Date(msg.timestamp) - new Date(newMessageObj.timestamp)) < 2000
      )
      
      if (existingMessageIndex === -1) {
        messages.value.push(newMessageObj)
        console.log('âœ… Global listener: Message added. Total:', messages.value.length)
        
        // Force Vue reactivity update
        messages.value = [...messages.value]
        
        // Auto-scroll to bottom
        nextTick(() => {
          const container = document.querySelector('.messages-container')
          if (container) {
            container.scrollTop = container.scrollHeight
            console.log('ðŸ“œ Scrolled to bottom')
          }
        })
      } else {
        console.log('âš ï¸ Global listener: Duplicate prevented')
      }
    } else {
      console.log('âŒ Global listener: Message not for current chat')
    }
    
    // Update last message for the chat in the list
    const chatIndex = chats.value.findIndex(chat => 
      chat.roomId === messageData.roomId || chat._id === messageData.roomId
    )
    if (chatIndex !== -1) {
      chats.value[chatIndex].lastMessage = {
        content: messageData.content || messageData.message,
        timestamp: messageData.timestamp
      }
      chats.value[chatIndex].messageCount = (chats.value[chatIndex].messageCount || 0) + 1
    }
    updateChatStats()
  })

  // Listen for chat status changes
  socket.value.on('chat_status_changed', (data) => {
    console.log('Chat status changed:', data)
    const chatIndex = chats.value.findIndex(chat => chat._id === data.chatId)
    if (chatIndex !== -1) {
      if (data.status === 'closed') {
        // Remove closed chats from view unless specifically showing closed chats
        if (!filters.value.status || !filters.value.status.includes('closed')) {
          chats.value.splice(chatIndex, 1)
        } else {
          chats.value[chatIndex].status = data.status
        }
      } else {
        chats.value[chatIndex].status = data.status
      }
    }
    updateChatStats()
  })

  // Listen for agent assignments
  socket.value.on('agent_assigned', (data) => {
    console.log('Agent assigned:', data)
    const chatIndex = chats.value.findIndex(chat => chat._id === data.chatId)
    if (chatIndex !== -1) {
      chats.value[chatIndex].agent = data.agent
    }
  })

  // Listen for message sent confirmations
  socket.value.on('message_sent', (confirmation) => {
    console.log('âœ… Message sent confirmation:', confirmation)
    // Update the pending message with real ID if needed
    if (selectedChat.value && messages.value.length > 0) {
      const lastMessage = messages.value[messages.value.length - 1]
      if (lastMessage._id && lastMessage._id.startsWith('pending-')) {
        lastMessage._id = confirmation._id
      }
    }
  })
}

const updateChatStats = () => {
  const stats = {
    total: chats.value.length,
    active: chats.value.filter(chat => chat.status === 'active').length,
    waiting: chats.value.filter(chat => chat.status === 'waiting').length,
    closed: chats.value.filter(chat => chat.status === 'closed').length
  }
  chatStats.value = stats
}

// Helper function to join socket as admin
const joinSocketAsAdmin = () => {
  if (socket.value && user.value) {
    console.log('ðŸ”Œ Admin connecting to socket as:', user.value)
    socket.value.emit('join', {
      userId: user.value.id,
      username: user.value.username,
      role: user.value.role
    })
    console.log('ðŸ“¤ Emitted join event for admin')
    return true
  } else {
    console.log('âŒ Socket or user not available:', { socket: !!socket.value, user: !!user.value })
    return false
  }
}

// Lifecycle
onMounted(async () => {
  console.log('ðŸš€ Chats component mounted')
  
  // Connect to socket for real-time updates
  await connect()
  console.log('ðŸ”Œ Socket connected, user available:', !!user.value)
  
  // Try to join as admin immediately
  if (!joinSocketAsAdmin()) {
    console.log('â³ User not loaded yet, waiting...')
    // If user not loaded yet, retry in 100ms intervals
    const joinRetryInterval = setInterval(() => {
      if (joinSocketAsAdmin()) {
        clearInterval(joinRetryInterval)
      }
    }, 100)
    
    // Stop trying after 5 seconds
    setTimeout(() => {
      clearInterval(joinRetryInterval)
      console.log('â° Stopped waiting for user authentication')
    }, 5000)
  }
  
  // Set up real-time listeners
  setupSocketListeners()
  
  // Load initial data
  loadChats()
})

// Watch for user changes (in case auth loads after component mounts)
watch(user, (newUser) => {
  if (newUser && socket.value) {
    console.log('ðŸ‘¤ User loaded after mount, joining socket')
    joinSocketAsAdmin()
  }
})

onUnmounted(() => {
  // Clean up intervals
  if (chatRefreshInterval) {
    clearInterval(chatRefreshInterval)
    chatRefreshInterval = null
  }
  
  // Clean up socket listeners
  if (socket.value) {
    socket.value.off('new_chat_request')
    socket.value.off('new_chat_room')
    socket.value.off('chat_updated')
    socket.value.off('receive_message')
    socket.value.off('chat_status_changed')
    socket.value.off('agent_assigned')
  }
  disconnect()
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

.filters {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.filter-group label {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.filter-group select,
.filter-group input {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.stats-row {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.stat-item {
  flex: 1;
  min-width: 150px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: all 0.2s ease;
}

.stat-item.clickable {
  cursor: pointer;
  user-select: none;
}

.stat-item.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-item.active {
  border: 2px solid #4299e1;
  background: #f0f8ff;
}

.stat-item i {
  font-size: 2rem;
  margin-bottom: 10px;
}

.text-blue { color: #4299e1; }
.text-green { color: #48bb78; }
.text-orange { color: #ed8936; }
.text-gray { color: #718096; }

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
}

.stat-label {
  display: block;
  color: #718096;
  font-size: 0.9rem;
  margin-top: 5px;
}

.chat-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading, .no-chats {
  text-align: center;
  padding: 60px 20px;
  color: #718096;
}

.loading i, .no-chats i {
  font-size: 3rem;
  margin-bottom: 15px;
}

.chat-card {
  border-bottom: 1px solid #e2e8f0;
  padding: 20px;
  transition: background-color 0.2s;
}

.chat-card:hover {
  background-color: #f7fafc;
}

.chat-card.active {
  border-left: 4px solid #48bb78;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.chat-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.chat-info h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.2rem;
}

.chat-id {
  background: #f7fafc;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #718096;
  font-family: monospace;
}

.status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status.active { background: #d1fae5; color: #065f46; }
.status.waiting { background: #fef3c7; color: #92400e; }
.status.closed { background: #f1f5f9; color: #475569; }

.chat-time {
  text-align: right;
  color: #718096;
  font-size: 0.9rem;
}

.duration {
  display: block;
  font-weight: 600;
  margin-top: 5px;
}

.chat-details {
  margin-bottom: 15px;
}

.participants {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.customer, .agent, .department {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4a5568;
  font-size: 0.9rem;
}

.last-message p {
  margin: 0 0 5px 0;
  font-style: italic;
  color: #4a5568;
}

.last-message small {
  color: #718096;
}

.message-count {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #718096;
  font-size: 0.9rem;
}

.chat-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-view {
  background: #4299e1;
  color: white;
}

.btn-view:hover {
  background: #3182ce;
}

.btn-close {
  background: #f56565;
  color: white;
}

.btn-close:hover {
  background: #e53e3e;
}

.btn-download {
  background: #48bb78;
  color: white;
}

.btn-download:hover {
  background: #38a169;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
  padding: 20px;
}

.page-btn {
  padding: 10px 15px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #4299e1;
  color: white;
  border-color: #4299e1;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-weight: 600;
  color: #4a5568;
}

.btn-assign {
  background: #48bb78;
  color: white;
}

.btn-assign:hover {
  background: #38a169;
}

/* Chat Modal Styles */
.chat-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.chat-modal {
  background: #ffffff;
  border-radius: 12px;
  width: 90%;
  max-width: 900px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.4rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-header h3 i {
  color: #3b82f6;
}

.btn-close-modal {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-close-modal:hover {
  background: #dc2626;
}

.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-info-bar {
  display: flex;
  gap: 25px;
  padding: 16px 25px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

.info-item {
  font-size: 0.9rem;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
}

.info-item strong {
  color: #2d3748;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 15px;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-wrapper {
  display: flex;
  margin-bottom: 8px;
}

.messages-container .message-wrapper.customer-side {
  justify-content: flex-end !important;
}

.messages-container .message-wrapper.agent-side {
  justify-content: flex-start !important;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: messageSlideIn 0.3s ease-out;
}

.message-bubble.customer-bubble {
  background: #ffffff !important;
  color: #374151 !important;
  border-bottom-right-radius: 6px !important;
  border: 1px solid #d1d5db !important;
}

.message-bubble.agent-bubble {
  background: #3b82f6 !important;
  color: white !important;
  border-bottom-left-radius: 6px !important;
}

.message-content {
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: 4px;
  font-weight: 400;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-top: 4px;
}

.sender-name {
  font-weight: 500;
  text-transform: capitalize;
}

.timestamp {
  font-size: 0.7rem;
  opacity: 0.7;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar styling for messages */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.no-messages {
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.no-messages i {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.6;
  color: #9ca3af;
}

.no-messages p {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 300;
}

.message-input {
  display: flex;
  gap: 12px;
  padding: 20px 25px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.message-input input {
  flex: 1;
  padding: 14px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 25px;
  font-size: 0.95rem;
  outline: none;
  background: #ffffff;
  transition: all 0.2s ease;
}

.message-input input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.message-input input::placeholder {
  color: #9ca3af;
}

.btn-send {
  background: #10b981;
  color: white;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-send:hover {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-send:active {
  transform: scale(0.95);
}

.message-input-disabled {
  padding: 20px 25px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  color: #64748b;
  font-style: italic;
}

.message-input-disabled i {
  margin-right: 8px;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
  }
  
  .stats-row {
    flex-direction: column;
  }
  
  .chat-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .participants {
    flex-direction: column;
    gap: 10px;
  }
  
  .chat-modal {
    width: 95%;
    height: 90vh;
    border-radius: 15px;
  }
  
  .modal-header {
    padding: 15px 20px;
  }
  
  .modal-header h3 {
    font-size: 1.2rem;
  }
  
  .chat-info-bar {
    flex-direction: column;
    gap: 8px;
    padding: 12px 20px;
  }
  
  .message-bubble {
    max-width: 85%;
  }
  
  .messages-container {
    padding: 15px 10px;
  }
  
  .message-input {
    padding: 15px 20px;
  }
  
  .btn-send {
    width: 45px;
    height: 45px;
  }
}
</style>
