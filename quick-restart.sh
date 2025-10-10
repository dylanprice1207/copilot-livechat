#!/bin/bash
echo "⚡ ConvoAI Quick Restart"
echo "====================="

# Quick restart for when ConvoAI is running but having issues

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Not in ConvoAI directory. Please navigate to your ConvoAI project folder."
    exit 1
fi

echo "🔄 Restarting ConvoAI Live Chat System..."

# Stop current processes
pm2 restart convoai 2>/dev/null || {
    echo "PM2 restart failed, doing manual restart..."
    pm2 delete convoai 2>/dev/null || true
    sleep 2
    pm2 start server.js --name convoai
}

# Wait and test
echo "⏳ Waiting for restart..."
sleep 5

# Test backend
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
if [ "$RESPONSE" = "200" ]; then
    echo "✅ ConvoAI restarted successfully!"
    echo "🌐 Test: https://convoai.space"
else
    echo "❌ Restart failed. Response code: $RESPONSE"
    echo "📋 Recent logs:"
    pm2 logs convoai --lines 10
fi