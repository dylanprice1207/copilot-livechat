#!/bin/bash
echo "🔍 ConvoAI 502 Error Diagnosis"
echo "============================="

# Check if backend is running on port 3000
echo "1. 🚀 Checking ConvoAI backend service..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend responding on port 3000"
    curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "❌ Backend not responding (HTTP: $BACKEND_STATUS)"
    
    # Check what's using port 3000
    echo "🔍 Checking port 3000 usage..."
    sudo lsof -i :3000 || echo "No process on port 3000"
    
    # Check for any node processes
    echo "🔍 Looking for node processes..."
    ps aux | grep -i node | grep -v grep || echo "No node processes found"
fi

# Check PM2 status
echo ""
echo "2. 📊 Checking PM2 processes..."
if command -v pm2 > /dev/null; then
    pm2 status
    echo "📋 ConvoAI logs (last 10 lines):"
    pm2 logs convoai --lines 10 2>/dev/null || echo "No ConvoAI process in PM2"
else
    echo "⚠️ PM2 not installed"
fi

# Check Nginx status and config
echo ""
echo "3. 🌐 Checking Nginx..."
sudo systemctl status nginx --no-pager -l | head -20
echo ""
echo "📋 Testing Nginx configuration..."
sudo nginx -t

# Check if server.js exists and is valid
echo ""
echo "4. 📄 Checking ConvoAI server files..."
if [ -f "server.js" ]; then
    echo "✅ server.js exists"
    # Check for syntax errors
    node --check server.js 2>/dev/null && echo "✅ server.js syntax OK" || echo "❌ server.js has syntax errors"
else
    echo "❌ server.js not found"
fi

# Check environment file
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "📋 Key environment variables:"
    grep -E "^(PORT|MONGODB_URI|NODE_ENV)" .env 2>/dev/null || echo "No key variables found"
else
    echo "⚠️ .env file not found"
fi

# Check database connectivity
echo ""
echo "5. 📊 Testing MongoDB connection..."
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.log('❌ No MONGODB_URI in environment');
    process.exit(1);
}
console.log('🔗 Testing MongoDB connection...');
mongoose.connect(uri, { 
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000 
}).then(() => {
    console.log('✅ MongoDB connection successful');
    mongoose.disconnect();
    process.exit(0);
}).catch(err => {
    console.log('❌ MongoDB connection failed:', err.message);
    process.exit(1);
});
" 2>/dev/null || echo "❌ Cannot test MongoDB connection"

echo ""
echo "🎯 DIAGNOSIS SUMMARY"
echo "==================="
echo "Backend Status: $([ "$BACKEND_STATUS" = "200" ] && echo "✅ Running" || echo "❌ Down - This is the problem!")"
echo "Nginx Status: $(sudo systemctl is-active nginx 2>/dev/null)"
echo ""
if [ "$BACKEND_STATUS" != "200" ]; then
    echo "🚨 SOLUTION: Your ConvoAI backend server is not running!"
    echo "Run: ./fix-502-error.sh to automatically fix this"
else
    echo "ℹ️ Backend is running but still getting 502? Check Nginx proxy configuration"
fi