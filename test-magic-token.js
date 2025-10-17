const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a test magic token
const testToken = jwt.sign({
    organizationId: '68d40edb3f526c9f6d719c7f',
    organizationSlug: 'lightwave-ai',
    globalAdminId: 'demo-global-admin-id',
    globalAdminUsername: 'globaladmin',
    targetRole: 'admin',
    magicLogin: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 30) // 30 minutes
}, process.env.JWT_SECRET || 'your-secret-key');

console.log('🪄 Test Magic Token:');
console.log(testToken);
console.log('\n🔍 Token Payload:');
console.log(jwt.decode(testToken));