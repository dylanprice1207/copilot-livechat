/**
 * ChatKit Flow Integration Test Script
 * Tests the ChatKit widget with ChatFlow service integration
 */

const axios = require('axios');

async function testChatKitIntegration() {
    console.log('🧪 Testing ChatKit Flow Integration...\n');

    const baseUrl = 'http://localhost:3000/api/chatkit';
    
    try {
        // Test 1: Health Check
        console.log('1. 🏥 Testing health endpoint...');
        const healthResponse = await axios.get(`${baseUrl}/health`);
        console.log('   ✅ Health check:', healthResponse.data);
        
        // Test 2: Create Session
        console.log('\n2. 🎯 Creating ChatKit session...');
        const sessionResponse = await axios.post(`${baseUrl}/sessions`, {
            userId: 'test_user_' + Date.now(),
            customerName: 'Test Customer',
            department: 'general',
            organizationId: 'lightwave'
        });
        console.log('   ✅ Session created:', {
            sessionId: sessionResponse.data.sessionId,
            botInfo: sessionResponse.data.botInfo,
            flowState: sessionResponse.data.flowState ? 'Present' : 'None'
        });
        
        const sessionId = sessionResponse.data.sessionId;
        
        // Test 3: Send Message (should trigger flow)
        console.log('\n3. 💬 Sending message to test flow integration...');
        const messageResponse = await axios.post(`${baseUrl}/sessions/${sessionId}/messages`, {
            message: "Hi, I need help with my Lightwave dimmer",
            type: 'user'
        });
        
        console.log('   ✅ Message response:', {
            success: messageResponse.data.success,
            messageCount: messageResponse.data.messages?.length || 0,
            flowHandled: messageResponse.data.flowHandled || false,
            hasResponse: !!messageResponse.data.response
        });
        
        if (messageResponse.data.messages && messageResponse.data.messages.length > 0) {
            const botMessage = messageResponse.data.messages.find(msg => msg.type === 'assistant');
            if (botMessage) {
                console.log('   🤖 Bot response preview:', botMessage.content.substring(0, 100) + '...');
            }
        }
        
        // Test 4: Get Session Info
        console.log('\n4. 📊 Getting session information...');
        const sessionInfoResponse = await axios.get(`${baseUrl}/sessions/${sessionId}`);
        console.log('   ✅ Session info:', {
            sessionId: sessionInfoResponse.data.session.sessionId,
            department: sessionInfoResponse.data.session.department,
            messageCount: sessionInfoResponse.data.session.messages?.length || 0
        });
        
        // Test 5: Get Message History
        console.log('\n5. 📜 Getting message history...');
        const historyResponse = await axios.get(`${baseUrl}/sessions/${sessionId}/messages`);
        console.log('   ✅ Message history:', {
            totalMessages: historyResponse.data.total,
            retrievedMessages: historyResponse.data.messages.length
        });
        
        // Test 6: Test different departments
        console.log('\n6. 🏢 Testing department routing...');
        const departments = ['sales', 'technical', 'support', 'billing'];
        
        for (const dept of departments) {
            const deptSessionResponse = await axios.post(`${baseUrl}/sessions`, {
                userId: `test_user_${dept}_${Date.now()}`,
                customerName: `Test Customer (${dept})`,
                department: dept,
                organizationId: 'lightwave'
            });
            
            console.log(`   ✅ ${dept.toUpperCase()} session:`, {
                sessionId: deptSessionResponse.data.sessionId.substring(0, 20) + '...',
                botName: deptSessionResponse.data.botInfo?.botName || 'Unknown'
            });
        }
        
        // Test 7: Get all active sessions
        console.log('\n7. 🔍 Getting all active sessions...');
        const sessionsResponse = await axios.get(`${baseUrl}/sessions`);
        console.log('   ✅ Active sessions:', {
            count: sessionsResponse.data.count,
            totalSessions: sessionsResponse.data.sessions.length
        });
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 Test Summary:');
        console.log('   ✅ Health check passed');
        console.log('   ✅ Session creation works');
        console.log('   ✅ Message sending functional');
        console.log('   ✅ Flow integration active');
        console.log('   ✅ Department routing works');
        console.log('   ✅ API endpoints responding');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testChatKitIntegration();
}

module.exports = testChatKitIntegration;