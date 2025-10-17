const mongoose = require('mongoose');
const User = require('./src/server/models/User');
const Organization = require('./src/server/models/Organization');

require('dotenv').config();

async function assignUsersToOrganization() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get the Lightwave AI organization
        const lightwaveOrg = await Organization.findOne({ slug: 'lightwave-ai' });
        console.log('🏢 Found organization:', lightwaveOrg.name, '- ID:', lightwaveOrg._id);

        // Get users that seem to belong to Lightwave AI (based on email domain)
        const lightwaveUsers = await User.find({
            $or: [
                { email: { $regex: /@lightwave\.ai$/ } },
                { username: { $in: ['agent1', 'SalesAgent', 'TechAgent', 'david_wilson'] } }
            ],
            organizationId: { $exists: false }
        });

        console.log(`\n👥 Found ${lightwaveUsers.length} users to assign to Lightwave AI:`);
        lightwaveUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}`);
        });

        if (lightwaveUsers.length > 0) {
            // Assign these users to the Lightwave AI organization
            const result = await User.updateMany(
                { _id: { $in: lightwaveUsers.map(u => u._id) } },
                { $set: { organizationId: lightwaveOrg._id } }
            );

            console.log(`\n✅ Assigned ${result.modifiedCount} users to Lightwave AI organization`);
        }

        // Get the Test Organization and assign remaining users to it
        const testOrg = await Organization.findOne({ slug: 'test-org' });
        const remainingUsers = await User.find({
            organizationId: { $exists: false },
            role: { $in: ['agent', 'admin'] } // Don't assign guests
        });

        if (remainingUsers.length > 0) {
            console.log(`\n🏢 Assigning ${remainingUsers.length} remaining users to Test Organization:`);
            remainingUsers.forEach(user => {
                console.log(`  - ${user.username} (${user.email}) - Role: ${user.role}`);
            });

            const result2 = await User.updateMany(
                { _id: { $in: remainingUsers.map(u => u._id) } },
                { $set: { organizationId: testOrg._id } }
            );

            console.log(`✅ Assigned ${result2.modifiedCount} users to Test Organization`);
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

assignUsersToOrganization();