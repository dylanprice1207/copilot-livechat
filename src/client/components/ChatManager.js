// Chat management component for handling chat operations
class ChatManager {
  constructor() {
    this.activeChatRooms = new Map();
    this.currentChat = null;
    this.messageHistory = new Map();
  }

  // Create chat room element for UI
  createChatElement(chatData) {
    console.log('🏗️ Creating chat element with data:', chatData);
    console.log('chatData.customer:', chatData.customer);
    console.log('chatData.roomId:', chatData.roomId);
    console.log('chatData.isGuest:', chatData.isGuest);
    
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    chatDiv.dataset.roomId = chatData.roomId;
    chatDiv.dataset.customerId = chatData.customerId;
    chatDiv.dataset.isGuest = chatData.isGuest || false;

    const customerName = chatData.customer || 'Unknown Customer';
    const timeString = this.formatTime(chatData.timestamp);

    chatDiv.innerHTML = `
        <div class="chat-item-header">
            <span class="customer-name">${customerName}</span>
            <span class="chat-time">${timeString}</span>
        </div>
        <div class="chat-item-details">
            <span class="chat-type">${chatData.isGuest ? '👤 Guest Chat' : '👥 User Chat'}</span>
            <span class="room-id">${chatData.roomId}</span>
        </div>
    `;

    console.log('✅ Chat element created:', chatDiv);
    return chatDiv;
  }

  // Add chat to active rooms
  addChatRoom(roomId, chatData) {
    this.activeChatRooms.set(roomId, chatData);
    console.log(`📂 Added chat room: ${roomId}`, chatData);
  }

  // Remove chat from active rooms
  removeChatRoom(roomId) {
    const removed = this.activeChatRooms.delete(roomId);
    if (removed) {
      console.log(`🗑️ Removed chat room: ${roomId}`);
    }
    return removed;
  }

  // Get chat room data
  getChatRoom(roomId) {
    return this.activeChatRooms.get(roomId);
  }

  // Set current active chat
  setCurrentChat(roomId) {
    this.currentChat = roomId;
    console.log(`💬 Current chat set to: ${roomId}`);
  }

  getCurrentChat() {
    return this.currentChat;
  }

  // Add message to history
  addMessageToHistory(roomId, message) {
    if (!this.messageHistory.has(roomId)) {
      this.messageHistory.set(roomId, []);
    }
    this.messageHistory.get(roomId).push(message);
  }

  // Get message history
  getMessageHistory(roomId) {
    return this.messageHistory.get(roomId) || [];
  }

  // Clear message history
  clearMessageHistory(roomId) {
    this.messageHistory.delete(roomId);
  }

  // Format timestamp for display
  formatTime(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (error) {
      return 'Unknown time';
    }
  }

  // Format message for display
  formatMessage(messageData) {
    const time = this.formatTime(messageData.timestamp);
    const senderClass = messageData.senderRole === 'agent' || messageData.senderRole === 'admin' ? 'agent-message' : 'customer-message';
    
    return {
      id: messageData.id,
      sender: messageData.sender,
      message: messageData.message,
      time: time,
      senderRole: messageData.senderRole,
      className: senderClass
    };
  }

  // Clear all data
  clear() {
    this.activeChatRooms.clear();
    this.messageHistory.clear();
    this.currentChat = null;
    console.log('🧹 Chat manager cleared');
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ChatManager = ChatManager;
}