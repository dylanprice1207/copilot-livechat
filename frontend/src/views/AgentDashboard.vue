<template>
    <div class="agent-dashboard">
        <!-- Header -->
        <header class="dashboard-header">
            <div class="header-content">
                <h1>Agent Dashboard</h1>
                <div class="agent-info">
                    <span class="agent-name">{{ agentName }}</span>
                    <div class="status-toggle">
                        <label class="switch">
                            <input 
                                type="checkbox" 
                                v-model="isOnline" 
                                @change="toggleStatus"
                            >
                            <span class="slider"></span>
                        </label>
                        <span class="status-label">{{ isOnline ? 'Online' : 'Offline' }}</span>
                    </div>
                    <button @click="logout" class="logout-btn">Logout</button>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <div class="dashboard-content">
            <!-- Sidebar - Chat List -->
            <aside class="chat-sidebar">
                <div class="sidebar-header">
                    <h3>Active Chats ({{ activeChatCount }})</h3>
                    <div class="chat-filters">
                        <button 
                            v-for="filter in chatFilters" 
                            :key="filter.key"
                            :class="['filter-btn', { active: activeFilter === filter.key }]"
                            @click="setFilter(filter.key)"
                        >
                            {{ filter.label }}
                        </button>
                    </div>
                </div>
                
                <div class="chat-list">
                    <div 
                        v-for="chat in filteredChats" 
                        :key="chat.id"
                        :class="['chat-item', { 
                            active: selectedChatId === chat.id,
                            unread: chat.unreadCount > 0,
                            typing: chat.isTyping
                        }]"
                        @click="selectChat(chat.id)"
                    >
                        <div class="chat-avatar">
                            <img :src="chat.customer.avatar || '/default-avatar.png'" :alt="chat.customer.name">
                            <span :class="['status-dot', chat.customer.status]"></span>
                        </div>
                        <div class="chat-info">
                            <div class="chat-header">
                                <span class="customer-name">{{ chat.customer.name }}</span>
                                <span class="chat-time">{{ formatTime(chat.lastMessage.timestamp) }}</span>
                            </div>
                            <div class="chat-preview">
                                <span v-if="chat.isTyping" class="typing-indicator">
                                    <i class="dots"></i> Customer is typing...
                                </span>
                                <span v-else class="last-message">{{ chat.lastMessage.content }}</span>
                            </div>
                            <div v-if="chat.unreadCount > 0" class="unread-badge">
                                {{ chat.unreadCount }}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- Chat Area -->
            <main class="chat-main">
                <div v-if="selectedChatId" class="chat-container">
                    <!-- Chat Header -->
                    <div class="chat-header">
                        <div class="customer-info">
                            <img :src="selectedChat.customer.avatar || '/default-avatar.png'" :alt="selectedChat.customer.name">
                            <div>
                                <h4>{{ selectedChat.customer.name }}</h4>
                                <p class="customer-status">{{ selectedChat.customer.email }}</p>
                            </div>
                        </div>
                        <div class="chat-actions">
                            <button @click="transferChat" class="action-btn">Transfer</button>
                            <button @click="endChat" class="action-btn danger">End Chat</button>
                        </div>
                    </div>

                    <!-- Messages Area -->
                    <div class="messages-container" ref="messagesContainer">
                        <div 
                            v-for="message in selectedChat.messages" 
                            :key="message.id"
                            :class="['message', message.sender.type]"
                        >
                            <div class="message-content">
                                <p>{{ message.content }}</p>
                                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
                            </div>
                        </div>
                        <div v-if="customerTyping" class="typing-indicator">
                            <div class="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            Customer is typing...
                        </div>
                    </div>

                    <!-- Message Input -->
                    <div class="message-input-area">
                        <div class="input-container">
                            <textarea
                                v-model="newMessage"
                                @keydown.enter.prevent="sendMessage"
                                @input="handleTyping"
                                placeholder="Type your message..."
                                rows="3"
                            ></textarea>
                            <div class="input-actions">
                                <button @click="attachFile" class="attach-btn">ðŸ“Ž</button>
                                <button @click="sendMessage" :disabled="!newMessage.trim()" class="send-btn">
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No Chat Selected -->
                <div v-else class="no-chat-selected">
                    <div class="empty-state">
                        <h3>Select a chat to start messaging</h3>
                        <p>Choose a conversation from the sidebar to begin helping customers</p>
                    </div>
                </div>
            </main>

            <!-- Right Sidebar - Customer Info -->
            <aside v-if="selectedChatId" class="customer-sidebar">
                <div class="customer-details">
                    <h3>Customer Information</h3>
                    <div class="customer-card">
                        <img :src="selectedChat.customer.avatar || '/default-avatar.png'" :alt="selectedChat.customer.name">
                        <h4>{{ selectedChat.customer.name }}</h4>
                        <p>{{ selectedChat.customer.email }}</p>
                        <div class="customer-meta">
                            <div class="meta-item">
                                <span class="label">Status:</span>
                                <span :class="['status', selectedChat.customer.status]">
                                    {{ selectedChat.customer.status }}
                                </span>
                            </div>
                            <div class="meta-item">
                                <span class="label">Session Time:</span>
                                <span>{{ formatDuration(selectedChat.sessionDuration) }}</span>
                            </div>
                            <div class="meta-item">
                                <span class="label">Previous Chats:</span>
                                <span>{{ selectedChat.customer.previousChats || 0 }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions">
                    <h3>Quick Actions</h3>
                    <button @click="sendCannedResponse('greeting')" class="canned-btn">
                        Send Greeting
                    </button>
                    <button @click="sendCannedResponse('help')" class="canned-btn">
                        Offer Help
                    </button>
                    <button @click="sendCannedResponse('closing')" class="canned-btn">
                        Closing Message
                    </button>
                </div>
            </aside>
        </div>
    </div>
</template>

<script>
import { io } from 'socket.io-client'

export default {
    name: 'AgentDashboard',
    data() {
        return {
            socket: null,
            agentName: 'Agent Smith',
            isOnline: true,
            selectedChatId: null,
            newMessage: '',
            customerTyping: false,
            activeFilter: 'all',
            chats: [
                {
                    id: '1',
                    customer: {
                        name: 'John Doe',
                        email: 'john@example.com',
                        avatar: null,
                        status: 'online',
                        previousChats: 3
                    },
                    messages: [
                        {
                            id: '1',
                            content: 'Hi, I need help with my order',
                            sender: { type: 'customer' },
                            timestamp: new Date(Date.now() - 300000)
                        },
                        {
                            id: '2',
                            content: 'Hello! I\'d be happy to help you with your order. Can you please provide your order number?',
                            sender: { type: 'agent' },
                            timestamp: new Date(Date.now() - 240000)
                        }
                    ],
                    lastMessage: {
                        content: 'Hello! I\'d be happy to help you with your order. Can you please provide your order number?',
                        timestamp: new Date(Date.now() - 240000)
                    },
                    unreadCount: 0,
                    isTyping: false,
                    sessionDuration: 300000
                },
                {
                    id: '2',
                    customer: {
                        name: 'Jane Smith',
                        email: 'jane@example.com',
                        avatar: null,
                        status: 'online',
                        previousChats: 1
                    },
                    messages: [
                        {
                            id: '3',
                            content: 'Is there a discount available?',
                            sender: { type: 'customer' },
                            timestamp: new Date(Date.now() - 120000)
                        }
                    ],
                    lastMessage: {
                        content: 'Is there a discount available?',
                        timestamp: new Date(Date.now() - 120000)
                    },
                    unreadCount: 1,
                    isTyping: true,
                    sessionDuration: 120000
                }
            ],
            chatFilters: [
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'active', label: 'Active' }
            ],
            cannedResponses: {
                greeting: 'Hello! Welcome to our support chat. How can I help you today?',
                help: 'I\'m here to help! Please let me know what specific issue you\'re experiencing.',
                closing: 'Thank you for contacting us! Is there anything else I can help you with today?'
            }
        }
    },
    computed: {
        selectedChat() {
            return this.chats.find(chat => chat.id === this.selectedChatId)
        },
        filteredChats() {
            switch (this.activeFilter) {
                case 'unread':
                    return this.chats.filter(chat => chat.unreadCount > 0)
                case 'active':
                    return this.chats.filter(chat => chat.customer.status === 'online')
                default:
                    return this.chats
            }
        },
        activeChatCount() {
            return this.chats.length
        }
    },
    mounted() {
        this.initializeSocket()
        // Auto-select first chat if available
        if (this.chats.length > 0) {
            this.selectedChatId = this.chats[0].id
        }
    },
    methods: {
        initializeSocket() {
            this.socket = io('http://localhost:3000')
            
            this.socket.on('newMessage', (message) => {
                this.handleNewMessage(message)
            })

            this.socket.on('customerTyping', (data) => {
                this.handleCustomerTyping(data)
            })

            this.socket.on('customerDisconnected', (chatId) => {
                this.handleCustomerDisconnect(chatId)
            })
        },
        selectChat(chatId) {
            this.selectedChatId = chatId
            // Mark as read
            const chat = this.chats.find(c => c.id === chatId)
            if (chat) {
                chat.unreadCount = 0
            }
        },
        sendMessage() {
            if (!this.newMessage.trim() || !this.selectedChatId) return

            const message = {
                id: Date.now().toString(),
                content: this.newMessage,
                sender: { type: 'agent' },
                timestamp: new Date(),
                chatId: this.selectedChatId
            }

            // Add to local messages
            const chat = this.selectedChat
            chat.messages.push(message)
            chat.lastMessage = {
                content: message.content,
                timestamp: message.timestamp
            }

            // Emit to server
            this.socket.emit('agentMessage', message)

            this.newMessage = ''
            this.$nextTick(() => {
                this.scrollToBottom()
            })
        },
        handleNewMessage(message) {
            const chat = this.chats.find(c => c.id === message.chatId)
            if (chat) {
                chat.messages.push(message)
                chat.lastMessage = {
                    content: message.content,
                    timestamp: message.timestamp
                }
                if (message.chatId !== this.selectedChatId) {
                    chat.unreadCount++
                }
            }
        },
        handleTyping() {
            if (this.selectedChatId) {
                this.socket.emit('agentTyping', { chatId: this.selectedChatId })
            }
        },
        handleCustomerTyping(data) {
            if (data.chatId === this.selectedChatId) {
                this.customerTyping = data.isTyping
            }
            const chat = this.chats.find(c => c.id === data.chatId)
            if (chat) {
                chat.isTyping = data.isTyping
            }
        },
        toggleStatus() {
            this.socket.emit('agentStatusChange', { 
                agentId: 'agent1', 
                status: this.isOnline ? 'online' : 'offline' 
            })
        },
        setFilter(filter) {
            this.activeFilter = filter
        },
        sendCannedResponse(type) {
            this.newMessage = this.cannedResponses[type]
            this.sendMessage()
        },
        transferChat() {
            // Implement chat transfer logic
            alert('Transfer chat functionality')
        },
        endChat() {
            if (confirm('Are you sure you want to end this chat?')) {
                this.socket.emit('endChat', { chatId: this.selectedChatId })
                this.chats = this.chats.filter(c => c.id !== this.selectedChatId)
                this.selectedChatId = null
            }
        },
        attachFile() {
            // Implement file attachment logic
            alert('File attachment functionality')
        },
        logout() {
            if (confirm('Are you sure you want to logout?')) {
                this.$router.push('/login')
            }
        },
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        },
        formatDuration(ms) {
            const minutes = Math.floor(ms / 60000)
            return `${minutes}m`
        },
        scrollToBottom() {
            const container = this.$refs.messagesContainer
            if (container) {
                container.scrollTop = container.scrollHeight
            }
        },
        handleCustomerDisconnect(chatId) {
            const chat = this.chats.find(c => c.id === chatId)
            if (chat) {
                chat.customer.status = 'offline'
            }
        }
    },
    beforeUnmount() {
        if (this.socket) {
            this.socket.disconnect()
        }
    }
}
</script>

<style scoped>
.agent-dashboard {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
}

/* Header */
.dashboard-header {
    background: white;
    border-bottom: 1px solid #e0e0e0;
    padding: 1rem 2rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.agent-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.agent-name {
    font-weight: 600;
    color: #333;
}

.status-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 24px;
}

.slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
}

input:checked + .slider {
    background-color: #4CAF50;
}

input:checked + .slider:before {
    transform: translateX(24px);
}

.logout-btn {
    background: #dc3545;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

/* Main Content */
.dashboard-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* Sidebar */
.chat-sidebar {
    width: 300px;
    background: white;
    border-right: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
}

.chat-filters {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.filter-btn {
    padding: 0.25rem 0.5rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
}

.filter-btn.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
}

.chat-list {
    flex: 1;
    overflow-y: auto;
}

.chat-item {
    display: flex;
    padding: 1rem;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s;
}

.chat-item:hover {
    background: #f8f9fa;
}

.chat-item.active {
    background: #e3f2fd;
    border-right: 3px solid #007bff;
}

.chat-item.unread {
    background: #fff3cd;
}

.chat-avatar {
    position: relative;
    margin-right: 0.75rem;
}

.chat-avatar img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}

.status-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid white;
}

.status-dot.online {
    background: #4CAF50;
}

.status-dot.offline {
    background: #ccc;
}

.chat-info {
    flex: 1;
    min-width: 0;
    position: relative;
}

.chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
}

.customer-name {
    font-weight: 600;
    color: #333;
}

.chat-time {
    font-size: 0.75rem;
    color: #666;
}

.chat-preview {
    color: #666;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.typing-indicator {
    color: #007bff;
    font-style: italic;
}

.unread-badge {
    position: absolute;
    top: 0;
    right: 0;
    background: #dc3545;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 0.7rem;
    min-width: 16px;
    text-align: center;
}

/* Chat Main */
.chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: white;
}

.chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.chat-header {
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.customer-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.customer-info img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
}

.customer-status {
    color: #666;
    font-size: 0.9rem;
    margin: 0;
}

.chat-actions {
    display: flex;
    gap: 0.5rem;
}

.action-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
}

.action-btn.danger {
    background: #dc3545;
    color: white;
    border-color: #dc3545;
}

/* Messages */
.messages-container {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.message {
    display: flex;
    max-width: 70%;
}

.message.agent {
    align-self: flex-end;
}

.message.customer {
    align-self: flex-start;
}

.message-content {
    padding: 0.75rem 1rem;
    border-radius: 18px;
    position: relative;
}

.message.agent .message-content {
    background: #007bff;
    color: white;
}

.message.customer .message-content {
    background: #f1f1f1;
    color: #333;
}

.message-time {
    font-size: 0.7rem;
    opacity: 0.8;
    display: block;
    margin-top: 0.25rem;
}

.typing-dots {
    display: flex;
    gap: 4px;
    margin-right: 0.5rem;
}

.typing-dots span {
    width: 6px;
    height: 6px;
    background: #666;
    border-radius: 50%;
    animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing {
    0%, 60%, 100% {
        transform: translateY(0);
    }
    30% {
        transform: translateY(-10px);
    }
}

/* Message Input */
.message-input-area {
    padding: 1rem;
    border-top: 1px solid #e0e0e0;
}

.input-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.input-container textarea {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 0.75rem;
    resize: none;
    font-family: inherit;
}

.input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.attach-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
}

.send-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.5rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
}

.send-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
}

/* No Chat Selected */
.no-chat-selected {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-state {
    text-align: center;
    color: #666;
}

/* Customer Sidebar */
.customer-sidebar {
    width: 280px;
    background: white;
    border-left: 1px solid #e0e0e0;
    padding: 1rem;
    overflow-y: auto;
}

.customer-details h3,
.quick-actions h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
}

.customer-card {
    text-align: center;
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    margin-bottom: 2rem;
}

.customer-card img {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin-bottom: 0.5rem;
}

.customer-meta {
    margin-top: 1rem;
    text-align: left;
}

.meta-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}

.label {
    color: #666;
}

.status.online {
    color: #4CAF50;
    font-weight: 600;
}

.status.offline {
    color: #ccc;
    font-weight: 600;
}

.canned-btn {
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border: 1px solid #ddd;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
}

.canned-btn:hover {
    background: #f8f9fa;
}

/* Responsive */
@media (max-width: 768px) {
    .dashboard-content {
        flex-direction: column;
    }
    
    .chat-sidebar {
        width: 100%;
        height: 200px;
    }
    
    .customer-sidebar {
        display: none;
    }
}
</style>
