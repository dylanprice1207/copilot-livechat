// Simple script to create test organizations via API
async function createTestOrganizations() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Login as global admin
    console.log('🔐 Logging in as global admin...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'globaladmin',
        password: 'globaladmin123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginData.message}`);
    }
    
    const token = loginData.token;
    console.log('✅ Login successful');
    
    // Check existing organizations
    console.log('🔍 Checking existing organizations...');
    const orgResponse = await fetch(`${baseUrl}/api/global-admin/organizations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const orgData = await orgResponse.json();
    console.log('📊 Organization response:', orgData);
    
    const existingOrgs = orgData.data || [];
    console.log(`📊 Found ${existingOrgs.length} existing organizations`);
    
    if (existingOrgs.length === 0) {
      // Create Lightwave AI organization
      console.log('🏢 Creating Lightwave AI organization...');
      const createResponse = await fetch(`${baseUrl}/api/global-admin/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Lightwave AI',
          description: 'Advanced AI-powered customer support and live chat solutions',
          primaryColor: '#667eea',
          timezone: 'America/New_York',
          welcomeMessage: 'Welcome to Lightwave AI! How can our intelligent agents assist you today?',
          createAdmin: true,
          adminUsername: 'lightwave-admin',
          adminEmail: 'admin@lightwave.ai',
          adminPassword: 'lightwave123'
        })
      });
      
      const createData = await createResponse.json();
      if (createResponse.ok) {
        console.log('✅ Lightwave AI organization created successfully!');
        console.log(`📋 Organization ID: ${createData.data._id}`);
      } else {
        console.error('❌ Failed to create organization:', createData.message);
      }
      
      // Create a second test organization
      console.log('🏢 Creating TechCorp organization...');
      const createResponse2 = await fetch(`${baseUrl}/api/global-admin/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'TechCorp Solutions',
          description: 'Enterprise technology consulting and support services',
          primaryColor: '#48bb78',
          timezone: 'America/Los_Angeles',
          welcomeMessage: 'Hello from TechCorp! Our experts are here to help.',
          createAdmin: true,
          adminUsername: 'techcorp-admin',
          adminEmail: 'admin@techcorp.com',
          adminPassword: 'techcorp123'
        })
      });
      
      const createData2 = await createResponse2.json();
      if (createResponse2.ok) {
        console.log('✅ TechCorp Solutions organization created successfully!');
        console.log(`📋 Organization ID: ${createData2.data._id}`);
      } else {
        console.error('❌ Failed to create TechCorp organization:', createData2.message);
      }
      
    } else {
      console.log('ℹ️  Organizations already exist, skipping creation');
      existingOrgs.forEach((org, index) => {
        console.log(`${index + 1}. ${org.name} (${org._id})`);
      });
    }
    
    // Final verification
    console.log('\n🔍 Final organization check...');
    const finalResponse = await fetch(`${baseUrl}/api/global-admin/organizations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const finalData = await finalResponse.json();
    console.log(`\n📊 Total organizations: ${finalData.data?.length || 0}`);
    finalData.data?.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name}`);
      console.log(`   - Admin: ${org.adminId?.username || 'N/A'}`);
      console.log(`   - Active: ${org.isActive ? 'Yes' : 'No'}`);
      console.log(`   - Created: ${new Date(org.createdAt).toLocaleDateString()}`);
      console.log('');
    });
    
    console.log('🎉 Setup complete! You can now refresh the frontend to see the organizations.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
createTestOrganizations();