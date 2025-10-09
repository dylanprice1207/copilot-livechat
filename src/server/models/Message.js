const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatRoom: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Allow null for guest messages
  senderName: String,
  senderRole: String,
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', messageSchema);