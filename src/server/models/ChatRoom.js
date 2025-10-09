const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestInfo: {
    username: String,
    socketId: String
  },
  organization: { type: String, default: 'lightwave' },
  department: { type: String, default: 'general' },
  customerName: String,
  status: { type: String, enum: ['waiting', 'active', 'closed'], default: 'waiting' },
  createdAt: { type: Date, default: Date.now },
  closedAt: Date
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema);