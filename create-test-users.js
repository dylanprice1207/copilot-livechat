require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/server/models/User');
const Organization = require('./src/server/models/Organization');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/livechat';

async function createTestAgent() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('agent123', 10);

    // Create test admin first (needed for organization)
    let admin = await User.findOne({ username: 'testadmin' });
    if (!admin) {
      admin = new User({
        username: 'testadmin',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      await admin.save();
      console.log('✅ Created test admin');
    } else {
      console.log('✅ Test admin already exists');
    }

    // Create or find test organization
    let organization = await Organization.findOne({ name: 'Test Organization' });
    if (!organization) {
      organization = new Organization({
        name: 'Test Organization',
        slug: 'test-org',
        adminId: admin._id,
        isActive: true
      });
      await organization.save();
      console.log('✅ Created test organization');
    }

    // Update admin with organization
    admin.organization = organization._id;
    await admin.save();
    
    // Create test agent
    let agent = await User.findOne({ username: 'testagent' });
    if (!agent) {
      agent = new User({
        username: 'testagent',
        email: 'agent@test.com',
        password: hashedPassword,
        role: 'agent',
        organization: organization._id,
        isActive: true,
        department: 'Support'
      });
      await agent.save();
      console.log('✅ Created test agent');
    } else {
      console.log('✅ Test agent already exists');
    }

    console.log('\n📋 Test Credentials:');
    console.log('Agent Login: testagent / agent123');
    console.log('Admin Login: testadmin / agent123');
    console.log('\n🌐 Access URLs:');
    console.log('Agent Dashboard: http://localhost:3000/agent.html');
    console.log('Staff Login: http://localhost:3000/app/#/login');
    console.log('Customer Chat: http://localhost:3000/app/#/chat');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createTestAgent();