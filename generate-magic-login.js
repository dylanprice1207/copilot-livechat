const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Organization = require('./src/server/models/Organization');

require('dotenv').config();

async function generateMagicLogin() {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find an existing organization or create one
        let organization = await Organization.findOne();
        
        if (!organization) {
            console.log('📋 No organization found, creating test organization...');
            organization = await Organization.create({
                name: 'Test Organization',
                slug: 'test-org',
                domain: 'test.local',
                settings: {
                    allowRegistration: true,
                    maxAgents: 50
                }
            });
            console.log('✅ Created test organization:', organization.name);
        } else {
            console.log('✅ Found existing organization:', organization.name);
        }

        // Generate magic login token
        const magicToken = jwt.sign({
            organizationId: organization._id,
            organizationSlug: organization.slug,
            globalAdminId: 'demo-global-admin-id',
            globalAdminUsername: 'globaladmin',
            targetRole: 'admin',
            magicLogin: true,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 30) // 30 minutes
        }, process.env.JWT_SECRET || 'your-secret-key');

        const magicUrl = `http://localhost:3000/org-admin.html?magic_token=${magicToken}`;
        
        console.log('\n🪄 Magic Login URL Generated:');
        console.log('=====================================');
        console.log(magicUrl);
        console.log('=====================================');
        console.log('\n📋 Organization Details:');
        console.log(`  ID: ${organization._id}`);
        console.log(`  Name: ${organization.name}`);
        console.log(`  Slug: ${organization.slug}`);
        console.log('\n⏰ Token expires in 30 minutes');
        console.log('\n🔗 Copy the URL above and paste it in your browser to access the admin dashboard!');

    } catch (error) {
        console.error('❌ Error generating magic login:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

generateMagicLogin();