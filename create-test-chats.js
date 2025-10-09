const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ChatRoom = require('./src/server/models/ChatRoom.js');
  const Message = require('./src/server/models/Message.js');
  
  console.log('🧪 Creating test chats...');
  
  // Create a few test chats with different statuses
  const testChats = [
    {
      roomId: 'test_active_1',
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      status: 'active',
      organization: 'lightwave',
      department: 'support',
      guestInfo: {
        username: 'John Smith',
        email: 'john@example.com',
        isGuest: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      roomId: 'test_waiting_1',
      customerName: 'Alice Johnson',
      customerEmail: 'alice@example.com',
      status: 'waiting',
      organization: 'lightwave',
      department: 'sales',
      guestInfo: {
        username: 'Alice Johnson',
        email: 'alice@example.com',
        isGuest: true
      },
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      updatedAt: new Date()
    },
    {
      roomId: 'test_waiting_2',
      customerName: 'Bob Wilson',
      customerEmail: 'bob@example.com',
      status: 'waiting',
      organization: 'lightwave',
      department: 'technical',
      guestInfo: {
        username: 'Bob Wilson',
        email: 'bob@example.com',
        isGuest: true
      },
      createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      updatedAt: new Date()
    }
  ];
  
  // Delete existing test chats
  await ChatRoom.deleteMany({ roomId: { $regex: /^test_/ } });
  
  // Create new test chats
  const createdChats = await ChatRoom.insertMany(testChats);
  
  console.log(`✅ Created ${createdChats.length} test chats:`);
  createdChats.forEach(chat => {
    console.log(`- ${chat.customerName} (${chat.status}) - ${chat.department}`);
  });
  
  // Add some test messages linked to the created chats
  const testMessages = [
    {
      roomId: 'test_active_1',
      message: 'Hello, I need help with my account',
      senderName: 'John Smith',
      senderRole: 'guest',
      timestamp: new Date(),
      chatRoom: createdChats.find(c => c.roomId === 'test_active_1')._id
    },
    {
      roomId: 'test_waiting_1',
      message: 'Can someone help me with pricing?',
      senderName: 'Alice Johnson',
      senderRole: 'guest',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      chatRoom: createdChats.find(c => c.roomId === 'test_waiting_1')._id
    },
    {
      roomId: 'test_waiting_2',
      message: 'Technical support needed',
      senderName: 'Bob Wilson',
      senderRole: 'guest',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      chatRoom: createdChats.find(c => c.roomId === 'test_waiting_2')._id
    }
  ];
  
  await Message.insertMany(testMessages);
  console.log(`✅ Created ${testMessages.length} test messages`);
  
  // Show final stats
  const allChats = await ChatRoom.find({ organization: 'lightwave' });
  const stats = {
    total: allChats.length,
    active: allChats.filter(c => c.status === 'active').length,
    waiting: allChats.filter(c => c.status === 'waiting').length,
    closed: allChats.filter(c => c.status === 'closed').length
  };
  
  console.log('📊 Final chat statistics:', stats);
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});