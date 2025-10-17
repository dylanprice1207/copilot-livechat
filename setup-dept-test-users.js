const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Basic User model (avoiding import issues)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['customer', 'agent', 'admin', 'super_admin', 'global_admin'],
        default: 'customer'
    },
    isOnline: { type: Boolean, default: false },
    departments: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

require('dotenv').config();

async function createTestUsers() {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.model('User', userSchema);

        // Create test users
        const testUsers = [
            {
                username: 'sarah_johnson',
                email: 'sarah@lightwave.ai',
                role: 'agent',
                isOnline: true,
                departments: []
            },
            {
                username: 'mike_chen',
                email: 'mike@lightwave.ai',
                role: 'agent',
                isOnline: false,
                departments: []
            },
            {
                username: 'lisa_garcia',
                email: 'lisa@lightwave.ai',
                role: 'agent',
                isOnline: true,
                departments: []
            },
            {
                username: 'david_wilson',
                email: 'david@lightwave.ai',
                role: 'admin',
                isOnline: true,
                departments: []
            },
            {
                username: 'emily_brown',
                email: 'emily@lightwave.ai',
                role: 'agent',
                isOnline: false,
                departments: []
            }
        ];

        console.log('👥 Creating test users...');
        
        for (const userData of testUsers) {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ 
                    $or: [{ username: userData.username }, { email: userData.email }]
                });
                
                if (existingUser) {
                    console.log(`⚠️  User ${userData.username} already exists, skipping...`);
                    continue;
                }

                // Hash password
                const hashedPassword = await bcrypt.hash('testpass123', 12);
                
                // Create user
                const user = new User({
                    ...userData,
                    password: hashedPassword
                });
                
                await user.save();
                console.log(`✅ Created user: ${userData.username} (${userData.role})`);
                
            } catch (error) {
                console.error(`❌ Error creating user ${userData.username}:`, error.message);
            }
        }

        console.log('\n🎉 Test users creation completed!');
        console.log('\n📋 Available test users for department assignment:');
        console.log('- sarah_johnson (Agent, Online)');
        console.log('- mike_chen (Agent, Offline)');
        console.log('- lisa_garcia (Agent, Online)');
        console.log('- david_wilson (Admin, Online)');
        console.log('- emily_brown (Agent, Offline)');
        console.log('\nYou can now test the department assignment functionality in the admin dashboard!');

    } catch (error) {
        console.error('❌ Error creating test users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

createTestUsers();