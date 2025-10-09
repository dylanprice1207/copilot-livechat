const mongoose = require('mongoose');
require('dotenv').config();

async function setupDatabase() {
    try {
        console.log('🔧 Setting up ConvoAI database...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/convoai', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Create indexes for performance
        const db = mongoose.connection.db;
        
        // Users collection indexes
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ role: 1 });
        await db.collection('users').createIndex({ organizationId: 1 });
        
        // Messages collection indexes
        await db.collection('messages').createIndex({ sessionId: 1, timestamp: 1 });
        await db.collection('messages').createIndex({ timestamp: 1 });
        await db.collection('messages').createIndex({ type: 1 });
        
        // Sessions collection indexes
        await db.collection('sessions').createIndex({ customerId: 1 });
        await db.collection('sessions').createIndex({ agentId: 1 });
        await db.collection('sessions').createIndex({ status: 1 });
        await db.collection('sessions').createIndex({ createdAt: 1 });
        await db.collection('sessions').createIndex({ organizationId: 1 });
        
        // Organizations collection indexes
        await db.collection('organizations').createIndex({ name: 1 }, { unique: true });
        await db.collection('organizations').createIndex({ slug: 1 }, { unique: true });
        
        // Knowledge base indexes
        await db.collection('knowledgebase').createIndex({ organizationId: 1 });
        await db.collection('knowledgebase').createIndex({ category: 1 });
        await db.collection('knowledgebase').createIndex({ 
            title: 'text', 
            content: 'text', 
            tags: 'text' 
        });
        
        console.log('✅ Database indexes created');
        
        // Create default organization
        const Organization = require('../src/server/models/Organization');
        const existingOrg = await Organization.findOne({ slug: 'convoai' });
        
        if (!existingOrg) {
            const defaultOrg = new Organization({
                name: 'ConvoAI',
                slug: 'convoai',
                settings: {
                    allowGuests: true,
                    autoAssignment: true,
                    businessHours: {
                        enabled: true,
                        timezone: 'UTC',
                        schedule: {
                            monday: { enabled: true, start: '09:00', end: '17:00' },
                            tuesday: { enabled: true, start: '09:00', end: '17:00' },
                            wednesday: { enabled: true, start: '09:00', end: '17:00' },
                            thursday: { enabled: true, start: '09:00', end: '17:00' },
                            friday: { enabled: true, start: '09:00', end: '17:00' },
                            saturday: { enabled: false, start: '09:00', end: '17:00' },
                            sunday: { enabled: false, start: '09:00', end: '17:00' }
                        }
                    }
                },
                departments: [
                    { name: 'Sales', description: 'Sales inquiries and quotes' },
                    { name: 'Support', description: 'Technical support and help' },
                    { name: 'General', description: 'General inquiries' }
                ]
            });
            
            await defaultOrg.save();
            console.log('✅ Default organization created');
        }
        
        // Create default admin user
        const User = require('../src/server/models/User');
        const bcrypt = require('bcryptjs');
        
        const existingAdmin = await User.findOne({ role: 'super_admin' });
        
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 12);
            
            const adminUser = new User({
                name: 'Super Admin',
                email: 'admin@convoai.com',
                password: hashedPassword,
                role: 'super_admin',
                organizationId: null, // Super admin has access to all orgs
                isActive: true,
                profile: {
                    avatar: null,
                    bio: 'System Administrator'
                }
            });
            
            await adminUser.save();
            console.log('✅ Default admin user created (admin@convoai.com / admin123)');
            console.log('⚠️  Please change the default password after first login!');
        }
        
        console.log('🎉 Database setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;