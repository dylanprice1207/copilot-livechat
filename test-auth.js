const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JZCI6IjY4ZDQwZWRiM2Y1MjZjOWY2ZDcxOWM3ZiIsIm9yZ2FuaXphdGlvblNsdWciOiJsaWdodHdhdmUtYWkiLCJnbG9iYWxBZG1pbklkIjoiZGVtby1nbG9iYWwtYWRtaW4taWQiLCJnbG9iYWxBZG1pblVzZXJuYW1lIjoiZ2xvYmFsYWRtaW4iLCJ0YXJnZXRSb2xlIjoiYWRtaW4iLCJtYWdpY0xvZ2luIjp0cnVlLCJpYXQiOjE3NjA3MTI2NzIsImV4cCI6MTc2MDcxNDQ3Mn0.zpM0fyPls9GD6YqP_xCkRLjOdQgxZb_y4-z_ZoZs0cw';

async function testAuth() {
    try {
        console.log('🧪 Testing magic token verification...');
        
        // Test 1: Verify magic token
        const verifyResponse = await fetch('http://localhost:3000/api/verify-magic-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ magicToken: token })
        });
        
        console.log('🔍 Verify response status:', verifyResponse.status);
        const verifyData = await verifyResponse.json();
        console.log('🔍 Verify response data:', verifyData);
        
        if (verifyResponse.ok) {
            console.log('✅ Magic token verification successful');
            
            // Test 2: Try to access admin API with the token
            console.log('🧪 Testing admin API access...');
            const adminResponse = await fetch('http://localhost:3000/api/admin/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Magic-Token': token
                }
            });
            
            console.log('🔍 Admin API response status:', adminResponse.status);
            const adminData = await adminResponse.json();
            console.log('🔍 Admin API response data:', adminData);
            
            if (adminResponse.ok) {
                console.log('✅ Admin API access successful');
            } else {
                console.log('❌ Admin API access failed');
            }
            
        } else {
            console.log('❌ Magic token verification failed');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

testAuth();