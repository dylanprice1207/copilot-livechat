const mongoose = require('mongoose');
const Organization = require('./src/server/models/Organization');
const Department = require('./src/server/models/Department');
const User = require('./src/server/models/User');

async function checkAndCreateLightwave() {
  try {
    await mongoose.connect('mongodb://localhost:27017/live-chat-system');
    console.log('Connected to MongoDB');

    // Check existing organizations
    const orgs = await Organization.find();
    console.log('Existing Organizations:', orgs.length);
    orgs.forEach(org => {
      console.log(`- ${org.name} (ID: ${org._id})`);
    });

    // Find the global admin
    const globalAdmin = await User.findOne({ role: 'global_admin' });
    if (!globalAdmin) {
      console.log('No global admin found!');
      return;
    }

    // Check if Lightwave exists
    let lightwave = await Organization.findOne({ name: 'Lightwave AI' });
    
    if (!lightwave) {
      console.log('Creating Lightwave AI organization...');
      
      lightwave = new Organization({
        name: 'Lightwave AI',
        adminId: globalAdmin._id,
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
      
      await lightwave.save();
      console.log('✅ Lightwave AI organization created');

      // Create default departments
      const departments = [
        {
          name: 'General Support',
          organizationId: lightwave._id,
          description: 'General customer inquiries and support',
          autoAssignment: {
            enabled: true,
            strategy: 'round_robin'
          }
        },
        {
          name: 'Technical Support',
          organizationId: lightwave._id,
          description: 'Technical issues and troubleshooting',
          autoAssignment: {
            enabled: true,
            strategy: 'skill_based'
          }
        },
        {
          name: 'Sales',
          organizationId: lightwave._id,
          description: 'Sales inquiries and product information',
          autoAssignment: {
            enabled: true,
            strategy: 'load_balancing'
          }
        },
        {
          name: 'Billing',
          organizationId: lightwave._id,
          description: 'Billing and payment support',
          autoAssignment: {
            enabled: true,
            strategy: 'round_robin'
          }
        }
      ];

      for (const deptData of departments) {
        const dept = new Department(deptData);
        await dept.save();
        console.log(`✅ Created department: ${dept.name}`);
      }
    } else {
      console.log('✅ Lightwave AI organization already exists');
    }

    // Final check
    const finalOrgs = await Organization.find();
    console.log('\n📊 Final Organization List:');
    finalOrgs.forEach(org => {
      console.log(`- ${org.name} (ID: ${org._id})`);
    });

    const departments = await Department.find({ organizationId: lightwave._id });
    console.log(`\n📊 Departments for ${lightwave.name}:`);
    departments.forEach(dept => {
      console.log(`- ${dept.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

checkAndCreateLightwave();