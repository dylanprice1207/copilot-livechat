// Test Service Portal Access
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testServicePortal() {
    console.log('🧪 Testing Service Portal Access...\n');

    try {
        // Step 1: Check if server is running
        console.log('1. Testing server health...');
        const healthResponse = await axios.get(`${SERVER_URL}/health`);
        console.log('✅ Server is running:', healthResponse.data.status);
        console.log('✅ Database status:', healthResponse.data.database?.status);
        console.log('');

        // Step 2: Test login with existing users
        console.log('2. Trying to find existing service agent...');
        
        // Try some common credentials that might exist
        const testCredentials = [
            { email: 'service@example.com', password: 'service123', role: 'service' },
            { email: 'admin@convoai.com', password: 'admin123', role: 'admin' },
            { email: 'demo@example.com', password: 'demo123', role: 'service' },
            { email: 'test@example.com', password: 'test123', role: 'service' }
        ];

        let authToken = null;
        let userData = null;

        for (const creds of testCredentials) {
            try {
                console.log(`   Trying ${creds.email}...`);
                const loginResponse = await axios.post(`${SERVER_URL}/api/admin-login`, creds);
                
                if (loginResponse.data.token) {
                    authToken = loginResponse.data.token;
                    userData = loginResponse.data.user;
                    console.log(`✅ Login successful with ${creds.email}`);
                    console.log(`   Role: ${userData.role}`);
                    break;
                }
            } catch (error) {
                console.log(`   ❌ Failed: ${error.response?.data?.message || error.message}`);
            }
        }

        if (!authToken) {
            console.log('❌ No valid credentials found.');
            console.log('ℹ️  Note: Admin login is required for service portal access.');
            return;
        }

        console.log('\n3. Testing Service Portal Access...');
        
        // Test service portal HTML access
        try {
            const portalResponse = await axios.get(`${SERVER_URL}/service-portal`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Service Portal HTML accessible');
        } catch (htmlError) {
            console.log('❌ Service Portal HTML access failed:', htmlError.response?.status, htmlError.response?.data);
        }

        // Test service portal API endpoints
        console.log('\n4. Testing Service Portal API...');
        
        try {
            // Test dashboard endpoint
            const dashboardResponse = await axios.get(`${SERVER_URL}/api/service-portal/dashboard`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Dashboard API working:', Object.keys(dashboardResponse.data));
        } catch (apiError) {
            console.log('❌ Dashboard API failed:', apiError.response?.status, apiError.response?.data);
        }

        try {
            // Test organizations endpoint
            const orgsResponse = await axios.get(`${SERVER_URL}/api/service-portal/organizations`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Organizations API working, found:', orgsResponse.data.data?.length || 0, 'organizations');
        } catch (orgsError) {
            console.log('❌ Organizations API failed:', orgsError.response?.status, orgsError.response?.data);
        }

        try {
            // Test plans endpoint
            const plansResponse = await axios.get(`${SERVER_URL}/api/service-portal/plans`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            console.log('✅ Plans API working, found:', plansResponse.data.data?.length || 0, 'plans');
        } catch (plansError) {
            console.log('❌ Plans API failed:', plansError.response?.status, plansError.response?.data);
        }

        console.log('\n🎉 Service Portal Test Complete!');
        console.log('\n📋 Access Instructions:');
        console.log(`   1. Login at: ${SERVER_URL}/login`);
        console.log(`   2. Use credentials: ${userData.email} / service123`);
        console.log(`   3. Access portal: ${SERVER_URL}/service-portal`);
        console.log(`   4. Role required: service_agent or global_admin`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testServicePortal();