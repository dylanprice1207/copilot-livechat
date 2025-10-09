const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./src/server/models/User');

async function createGlobalAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/livechat');
    console.log('Connected to MongoDB');

    // Check if global admin already exists
    const existingGlobalAdmin = await User.findOne({ role: 'global_admin' });
    if (existingGlobalAdmin) {
      console.log('✅ Global admin already exists!');
      console.log('Username:', existingGlobalAdmin.username);
      console.log('Email:', existingGlobalAdmin.email);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('globaladmin123', 10);

    // Create global admin account
    const globalAdmin = new User({
      username: 'globaladmin',
      email: 'global@admin.com',
      password: hashedPassword,
      role: 'global_admin',
      isOnline: true,
      departments: [], // Global admin doesn't need specific departments
      permissions: {
        canManageOrganizations: true,
        canManageDepartments: true,
        canManageUsers: true,
        canViewAnalytics: true
      }
    });

    await globalAdmin.save();

    console.log('🎉 Global Admin created successfully!');
    console.log('==========================================');
    console.log('Global Admin Credentials:');
    console.log('  Username: globaladmin');
    console.log('  Password: globaladmin123');
    console.log('  Email: global@admin.com');
    console.log('  Role: global_admin');
    console.log('==========================================');
    console.log('');
    console.log('🔗 Access URLs:');
    console.log('  Frontend: http://localhost:5173');
    console.log('  Admin Portal: http://localhost:5173/#/admin');
    console.log('  Global Admin: http://localhost:5173/#/global-admin');

  } catch (error) {
    console.error('❌ Error creating global admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

createGlobalAdmin();