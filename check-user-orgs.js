const mongoose = require('mongoose');
const User = require('./src/server/models/User');
const Organization = require('./src/server/models/Organization');

require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check organizations
        const organizations = await Organization.find({});
        console.log('\n🏢 Organizations in database:');
        organizations.forEach(org => {
            console.log(`  - ${org.name} (${org.slug}) - ID: ${org._id}`);
        });

        // Check users
        const allUsers = await User.find({});
        console.log(`\n👥 Total users in database: ${allUsers.length}`);
        
        // Check users by organization
        const targetOrgId = '68d40edb3f526c9f6d719c7f';
        const orgUsers = await User.find({ organizationId: targetOrgId });
        console.log(`\n🎯 Users for organization ${targetOrgId}: ${orgUsers.length}`);
        
        if (orgUsers.length > 0) {
            console.log('   Users:');
            orgUsers.forEach(user => {
                console.log(`   - ${user.username} (${user.email}) - Role: ${user.role}`);
            });
        }

        // Check users without organizationId
        const usersWithoutOrg = await User.find({ organizationId: { $exists: false } });
        console.log(`\n❓ Users without organizationId: ${usersWithoutOrg.length}`);
        
        if (usersWithoutOrg.length > 0) {
            console.log('   Users:');
            usersWithoutOrg.forEach(user => {
                console.log(`   - ${user.username} (${user.email}) - Role: ${user.role}`);
            });
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();