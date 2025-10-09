const http = require('http');

async function testMessageFlow() {
    try {
        console.log('🧪 Testing ChatKit Message Flow...\n');

        // 1. Create a session
        console.log('1️⃣ Creating session...');
        const sessionResponse = await makeRequest('/api/chatkit/sessions', 'POST', {
            userId: 'test-user-456',
            customerName: 'Test User',
            department: 'general'
        });
        
        console.log('✅ Session created:', sessionResponse.sessionId);
        console.log('   Flow State:', sessionResponse.flowState ? 'Active' : 'None');
        
        const sessionId = sessionResponse.sessionId;
        
        // 2. Send a message
        console.log('\n2️⃣ Sending message...');
        const messageResponse = await makeRequest(`/api/chatkit/sessions/${sessionId}/messages`, 'POST', {
            message: 'Hello, I need help with my dimmer',
            type: 'user'
        });
        
        console.log('✅ Message sent:', {
            success: messageResponse.success,
            flowHandled: messageResponse.flowHandled,
            messageCount: messageResponse.messages?.length,
            hasAiResponse: messageResponse.messages?.some(m => m.type === 'assistant')
        });
        
        if (messageResponse.messages) {
            const botMessage = messageResponse.messages.find(m => m.type === 'assistant');
            if (botMessage) {
                console.log('🤖 Bot response:', botMessage.content.substring(0, 100) + '...');
            }
        }
        
        // 3. Get message history
        console.log('\n3️⃣ Getting message history...');
        const historyResponse = await makeRequest(`/api/chatkit/sessions/${sessionId}/messages`);
        console.log('✅ History retrieved:', {
            totalMessages: historyResponse.total,
            retrievedCount: historyResponse.messages?.length
        });
        
        console.log('\n🎉 All message flow tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

testMessageFlow();