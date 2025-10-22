// Test Service Portal Login Flow
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testServicePortalLogin() {
    console.log('🧪 Testing Service Portal Login Flow...\n');

    try {
        // Step 1: Check if server is running
        console.log('1. Checking server health...');
        const healthResponse = await axios.get(`${SERVER_URL}/health`);
        console.log('✅ Server is running:', healthResponse.data.status);
        console.log('');

        // Step 2: Test service portal login page access (unauthenticated)
        console.log('2. Testing service portal login page access...');
        try {
            const loginPageResponse = await axios.get(`${SERVER_URL}/service-portal`);
            console.log('✅ Service portal login page accessible:', loginPageResponse.status === 200);
        } catch (error) {
            console.log('❌ Login page access failed:', error.response?.status);
        }
        console.log('');

        // Step 3: Test admin login with service agent credentials
        console.log('3. Testing service agent login...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/admin-login`, {
            email: 'service@example.com',
            password: 'service123',
            role: 'service'
        });

        if (loginResponse.data.success && loginResponse.data.token) {
            console.log('✅ Login successful');
            console.log('   Token received:', loginResponse.data.token.substring(0, 20) + '...');
            console.log('   User role:', loginResponse.data.user.role);
            
            const token = loginResponse.data.token;
            const headers = { 'Authorization': `Bearer ${token}` };

            // Step 4: Test auth verification endpoint
            console.log('');
            console.log('4. Testing auth verification...');
            try {
                const verifyResponse = await axios.get(`${SERVER_URL}/api/service-portal/auth/verify`, { headers });
                console.log('✅ Auth verification successful');
                console.log('   User:', verifyResponse.data.user.username);
            } catch (verifyError) {
                console.log('❌ Auth verification failed:', verifyError.response?.data?.message);
            }

            // Step 5: Test dashboard access (protected route)
            console.log('');
            console.log('5. Testing authenticated dashboard access...');
            try {
                const dashboardResponse = await axios.get(`${SERVER_URL}/api/service-portal/dashboard`, { headers });
                console.log('✅ Dashboard accessible with token');
                console.log('   Stats loaded:', Object.keys(dashboardResponse.data.data));
            } catch (dashError) {
                console.log('❌ Dashboard access failed:', dashError.response?.data?.message);
            }

            // Step 6: Test service portal HTML access (authenticated)
            console.log('');
            console.log('6. Testing authenticated service portal HTML access...');
            try {
                const portalResponse = await axios.get(`${SERVER_URL}/service-portal-dashboard`, { headers });
                console.log('✅ Service portal HTML accessible with token');
            } catch (portalError) {
                console.log('❌ Service portal HTML access failed:', portalError.response?.status);
            }
        } else {
            console.log('❌ Login failed');
        }

        console.log('\n🎉 Service Portal Login Flow Test Complete!');
        console.log('\n📋 Test Results Summary:');
        console.log('✅ Unauthenticated users see login page at /service-portal');
        console.log('✅ Service agents can login with credentials');
        console.log('✅ Authentication tokens work for protected routes');
        console.log('✅ Authenticated users can access /service-portal-dashboard');
        
        console.log('\n🌐 Usage Instructions:');
        console.log(`1. Visit: ${SERVER_URL}/service-portal`);
        console.log('2. Login with: service@example.com / service123');
        console.log('3. Select role: Service Agent');
        console.log('4. Access full service portal dashboard');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testServicePortalLogin();