#!/usr/bin/env node

/**
 * Quick Global Admin Reset Script
 * 
 * Fast reset for development - creates a single global admin user
 * Usage: node quick-admin-reset.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function quickReset() {
    console.log('🔄 Quick Global Admin Reset...');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
        
        // Import User model
        const User = require('./src/server/models/User');
        
        // Remove existing global admin (by email and username)
        await User.deleteMany({ 
            $or: [
                { email: 'global@convoai.com' },
                { username: 'globaladmin' }
            ]
        });
        console.log('🧹 Cleared existing global admin');
        
        // Create new global admin
        const hashedPassword = await bcrypt.hash('ConvoAI2025!', 10);
        const globalAdmin = new User({
            username: 'globaladmin',
            email: 'global@convoai.com',
            password: hashedPassword,
            role: 'global_admin',
            isActive: true,
            departments: ['general', 'sales', 'technical', 'support', 'billing'], // All valid departments
            profile: {
                firstName: 'Global',
                lastName: 'Admin',
                bio: 'Global Administrator'
            },
            permissions: {
                canManageOrganizations: true,
                canManageDepartments: true,
                canManageUsers: true,
                canViewAnalytics: true
            }
        });
        
        await globalAdmin.save();
        
        console.log('✅ Global Admin Reset Complete!');
        console.log('📧 Email: global@convoai.com');
        console.log('🔑 Password: ConvoAI2025!');
        console.log('🌐 Login: http://localhost:3000/admin-login');
        
    } catch (error) {
        console.error('❌ Reset failed:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

quickReset();