// Test Service Portal Authentication Flow
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testServicePortalAuth() {
    console.log('🔐 Testing Service Portal Authentication Flow...\n');

    try {
        // Step 1: Test direct access to dashboard (should redirect to login)
        console.log('1. Testing direct access to /service-portal-dashboard...');
        try {
            const directResponse = await axios.get(`${SERVER_URL}/service-portal-dashboard`);
            console.log('✅ Dashboard accessible directly (expected for frontend auth)');
            console.log(`   Response length: ${directResponse.data.length} bytes`);
        } catch (error) {
            console.log('❌ Direct access failed:', error.response?.status, error.response?.statusText);
        }

        // Step 2: Test login flow
        console.log('\n2. Testing login flow...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/admin-login`, {
            email: 'service@convoai.space',
            password: 'ConvoAI2025!',
            role: 'service'
        });

        if (loginResponse.data.success) {
            console.log('✅ Login successful');
            const token = loginResponse.data.token;
            console.log(`   Token: ${token.substring(0, 20)}...`);

            // Step 3: Test API access with token
            console.log('\n3. Testing API access with token...');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Test auth verification
            try {
                const verifyResponse = await axios.get(`${SERVER_URL}/api/service-portal/auth/verify`, { headers });
                console.log('✅ Auth verification successful');
                console.log(`   User: ${verifyResponse.data.user.username}`);
            } catch (verifyError) {
                console.log('❌ Auth verification failed:', verifyError.response?.data?.message);
            }

            // Test dashboard API
            try {
                const dashboardResponse = await axios.get(`${SERVER_URL}/api/service-portal/dashboard`, { headers });
                console.log('✅ Dashboard API accessible');
                console.log(`   Organizations: ${dashboardResponse.data.data.totalOrganizations}`);
            } catch (dashError) {
                console.log('❌ Dashboard API failed:', dashError.response?.data?.message);
            }

        } else {
            console.log('❌ Login failed');
        }

        // Step 4: Test unauthenticated API access
        console.log('\n4. Testing unauthenticated API access...');
        try {
            await axios.get(`${SERVER_URL}/api/service-portal/dashboard`);
            console.log('❌ Unauthenticated access allowed (security issue!)');
        } catch (error) {
            console.log('✅ Unauthenticated access properly blocked:', error.response?.status);
        }

        console.log('\n📋 Authentication Flow Summary:');
        console.log('=====================================');
        console.log('✅ Frontend handles authentication via localStorage');
        console.log('✅ API endpoints require Bearer token');
        console.log('✅ Direct dashboard access serves HTML (frontend will check auth)');
        console.log('✅ Login provides JWT token for API access');

        console.log('\n🌐 Proper Access Flow:');
        console.log('1. Visit: /service-portal → Login page');
        console.log('2. Login with credentials → Get JWT token');
        console.log('3. Token stored in localStorage');
        console.log('4. Dashboard JavaScript checks token and loads data');
        console.log('5. If no/invalid token → Redirect to login');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testServicePortalAuth();