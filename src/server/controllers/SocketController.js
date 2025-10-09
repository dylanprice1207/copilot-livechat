const ChatService = require('../services/ChatService');
const { User } = require('../models');

class SocketController {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Handle user joining
      socket.on('join', (userData) => this.handleJoin(socket, userData));
      
      // Handle guest chat requests
      socket.on('request_chat', (data) => this.handleChatRequest(socket, data));
      
      // Handle agent accepting chats
      socket.on('accept_chat', (data) => this.handleAcceptChat(socket, data));
      
      // Handle messages
      socket.on('send_message', (data) => this.handleSendMessage(socket, data));
      
      // Handle typing indicators
      socket.on('typing', (data) => this.handleTyping(socket, data));
      socket.on('stop_typing', (data) => this.handleStopTyping(socket, data));
      
      // Handle chat closure
      socket.on('close_chat', (data) => this.handleCloseChat(socket, data));
      
      // Handle refresh requests
      socket.on('refresh_chats', () => this.handleRefreshChats(socket));
      
      // Handle ping for connection health
      socket.on('ping', () => this.handlePing(socket));
      
      // Handle disconnection
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  async handleJoin(socket, userData) {
    try {
      console.log('🔗 Join event received:', userData);
      const { userId, role, username } = userData;
      console.log(`👤 Processing join for: ${username} with role: ${role}`);
      
      // Handle different user types
      if (role === 'guest') {
        await this.handleGuestJoin(socket, userData);
      } else {
        await this.handleUserJoin(socket, userData);
      }

      // Handle agent/admin joining agents room
      if (role === 'agent' || role === 'admin') {
        await this.handleAgentJoin(socket, username);
      }

      console.log(`${username} (${role}) joined`);
    } catch (error) {
      console.error('Error in handleJoin:', error);
      socket.emit('error', { message: 'Failed to join' });
    }
  }

  async handleGuestJoin(socket, userData) {
    const { username } = userData;
    
    socket.userId = socket.id;
    socket.userRole = 'guest';
    socket.username = username;
    
    console.log(`Guest joined: ${username} (${socket.id})`);
    
    // Check for existing room (reconnection)
    const existingRoom = await ChatService.findExistingGuestRoom(username);
    
    if (existingRoom) {
      console.log('🔄 Guest reconnecting to existing room:', existingRoom.roomId);
      await ChatService.updateGuestSocketId(existingRoom.roomId, socket.id);
      
      socket.join(existingRoom.roomId);
      socket.currentRoom = existingRoom.roomId;
      
      socket.emit('chat_room_assigned', { roomId: existingRoom.roomId });
      
      if (existingRoom.status === 'active' && existingRoom.agent) {
        const agent = await User.findById(existingRoom.agent);
        if (agent) {
          socket.emit('agent_joined', {
            agentName: agent.username,
            roomId: existingRoom.roomId
          });
        }
      }
    }
  }

  async handleUserJoin(socket, userData) {
    const { userId, role, username } = userData;
    
    await User.findByIdAndUpdate(userId, { 
      socketId: socket.id, 
      isOnline: true 
    });

    socket.userId = userId;
    socket.userRole = role;
    socket.username = username;
    
    console.log(`User joined: ${username} (${userId})`);
  }

  async handleAgentJoin(socket, username) {
    console.log(`🚀 Agent ${username} attempting to join 'agents' room...`);
    socket.join('agents');
    console.log(`👤 Agent ${username} joined 'agents' room`);
    console.log(`📊 Total agents in room: ${this.io.sockets.adapter.rooms.get('agents')?.size || 0}`);
    
    // Send test event to verify connection
    setTimeout(() => {
      console.log('🧪 Sending test event to agent...');
      socket.emit('test_event', { message: 'Agent connection verified!' });
    }, 1000);

    // Send existing chats to the agent
    await this.sendExistingChats(socket);
  }

  async handleChatRequest(socket, data) {
    try {
      const { username } = data;
      
      // Create chat room
      const chatRoom = await ChatService.createChatRoom({
        username,
        socketId: socket.id
      });

      socket.join(chatRoom.roomId);
      socket.currentRoom = chatRoom.roomId;

      // Notify guest
      socket.emit('chat_room_assigned', { roomId: chatRoom.roomId });

      // Broadcast to agents
      const chatData = {
        roomId: chatRoom.roomId,
        customer: username,
        customerId: socket.id,
        isGuest: true,
        timestamp: new Date()
      };

      console.log('📢 Broadcasting new chat request to agents:', chatData);
      this.io.to('agents').emit('new_chat_request', chatData);
      console.log(`👥 Broadcasting to ${this.io.sockets.adapter.rooms.get('agents')?.size || 0} agents in 'agents' room`);

    } catch (error) {
      console.error('Error in chat request:', error);
      socket.emit('error', { message: 'Failed to create chat' });
    }
  }

  async handleAcceptChat(socket, data) {
    try {
      const { roomId, agentId } = data;
      console.log('🎯 Agent accepting chat:', { roomId, agentId });
      
      const chatRoom = await ChatService.assignAgent(roomId, agentId);
      
      // Agent joins the chat room
      socket.join(roomId);
      console.log(`✅ Chat room found, agent joining room: ${roomId}`);

      // Notify guest that agent joined
      this.io.to(roomId).emit('agent_joined', {
        agentName: socket.username,
        roomId: roomId
      });

      // Notify other agents that chat is taken
      socket.to('agents').emit('chat_taken', { roomId });

      // Send confirmation to accepting agent
      socket.emit('chat_accepted', { roomId, customer: chatRoom.guestInfo?.username });

    } catch (error) {
      console.error('Error accepting chat:', error);
      socket.emit('error', { message: 'Failed to accept chat' });
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { roomId, message } = data;
      console.log(`📨 Message from ${socket.username}: ${message}`);

      // Save message to database
      const messageData = {
        chatRoom: roomId,
        sender: socket.userRole === 'guest' ? null : socket.userId,
        senderName: socket.username,
        senderRole: socket.userRole,
        message
      };

      const savedMessage = await ChatService.saveMessage(messageData);

      // Broadcast to room
      const messagePayload = {
        id: savedMessage._id,
        sender: socket.username,
        message,
        timestamp: savedMessage.timestamp,
        senderRole: socket.userRole
      };

      this.io.to(roomId).emit('new_message', messagePayload);
      console.log(`📤 Message sent to room ${roomId}`);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  handleTyping(socket, data) {
    const { roomId } = data;
    socket.to(roomId).emit('user_typing', {
      username: socket.username,
      role: socket.userRole
    });
  }

  handleStopTyping(socket, data) {
    const { roomId } = data;
    socket.to(roomId).emit('user_stop_typing', {
      username: socket.username,
      role: socket.userRole
    });
  }

  async handleCloseChat(socket, data) {
    try {
      const { roomId } = data;
      
      await ChatService.closeChatRoom(roomId);
      
      // Notify all participants
      this.io.to(roomId).emit('chat_closed', { roomId });
      
      // Remove from room
      socket.leave(roomId);

    } catch (error) {
      console.error('Error closing chat:', error);
      socket.emit('error', { message: 'Failed to close chat' });
    }
  }

  async handleRefreshChats(socket) {
    if (socket.userRole === 'agent' || socket.userRole === 'admin') {
      await this.sendExistingChats(socket);
    }
  }

  handlePing(socket) {
    console.log(`🏓 Ping received from: ${socket.username}`);
    socket.emit('pong', { message: 'Connection healthy' });
  }

  async handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.username || socket.id}`);
    
    if (socket.userId && socket.userRole !== 'guest') {
      await User.findByIdAndUpdate(socket.userId, { isOnline: false });
    }
  }

  async sendExistingChats(socket) {
    try {
      // Send waiting chats
      const waitingChats = await ChatService.getWaitingChats();
      const waitingChatsData = waitingChats.map(room => ({
        roomId: room.roomId,
        customer: room.guestInfo?.username || room.customerName || 'Unknown Customer',
        customerId: room.customerId,
        isGuest: room.guestInfo ? true : (room.isGuest || false),
        timestamp: room.createdAt
      }));

      socket.emit('existing_waiting_chats', waitingChatsData);

      // Send active chats for this agent
      const activeChats = await ChatService.getActiveChats(socket.userId);
      const activeChatsData = activeChats.map(room => ({
        roomId: room.roomId,
        customer: room.guestInfo?.username || room.customerName || 'Unknown Customer',
        customerId: room.customerId,
        isGuest: room.guestInfo ? true : (room.isGuest || false),
        timestamp: room.createdAt
      }));

      socket.emit('existing_active_chats', activeChatsData);

    } catch (error) {
      console.error('Error sending existing chats:', error);
    }
  }
}

module.exports = SocketController;