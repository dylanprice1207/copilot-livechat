// Create test organization for magic login demo
const mongoose = require('mongoose');
require('dotenv').config();

const Organization = require('./src/server/models/Organization');
const User = require('./src/server/models/User');

async function createTestOrg() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/livechat');
    console.log('Connected to MongoDB');

    // Check if test org already exists
    const existingOrg = await Organization.findOne({ slug: 'lightwave' });
    if (existingOrg) {
      console.log('✅ Test organization "Lightwave" already exists');
      console.log('Organization URLs:');
      console.log('  Admin Portal: http://localhost:3000/lightwave/admin');
      console.log('  Customer Chat: http://localhost:3000/lightwave/chat');
      console.log('  Agent Dashboard: http://localhost:3000/lightwave/agent');
      return;
    }

    // Find global admin to assign as organization admin
    const globalAdmin = await User.findOne({ role: 'global_admin' });
    if (!globalAdmin) {
      console.error('❌ No global admin found. Please create a global admin first.');
      process.exit(1);
    }

    // Create test organization
    const testOrg = new Organization({
      name: 'Lightwave',
      slug: 'lightwave',
      description: 'Test organization for magic login demo',
      adminId: globalAdmin._id,
      isActive: true,
      settings: {
        allowSelfRegistration: false,
        maxAgents: 50,
        maxDepartments: 10,
        timezone: 'UTC'
      },
      branding: {
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        welcomeMessage: 'Welcome to Lightwave! How can we help you today?'
      }
    });

    await testOrg.save();

    console.log('🎉 Test organization created successfully!');
    console.log('==========================================');
    console.log('Organization: Lightwave');
    console.log('Slug: lightwave');
    console.log('');
    console.log('Magic Login URLs Available:');
    console.log('  Admin Portal: http://localhost:3000/lightwave/admin');
    console.log('  Customer Chat: http://localhost:3000/lightwave/chat');
    console.log('  Agent Dashboard: http://localhost:3000/lightwave/agent');
    console.log('');
    console.log('🪄 Use the Global Admin portal to generate magic login links!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test organization:', error);
    process.exit(1);
  }
}

createTestOrg();