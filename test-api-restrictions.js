require('dotenv').config();
const http = require('http');

async function testBrandingAPI() {
    console.log('🧪 Testing ConvoAI Branding API Restrictions...\n');
    
    const testCases = [
        { org: 'test-free', expected: 403, description: 'Free plan (should be blocked)' },
        { org: 'test-pro', expected: 200, description: 'Professional plan (should work)' },
        { org: 'test-inactive', expected: 403, description: 'Inactive plan (should be blocked)' }
    ];
    
    for (const testCase of testCases) {
        try {
            console.log(`Testing ${testCase.description}:`);
            console.log(`URL: http://localhost:3000/api/branding/${testCase.org}/branding`);
            
            const result = await makeRequest(testCase.org);
            
            if (result.statusCode === testCase.expected) {
                console.log(`✅ PASS: Got expected status ${result.statusCode}`);
                
                if (result.statusCode === 403) {
                    const data = JSON.parse(result.data);
                    console.log(`   Reason: ${data.error}`);
                    console.log(`   Current Plan: ${data.currentPlan}`);
                    console.log(`   Status: ${data.subscriptionStatus}`);
                } else if (result.statusCode === 200) {
                    const data = JSON.parse(result.data);
                    console.log(`   Success: ${data.success}`);
                    console.log(`   Branding loaded: ${!!data.branding}`);
                }
            } else {
                console.log(`❌ FAIL: Expected ${testCase.expected}, got ${result.statusCode}`);
                console.log(`   Response: ${result.data}`);
            }
            
        } catch (error) {
            console.log(`❌ ERROR: ${error.message}`);
        }
        
        console.log(''); // Empty line
    }
}

function makeRequest(orgSlug) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/branding/${orgSlug}/branding`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(5000, () => {
            req.abort();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

// Wait a bit for server to start, then run tests
setTimeout(() => {
    testBrandingAPI().then(() => {
        console.log('🎉 Branding API restriction tests completed!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}, 2000);