// Complete Magic Login Test
const fetch = require('node-fetch');

async function testMagicLogin() {
  console.log('🧪 Testing Complete Magic Login Flow...\n');
  
  try {
    // 1. Login as global admin
    console.log('1. 🔐 Logging in as global admin...');
    const loginResponse = await fetch('http://localhost:3000/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'global@convoai.com',
        password: 'ConvoAI2025!',
        role: 'admin'
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginResponse.ok) throw new Error('Login failed: ' + loginData.message);
    console.log('✅ Global admin login successful');
    
    // 2. Get organizations
    const orgsResponse = await fetch('http://localhost:3000/api/global-admin/organizations', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    const orgsData = await orgsResponse.json();
    if (!orgsResponse.ok) throw new Error('Failed to get organizations');
    
    const testOrg = orgsData.data[0];
    console.log(`✅ Found test organization: ${testOrg.name} (${testOrg.slug})`);
    
    // 3. Generate magic login token
    console.log('\n2. 🪄 Generating magic login token...');
    const magicResponse = await fetch('http://localhost:3000/api/global-admin/magic-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        organizationId: testOrg._id,
        organizationSlug: testOrg.slug,
        targetRole: 'admin'
      })
    });
    
    const magicData = await magicResponse.json();
    if (!magicResponse.ok) throw new Error('Magic login generation failed: ' + magicData.message);
    console.log('✅ Magic token generated successfully');
    
    // 4. Verify magic token
    console.log('\n3. 🔍 Verifying magic token...');
    const verifyResponse = await fetch('http://localhost:3000/api/verify-magic-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magicToken: magicData.magicToken })
    });
    
    const verifyData = await verifyResponse.json();
    if (!verifyResponse.ok) throw new Error('Magic token verification failed: ' + verifyData.message);
    console.log('✅ Magic token verified successfully');
    console.log(`   Organization: ${verifyData.organization.name}`);
    console.log(`   Global Admin: ${verifyData.globalAdmin.username}`);
    
    // 5. Test organization portal access
    console.log('\n4. 🌐 Testing organization portal access...');
    const portalUrl = `http://localhost:3000/${testOrg.slug}/admin?magic_token=${magicData.magicToken}`;
    const portalResponse = await fetch(portalUrl);
    
    if (!portalResponse.ok) throw new Error('Portal access failed');
    const portalHtml = await portalResponse.text();
    
    if (portalHtml.includes('org-admin.js')) {
      console.log('✅ Organization portal accessible with magic token');
      console.log('✅ JavaScript loaded correctly');
    } else {
      throw new Error('Organization portal missing JavaScript');
    }
    
    console.log('\n🎉 MAGIC LOGIN FULLY FUNCTIONAL! 🎉');
    console.log(`\n🔗 Magic URL: ${portalUrl}`);
    
  } catch (error) {
    console.error('\n❌ Magic login test failed:', error.message);
    process.exit(1);
  }
}

testMagicLogin();