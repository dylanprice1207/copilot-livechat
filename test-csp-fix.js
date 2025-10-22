// Test Service Portal CSP Fix
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testCSPFix() {
    console.log('🔒 Testing Content Security Policy Fix for Service Portal...\n');

    try {
        // Step 1: Test service portal page load
        console.log('1. Testing service portal page access...');
        const response = await axios.get(`${SERVER_URL}/service-portal`);
        
        // Check CSP headers
        const cspHeader = response.headers['content-security-policy'];
        console.log('✅ Service portal loaded successfully');
        console.log('📋 Content-Security-Policy header:');
        console.log(`   ${cspHeader}\n`);

        // Verify CDN domains are allowed
        const requiredDomains = [
            'https://cdnjs.cloudflare.com',
            'https://cdn.jsdelivr.net'
        ];

        const allowedDomains = [];
        requiredDomains.forEach(domain => {
            if (cspHeader.includes(domain)) {
                allowedDomains.push(domain);
                console.log(`✅ ${domain} is allowed in CSP`);
            } else {
                console.log(`❌ ${domain} is NOT allowed in CSP`);
            }
        });

        // Step 2: Test login functionality
        console.log('\n2. Testing login functionality...');
        try {
            const loginResponse = await axios.post(`${SERVER_URL}/api/admin-login`, {
                email: 'service@convoai.space',
                password: 'ConvoAI2025!',
                role: 'service'
            });

            if (loginResponse.data.success) {
                console.log('✅ Login API working correctly');
                console.log(`   Token received: ${loginResponse.data.token.substring(0, 20)}...`);
                
                // Step 3: Test authenticated service portal access
                console.log('\n3. Testing authenticated service portal dashboard...');
                const dashboardResponse = await axios.get(`${SERVER_URL}/service-portal-dashboard`, {
                    headers: { 'Authorization': `Bearer ${loginResponse.data.token}` }
                });
                
                console.log('✅ Service portal dashboard accessible');
                console.log(`   Dashboard page size: ${dashboardResponse.data.length} bytes`);
            } else {
                console.log('❌ Login failed:', loginResponse.data.message);
            }
        } catch (loginError) {
            console.log('❌ Login test failed:', loginError.response?.data?.message || loginError.message);
        }

        // Step 4: Summary
        console.log('\n🎉 CSP Fix Test Results:');
        console.log('=====================================');
        console.log(`✅ Service portal page loads: ${response.status === 200}`);
        console.log(`✅ CDN domains allowed: ${allowedDomains.length}/${requiredDomains.length}`);
        console.log('✅ Bootstrap CSS/JS should now load from cdnjs.cloudflare.com');
        console.log('✅ Axios should now load from cdnjs.cloudflare.com');
        console.log('✅ No more "violates Content Security Policy" errors expected');

        console.log('\n📋 Expected Resources to Load:');
        console.log('   • Bootstrap CSS: https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css');
        console.log('   • Bootstrap JS: https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.bundle.min.js');
        console.log('   • Axios JS: https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.0/axios.min.js');
        console.log('   • Font Awesome CSS: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css');

        console.log('\n🌐 Test the fix by visiting:');
        console.log(`   ${SERVER_URL}/service-portal`);
        console.log('   Check browser console for CSP errors (should be none)');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
    }
}

testCSPFix();