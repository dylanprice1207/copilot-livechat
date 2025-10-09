// UI Manager for handling DOM manipulation and UI updates
class UIManager {
  constructor() {
    this.elements = {};
    this.initializeElements();
  }

  initializeElements() {
    // Login elements
    this.elements.loginSection = document.getElementById('loginSection');
    this.elements.loginForm = document.getElementById('loginForm');
    
    // Dashboard elements
    this.elements.dashboardSection = document.getElementById('dashboardSection');
    this.elements.agentName = document.getElementById('agentName');
    this.elements.refreshChatsBtn = document.getElementById('refreshChatsBtn');
    this.elements.logoutBtn = document.getElementById('logoutBtn');
    
    // Chat list elements
    this.elements.waitingChats = document.getElementById('waitingChats');
    this.elements.activeChats = document.getElementById('activeChats');
    this.elements.noWaitingChats = document.getElementById('noWaitingChats');
    this.elements.noActiveChats = document.getElementById('noActiveChats');
    
    // Chat area elements
    this.elements.noChatSelected = document.getElementById('noChatSelected');
    this.elements.chatContainer = document.getElementById('chatContainer');
    this.elements.currentCustomer = document.getElementById('currentCustomer');
    this.elements.chatMessages = document.getElementById('chatMessages');
    this.elements.messageInput = document.getElementById('messageInput');
    this.elements.sendButton = document.getElementById('sendButton');
    this.elements.closeChatBtn = document.getElementById('closeChatBtn');
    this.elements.typingIndicator = document.getElementById('typingIndicator');

    console.log('🎛️ UI elements initialized:', Object.keys(this.elements).length, 'elements found');
  }

  // Show login section, hide dashboard
  showLogin() {
    if (this.elements.loginSection) {
      this.elements.loginSection.style.display = 'flex';
    }
    if (this.elements.dashboardSection) {
      this.elements.dashboardSection.style.display = 'none';
    }
  }

  // Show dashboard, hide login
  showDashboard() {
    if (this.elements.loginSection) {
      this.elements.loginSection.style.display = 'none';
    }
    if (this.elements.dashboardSection) {
      this.elements.dashboardSection.style.display = 'block';
    }
  }

  // Set agent name in UI
  setAgentName(name) {
    if (this.elements.agentName) {
      this.elements.agentName.textContent = name;
    }
  }

  // Update waiting chats list
  updateWaitingChats(chats) {
    const container = this.elements.waitingChats;
    const noChatsElement = this.elements.noWaitingChats;
    
    if (!container) return;

    // Clear existing chats
    container.innerHTML = '';
    
    if (chats.length === 0) {
      if (noChatsElement) {
        container.appendChild(noChatsElement);
      }
    } else {
      chats.forEach(chat => {
        const chatElement = this.createChatElement(chat);
        chatElement.addEventListener('click', () => this.onChatClick?.(chat));
        container.appendChild(chatElement);
      });
    }
  }

  // Update active chats list
  updateActiveChats(chats) {
    const container = this.elements.activeChats;
    const noChatsElement = this.elements.noActiveChats;
    
    if (!container) return;

    // Clear existing chats
    container.innerHTML = '';
    
    if (chats.length === 0) {
      if (noChatsElement) {
        container.appendChild(noChatsElement);
      }
    } else {
      chats.forEach(chat => {
        const chatElement = this.createChatElement(chat);
        chatElement.addEventListener('click', () => this.onChatClick?.(chat));
        container.appendChild(chatElement);
      });
    }
  }

  // Create chat element
  createChatElement(chatData) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    chatDiv.dataset.roomId = chatData.roomId;
    
    const customerName = chatData.customer || 'Unknown Customer';
    const timeString = this.formatTime(chatData.timestamp);
    
    chatDiv.innerHTML = `
      <div class="chat-item-header">
        <span class="customer-name">${customerName}</span>
        <span class="chat-time">${timeString}</span>
      </div>
      <div class="chat-item-details">
        <span class="chat-type">${chatData.isGuest ? '👤 Guest' : '👥 User'}</span>
      </div>
    `;
    
    return chatDiv;
  }

  // Show chat area
  showChatArea(customerName) {
    if (this.elements.noChatSelected) {
      this.elements.noChatSelected.style.display = 'none';
    }
    if (this.elements.chatContainer) {
      this.elements.chatContainer.style.display = 'block';
    }
    if (this.elements.currentCustomer && customerName) {
      this.elements.currentCustomer.textContent = customerName;
    }
  }

  // Hide chat area
  hideChatArea() {
    if (this.elements.noChatSelected) {
      this.elements.noChatSelected.style.display = 'block';
    }
    if (this.elements.chatContainer) {
      this.elements.chatContainer.style.display = 'none';
    }
  }

  // Clear chat messages
  clearChatMessages() {
    if (this.elements.chatMessages) {
      this.elements.chatMessages.innerHTML = '';
    }
  }

  // Add message to chat
  addMessage(messageData) {
    const container = this.elements.chatMessages;
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${messageData.className}`;
    
    messageDiv.innerHTML = `
      <div class="message-header">
        <span class="sender">${messageData.sender}</span>
        <span class="time">${messageData.time}</span>
      </div>
      <div class="message-content">${messageData.message}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }

  // Clear message input
  clearMessageInput() {
    if (this.elements.messageInput) {
      this.elements.messageInput.value = '';
    }
  }

  // Get message input value
  getMessageInputValue() {
    return this.elements.messageInput ? this.elements.messageInput.value : '';
  }

  // Show typing indicator
  showTypingIndicator(username) {
    const indicator = this.elements.typingIndicator;
    if (indicator) {
      indicator.textContent = `${username} is typing...`;
      indicator.style.display = 'block';
    }
  }

  // Hide typing indicator
  hideTypingIndicator() {
    const indicator = this.elements.typingIndicator;
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Simple notification - can be enhanced with a proper notification system
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // You could implement a toast notification system here
    if (type === 'error') {
      alert(`Error: ${message}`);
    }
  }

  // Format time
  formatTime(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (error) {
      return 'Unknown time';
    }
  }

  // Set click handlers
  onChatClick(callback) {
    this.onChatClick = callback;
  }

  // Get element by ID
  getElement(id) {
    return this.elements[id] || document.getElementById(id);
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.UIManager = UIManager;
}