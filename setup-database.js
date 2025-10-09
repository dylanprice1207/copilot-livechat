// Simple test to create a Lightwave organization directly in the database
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Organization = require('./src/server/models/Organization');
const Department = require('./src/server/models/Department');
const User = require('./src/server/models/User');

async function setupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/live-chat-system');
    console.log('Connected to MongoDB');

    // Check if we already have organizations
    const existingOrgs = await Organization.find();
    console.log(`Found ${existingOrgs.length} existing organizations`);

    if (existingOrgs.length > 0) {
      console.log('Existing organizations:');
      existingOrgs.forEach(org => {
        console.log(`- ${org.name} (${org._id})`);
      });
    }

    // Find the global admin user
    const globalAdmin = await User.findOne({ role: 'global_admin' });
    if (!globalAdmin) {
      console.log('❌ No global admin found!');
      return;
    }

    console.log(`✅ Found global admin: ${globalAdmin.username}`);

    // Create Lightwave organization if it doesn't exist
    let lightwaveOrg = await Organization.findOne({ name: 'Lightwave AI' });
    
    if (!lightwaveOrg) {
      console.log('🏢 Creating Lightwave AI organization...');
      
      lightwaveOrg = new Organization({
        name: 'Lightwave AI',
        slug: 'lightwave-ai',
        description: 'Advanced AI-powered customer support and live chat solutions',
        adminId: globalAdmin._id,
        isActive: true,
        settings: {
          allowGuestChat: true,
          maxConcurrentChats: 50,
          autoAssignment: true,
          businessHours: {
            enabled: true,
            timezone: 'America/New_York',
            schedule: {
              monday: { start: '09:00', end: '17:00' },
              tuesday: { start: '09:00', end: '17:00' },
              wednesday: { start: '09:00', end: '17:00' },
              thursday: { start: '09:00', end: '17:00' },
              friday: { start: '09:00', end: '17:00' }
            }
          }
        },
        branding: {
          primaryColor: '#667eea',
          secondaryColor: '#764ba2',
          logo: '/logos/lightwave.png',
          companyName: 'Lightwave AI'
        }
      });

      await lightwaveOrg.save();
      console.log('✅ Lightwave AI organization created!');

      // Create default departments
      const departments = [
        { 
          name: 'General Support', 
          slug: 'general-support',
          description: 'General customer inquiries' 
        },
        { 
          name: 'Technical Support', 
          slug: 'technical-support',
          description: 'Technical issues and troubleshooting' 
        },
        { 
          name: 'Sales', 
          slug: 'sales',
          description: 'Sales inquiries and product information' 
        },
        { 
          name: 'Billing', 
          slug: 'billing',
          description: 'Billing and payment support' 
        }
      ];

      for (const deptData of departments) {
        const dept = new Department({
          ...deptData,
          organizationId: lightwaveOrg._id,
          autoAssignment: { 
            enabled: true, 
            strategy: 'round-robin' // Fixed: use hyphen instead of underscore
          }
        });
        await dept.save();
        console.log(`✅ Created department: ${dept.name}`);
      }
    } else {
      console.log('✅ Lightwave AI organization already exists');
    }

    // Final summary
    const finalOrgs = await Organization.find().populate('adminId', 'username');
    console.log('\n📊 All Organizations:');
    finalOrgs.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name}`);
      console.log(`   - Admin: ${org.adminId?.username || 'No admin'}`);
      console.log(`   - Active: ${org.isActive}`);
      console.log(`   - ID: ${org._id}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

setupDatabase();