const mongoose = require('mongoose');
const ChatRoom = require('./src/server/models/ChatRoom');

mongoose.connect('mongodb://localhost:27017/copilot-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function cleanupGuestRooms() {
  try {
    console.log('🧹 Cleaning up old guest chat rooms...');
    
    // Remove all guest rooms to start fresh
    const result = await ChatRoom.deleteMany({
      roomId: { $regex: '^guest_' }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} guest rooms`);
    
    // List remaining rooms
    const remainingRooms = await ChatRoom.find({});
    console.log(`📋 Remaining rooms: ${remainingRooms.length}`);
    
    for (const room of remainingRooms) {
      console.log(`  - ${room.roomId} (${room.status}) - ${room.customerName || 'Unknown'}`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up guest rooms:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

cleanupGuestRooms();