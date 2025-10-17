const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdhbml6YXRpb25JZCI6IjY4ZDQwZWRiM2Y1MjZjOWY2ZDcxOWM3ZiIsIm9yZ2FuaXphdGlvblNsdWciOiJsaWdodHdhdmUtYWkiLCJnbG9iYWxBZG1pbklkIjoiZGVtby1nbG9iYWwtYWRtaW4taWQiLCJnbG9iYWxBZG1pblVzZXJuYW1lIjoiZ2xvYmFsYWRtaW4iLCJ0YXJnZXRSb2xlIjoiYWRtaW4iLCJtYWdpY0xvZ2luIjp0cnVlLCJpYXQiOjE3NjA3MTI0MjcsImV4cCI6MTc2MDcxNDIyN30.jLRS6KUT3qa-gg07GIagACIQVzI6CUU8qwoDx7W6Cz4';

try {
    const decoded = jwt.decode(token);
    const now = Math.floor(Date.now() / 1000);
    
    console.log('🔍 Token payload:', decoded);
    console.log('📅 Current timestamp:', now);
    console.log('📅 Token issued at:', decoded.iat, new Date(decoded.iat * 1000));
    console.log('📅 Token expires at:', decoded.exp, new Date(decoded.exp * 1000));
    console.log('⏰ Token valid?', decoded.exp > now ? 'YES' : 'NO');
    console.log('⏰ Time remaining:', Math.max(0, decoded.exp - now), 'seconds');
} catch (error) {
    console.error('Error decoding token:', error);
}