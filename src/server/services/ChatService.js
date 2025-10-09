const { ChatRoom, Message, User } = require('../models');

class ChatService {
  constructor() {
    this.activeConnections = new Map(); // Track active socket connections
  }

  // Create a new chat room
  async createChatRoom(guestInfo) {
    const roomId = `guest_${Date.now()}_${guestInfo.socketId}`;
    
    const chatRoom = new ChatRoom({
      roomId,
      guestInfo: {
        username: guestInfo.username,
        socketId: guestInfo.socketId
      },
      status: 'waiting'
    });

    await chatRoom.save();
    return chatRoom;
  }

  // Assign agent to chat room
  async assignAgent(roomId, agentId) {
    const chatRoom = await ChatRoom.findOne({ roomId, status: 'waiting' });
    if (!chatRoom) {
      throw new Error('Chat room not found or not available');
    }

    chatRoom.agent = agentId;
    chatRoom.status = 'active';
    await chatRoom.save();

    return chatRoom;
  }

  // Get active chats for an agent
  async getActiveChats(agentId) {
    return await ChatRoom.find({
      agent: agentId,
      status: 'active'
    }).populate('agent customer');
  }

  // Get waiting chats
  async getWaitingChats() {
    return await ChatRoom.find({ status: 'waiting' });
  }

  // Save message to database
  async saveMessage(messageData) {
    const { chatRoom, sender, senderName, senderRole, message } = messageData;
    
    const newMessage = new Message({
      chatRoom,
      sender: sender || null, // null for guests
      senderName,
      senderRole,
      message,
      timestamp: new Date()
    });

    await newMessage.save();
    return newMessage;
  }

  // Get chat history
  async getChatHistory(roomId) {
    return await Message.find({ chatRoom: roomId })
      .sort({ timestamp: 1 })
      .populate('sender', 'username');
  }

  // Close chat room
  async closeChatRoom(roomId) {
    const chatRoom = await ChatRoom.findOne({ roomId });
    if (!chatRoom) {
      throw new Error('Chat room not found');
    }

    chatRoom.status = 'closed';
    chatRoom.closedAt = new Date();
    await chatRoom.save();

    return chatRoom;
  }

  // Find existing chat room for guest reconnection
  async findExistingGuestRoom(username) {
    return await ChatRoom.findOne({
      'guestInfo.username': username,
      status: { $in: ['waiting', 'active'] }
    });
  }

  // Update guest socket ID for reconnection
  async updateGuestSocketId(roomId, socketId) {
    return await ChatRoom.findOneAndUpdate(
      { roomId },
      { 'guestInfo.socketId': socketId },
      { new: true }
    );
  }
}

module.exports = new ChatService();