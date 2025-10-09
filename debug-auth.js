// Debug script to check token and user details
async function debugAuth() {
  try {
    // Login first
    const loginResponse = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'globaladmin',
        password: 'globaladmin123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }
    
    const token = loginData.token;
    
    // Now test the profile endpoint to see if auth works
    console.log('\n🔍 Testing profile endpoint...');
    const profileResponse = await fetch('http://localhost:3000/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const profileData = await profileResponse.json();
    console.log('Profile response:', profileData);
    
    // Test organizations endpoint with debug
    console.log('\n🔍 Testing organizations endpoint...');
    const orgResponse = await fetch('http://localhost:3000/api/global-admin/organizations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const orgData = await orgResponse.json();
    console.log('Organizations response:', orgData);
    console.log('Response status:', orgResponse.status);
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugAuth();