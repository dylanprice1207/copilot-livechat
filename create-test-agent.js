const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('./src/server/models/User');

async function createTestAgent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lightwave-ai');
    console.log('Connected to MongoDB');

    // Check if agent already exists
    const existingAgent = await User.findOne({ username: 'testagent' });
    if (existingAgent) {
      console.log('Test agent already exists');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('agent123', 10);

    // Create test agent
    const testAgent = new User({
      username: 'testagent',
      email: 'agent@test.com',
      password: hashedPassword,
      role: 'agent',
      organization: 'lightwave',
      departments: ['support', 'general'],
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    });

    await testAgent.save();
    console.log('✅ Test agent created successfully:');
    console.log('Username: testagent');
    console.log('Password: agent123');
    console.log('Role: agent');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test agent:', error);
    process.exit(1);
  }
}

createTestAgent();