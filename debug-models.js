require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Debugging Model Registration...');

// Load models the same way the server does
const User = require('./src/server/models/User');
const Organization = require('./src/server/models/Organization');
const Department = require('./src/server/models/Department');
const Message = require('./src/server/models/Message');
const ChatRoom = require('./src/server/models/ChatRoom');

console.log('📝 Direct model imports completed');

// Now check what's in the index
const { User: IndexUser, Organization: IndexOrg, Department: IndexDept } = require('./src/server/models');

console.log('📂 Index model imports completed');

// Connect to database
async function debugModels() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    console.log('\n🔍 Registered Mongoose Models:');
    const modelNames = mongoose.modelNames();
    modelNames.forEach(name => {
      console.log(`  - ${name}`);
    });
    
    console.log('\n🧪 Testing Model Usage:');
    
    // Test User model from direct import
    try {
      console.log('Testing User (direct import)...');
      await User.find().limit(1);
      console.log('✅ User (direct) works');
    } catch (error) {
      console.log('❌ User (direct) error:', error.message);
    }
    
    // Test User model from index import
    try {
      console.log('Testing User (index import)...');
      await IndexUser.find().limit(1);
      console.log('✅ User (index) works');
    } catch (error) {
      console.log('❌ User (index) error:', error.message);
    }
    
    // Test Organization populate
    try {
      console.log('Testing Organization populate...');
      await Organization.find().populate('adminId', 'username email role').limit(1);
      console.log('✅ Organization populate works');
    } catch (error) {
      console.log('❌ Organization populate error:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

debugModels();