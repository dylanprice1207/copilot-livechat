#!/usr/bin/env node

/**
 * Quick Service User Creation Script
 * Creates a service agent user quickly with minimal prompts
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

// Use the same User model as the main application
const User = require('./src/server/models/User');

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://DylanP:JWebSA3L8o8M1EIo@cluster0.afz799a.mongodb.net/livechat?retryWrites=true&w=majority&ssl=true&serverSelectionTimeoutMS=30000&socketTimeoutMS=45000';

async function createQuickServiceUser() {
    try {
        console.log('🚀 ConvoAI Quick Service User Creator');
        console.log('=====================================\n');

        // Connect to database
        console.log('🔌 Connecting to database...');
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000
        });
        console.log('✅ Connected to database\n');

        // Default service user configuration
        const serviceUserConfig = {
            username: 'service_admin',
            email: 'service@convoai.space',
            password: 'ConvoAI2025!',
            role: 'service_agent'
        };

        // Check if service user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { email: serviceUserConfig.email },
                { username: serviceUserConfig.username }
            ]
        });

        if (existingUser) {
            console.log('✅ Service user already exists!');
            console.log(`   Email: ${existingUser.email}`);
            console.log(`   Username: ${existingUser.username}`);
            console.log(`   Role: ${existingUser.role}`);
        } else {
            // Hash password
            const hashedPassword = await bcrypt.hash(serviceUserConfig.password, 10);

            // Create service user
            const serviceUser = new User({
                username: serviceUserConfig.username,
                email: serviceUserConfig.email,
                password: hashedPassword,
                role: serviceUserConfig.role
            });

            await serviceUser.save();
            
            console.log('✅ Service user created successfully!');
            console.log(`   Username: ${serviceUserConfig.username}`);
            console.log(`   Email: ${serviceUserConfig.email}`);
            console.log(`   Password: ${serviceUserConfig.password}`);
            console.log(`   Role: ${serviceUserConfig.role}`);
        }

        console.log('\n📋 Service Portal Access:');
        console.log('   URL: http://localhost:3000/service-portal');
        console.log('   OR: https://convoai.space/service-portal');
        console.log(`   Login: ${serviceUserConfig.email}`);
        console.log(`   Password: ${serviceUserConfig.password}`);
        console.log('   Role: Service Agent');

        console.log('\n🎯 Features Available:');
        console.log('   ✅ Create, Edit, Delete Organizations');
        console.log('   ✅ Manage Subscription Plans');
        console.log('   ✅ View Analytics Dashboard');
        console.log('   ✅ Export Data');
        console.log('   ✅ User Management');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from database');
    }
}

// Run the script
if (require.main === module) {
    createQuickServiceUser();
}

module.exports = createQuickServiceUser;