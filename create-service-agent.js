const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

// Connect to MongoDB using the same connection as the server
const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://DylanP:JWebSA3L8o8M1EIo@cluster0.afz799a.mongodb.net/livechat?retryWrites=true&w=majority&ssl=true&serverSelectionTimeoutMS=30000&socketTimeoutMS=45000';

mongoose.connect(mongoUri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
});

// Use the same User schema as the server
const User = require('./src/server/models/User');

async function createServiceAgent() {
    try {
        console.log('🔌 Connecting to database...');
        
        // Check if service agent already exists
        const existingAgent = await User.findOne({ email: 'service@example.com' });
        if (existingAgent) {
            console.log('✅ Service agent already exists:', existingAgent.email);
            console.log('Role:', existingAgent.role);
            console.log('Username:', existingAgent.username);
            return existingAgent;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('service123', 10);

        // Create service agent
        const serviceAgent = new User({
            username: 'service_agent',
            email: 'service@example.com',
            password: hashedPassword,
            role: 'service_agent'
        });

        await serviceAgent.save();
        console.log('✅ Service agent created successfully!');
        console.log('Username: service_agent');
        console.log('Email: service@example.com');
        console.log('Password: service123');
        console.log('Role: service_agent');

        return serviceAgent;
    } catch (error) {
        console.error('❌ Error creating service agent:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

createServiceAgent();