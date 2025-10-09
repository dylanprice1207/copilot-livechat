// Socket service for handling Socket.IO communication
class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io({
          transports: ['websocket', 'polling'],
          upgrade: true,
          timeout: 10000
        });

        this.socket.on('connect', () => {
          console.log('✅ Socket connected:', this.socket.id);
          this.connected = true;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
          this.connected = false;
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 Socket disconnected');
          this.connected = false;
        });

        // Setup event forwarding
        this.setupEventForwarding();

      } catch (error) {
        reject(error);
      }
    });
  }

  setupEventForwarding() {
    // Forward all events to registered callbacks
    const events = [
      'new_chat_request',
      'existing_waiting_chats', 
      'existing_active_chats',
      'chat_accepted',
      'agent_joined',
      'new_message',
      'user_typing',
      'user_stop_typing',
      'chat_closed',
      'chat_taken',
      'test_event',
      'error'
    ];

    events.forEach(event => {
      this.socket.on(event, (data) => {
        console.log(`📨 Socket event received: ${event}`, data);
        const callback = this.callbacks.get(event);
        if (callback) {
          callback(data);
        }
      });
    });
  }

  on(event, callback) {
    this.callbacks.set(event, callback);
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      console.log(`📤 Socket emit: ${event}`, data);
      this.socket.emit(event, data);
    } else {
      console.warn('❌ Socket not connected, cannot emit:', event);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SocketService = SocketService;
}