// Simple test for organization creation
const fetch = require('node-fetch');

async function simpleTest() {
  try {
    // 1. Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'global@convoai.com',
        password: 'global123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    // 2. Create organization
    console.log('🏢 Creating organization...');
    const createResponse = await fetch('http://localhost:3000/api/global-admin/organizations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        name: `Simple Test Org ${Date.now()}`,
        description: 'Test organization created by simple test'
      })
    });
    
    console.log(`Response status: ${createResponse.status}`);
    const responseText = await createResponse.text();
    console.log(`Response: ${responseText}`);
    
    if (createResponse.ok) {
      console.log('✅ Organization created successfully!');
    } else {
      console.log('❌ Organization creation failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleTest();