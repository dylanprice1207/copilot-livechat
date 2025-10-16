#!/usr/bin/env node

/**
 * Test Organization Creation API
 * Tests the organization creation functionality
 */

require('dotenv').config();

async function testOrganizationCreation() {
    const baseUrl = 'http://localhost:3000';
    
    try {
        console.log('🧪 Testing Organization Creation API...\n');
        
        // Step 1: Login as global admin
        console.log('1. 🔐 Logging in as global admin...');
        const loginResponse = await fetch(`${baseUrl}/api/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'global@convoai.com',
                password: 'ConvoAI2025!',
                role: 'admin'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginData.message || 'Unknown error'}`);
        }
        
        console.log('✅ Login successful');
        console.log(`   Token: ${loginData.token.substring(0, 20)}...`);
        const token = loginData.token;
        
        // Step 2: Check existing organizations
        console.log('\n2. 📋 Checking existing organizations...');
        const getOrgResponse = await fetch(`${baseUrl}/api/global-admin/organizations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!getOrgResponse.ok) {
            const errorText = await getOrgResponse.text();
            throw new Error(`Get organizations failed: ${getOrgResponse.status} - ${errorText}`);
        }
        
        const orgData = await getOrgResponse.json();
        console.log(`✅ Found ${orgData.data?.length || 0} existing organizations`);
        
        if (orgData.data && orgData.data.length > 0) {
            orgData.data.forEach((org, index) => {
                console.log(`   ${index + 1}. ${org.name} (${org.slug})`);
            });
        }
        
        // Step 3: Create test organization
        console.log('\n3. 🏢 Creating test organization...');
        
        const orgPayload = {
            name: 'Test Organization ' + Date.now(),
            description: 'Test organization created by API test',
            primaryColor: '#4299e1',
            timezone: 'America/New_York',
            welcomeMessage: 'Welcome to our test organization!',
            createAdmin: true,
            adminUsername: 'testadmin' + Date.now(),
            adminEmail: 'testadmin' + Date.now() + '@test.com',
            adminPassword: 'testpassword123'
        };
        
        console.log(`   Name: ${orgPayload.name}`);
        console.log(`   Admin Email: ${orgPayload.adminEmail}`);
        
        const createResponse = await fetch(`${baseUrl}/api/global-admin/organizations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orgPayload)
        });
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            const errorData = JSON.parse(errorText);
            throw new Error(`Create organization failed: ${createResponse.status} - ${errorData.message || errorText}`);
        }
        
        const createData = await createResponse.json();
        console.log('✅ Organization created successfully!');
        console.log(`   ID: ${createData.data._id}`);
        console.log(`   Name: ${createData.data.name}`);
        console.log(`   Slug: ${createData.data.slug}`);
        
        // Step 4: Verify organization was created
        console.log('\n4. ✅ Verifying creation...');
        const verifyResponse = await fetch(`${baseUrl}/api/global-admin/organizations/${createData.data._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log('✅ Organization verification successful');
            console.log(`   Admin: ${verifyData.data.adminId?.email || 'N/A'}`);
            console.log(`   Active: ${verifyData.data.isActive}`);
        }
        
        console.log('\n🎉 Organization creation test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testOrganizationCreation();