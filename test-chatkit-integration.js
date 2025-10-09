const http = require('http');

// Test the ChatKit API endpoints
async function testChatKitAPI() {
    console.log('🧪 Testing ChatKit API Integration...\n');

    // Test 1: Health Check
    console.log('1️⃣ Testing Health Endpoint...');
    try {
        const healthResponse = await makeRequest('/api/chatkit/health');
        console.log('✅ Health Check:', healthResponse);
    } catch (error) {
        console.log('❌ Health Check Failed:', error.message);
    }

    // Test 2: Create Session
    console.log('\n2️⃣ Testing Session Creation...');
    try {
        const sessionData = {
            userId: 'test-user-123',
            customerName: 'Test Customer',
            department: 'sales',
            organizationId: 'lightwave'
        };

        const sessionResponse = await makeRequest('/api/chatkit/sessions', 'POST', sessionData);
        console.log('✅ Session Created:', sessionResponse);

        if (sessionResponse.session?.sessionId) {
            const sessionId = sessionResponse.session.sessionId;

            // Test 3: Send Message
            console.log('\n3️⃣ Testing Message Sending...');
            const messageData = {
                message: 'Hello, I need help with billing',
                type: 'user'
            };

            const messageResponse = await makeRequest(`/api/chatkit/sessions/${sessionId}/messages`, 'POST', messageData);
            console.log('✅ Message Sent:', messageResponse);

            // Test 4: Get Session Info
            console.log('\n4️⃣ Testing Session Info...');
            const sessionInfo = await makeRequest(`/api/chatkit/sessions/${sessionId}`);
            console.log('✅ Session Info:', sessionInfo);

            // Test 5: Get Message History
            console.log('\n5️⃣ Testing Message History...');
            const historyResponse = await makeRequest(`/api/chatkit/sessions/${sessionId}/messages`);
            console.log('✅ Message History:', historyResponse);
        }

    } catch (error) {
        console.log('❌ Session Test Failed:', error.message);
    }

    console.log('\n🎉 ChatKit API tests completed!');
}

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    resolve(jsonData);
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Run the tests
testChatKitAPI().catch(console.error);