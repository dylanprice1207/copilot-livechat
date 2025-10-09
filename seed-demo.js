const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const User = require('./src/server/models/User');

async function createDemoAccounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if demo admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('Demo admin account already exists!');
      console.log('Username: admin');
      console.log('Password: admin123');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create demo admin account
    const demoAdmin = new User({
      username: 'admin',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      status: 'online',
      departments: ['general', 'sales', 'technical', 'support', 'billing']
    });

    await demoAdmin.save();

    // Create demo agents
    const demoAgents = [
      {
        username: 'SalesAgent',
        email: 'sales@demo.com',
        password: await bcrypt.hash('agent123', 10),
        role: 'agent',
        status: 'online',
        departments: ['sales', 'general']
      },
      {
        username: 'TechAgent',
        email: 'tech@demo.com',
        password: await bcrypt.hash('agent123', 10),
        role: 'agent',
        status: 'online',
        departments: ['technical', 'support']
      },
      {
        username: 'BillingAgent',
        email: 'billing@demo.com',
        password: await bcrypt.hash('agent123', 10),
        role: 'agent',
        status: 'offline',
        departments: ['billing']
      }
    ];

    for (const agent of demoAgents) {
      const existingAgent = await User.findOne({ username: agent.username });
      if (!existingAgent) {
        await new User(agent).save();
        console.log(`Created demo agent: ${agent.username}`);
      }
    }

    console.log('\n🎉 Demo accounts created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('==========================================');
    console.log('Admin Account:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  URL: http://localhost:5173/#/admin');
    console.log('');
    console.log('Agent Accounts:');
    console.log('  Username: SalesAgent | Password: agent123');
    console.log('  Username: TechAgent  | Password: agent123');
    console.log('  Username: BillingAgent | Password: agent123');
    console.log('  URL: http://localhost:5173 (main chat)');
    console.log('==========================================');

  } catch (error) {
    console.error('Error creating demo accounts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createDemoAccounts();