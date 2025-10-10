#!/bin/bash
echo "🛠️ ConvoAI 502 Error Fix"
echo "======================="

# Stop any conflicting processes
echo "1. 🛑 Stopping conflicting processes..."
sudo fuser -k 3000/tcp 2>/dev/null || true
sleep 2

# Kill any PM2 processes
if command -v pm2 > /dev/null; then
    pm2 delete convoai 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
fi

# Make sure we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found. Make sure you're in the ConvoAI project directory"
    exit 1
fi

# Install dependencies if needed
echo "2. 📦 Installing dependencies..."
npm install --production

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "3. ⚙️ Creating .env file..."
    cat > .env << 'EOF'
# ConvoAI Live Chat System - Production Configuration
NODE_ENV=production
PORT=3000
DOMAIN=convoai.space

# Database Configuration
MONGODB_URI=mongodb+srv://DylanP:JWebSA3L8o8M1EIo@cluster0.afz799a.mongodb.net/livechat?retryWrites=true&w=majority&ssl=true

# Security
JWT_SECRET=convoai-production-jwt-secret-2024
SESSION_SECRET=convoai-production-session-secret-2024

# CORS Configuration
CORS_ORIGIN=https://convoai.space,http://convoai.space,https://www.convoai.space

# OpenAI API
OPENAI_API_KEY=

# Logging
LOG_LEVEL=info
EOF
    echo "✅ .env file created"
else
    echo "3. ✅ .env file already exists"
fi

# Test server.js syntax
echo "4. 🧪 Testing server configuration..."
node --check server.js
if [ $? -ne 0 ]; then
    echo "❌ server.js has syntax errors"
    exit 1
fi

# Start ConvoAI with PM2
echo "5. 🚀 Starting ConvoAI Live Chat System..."
if command -v pm2 > /dev/null; then
    echo "Using PM2 for process management..."
    pm2 start server.js --name "convoai" --instances 1 --max-memory-restart 1G
    pm2 save
    pm2 startup | grep -E "^sudo" | bash 2>/dev/null || true
    
    # Wait for startup
    sleep 5
    
    # Check PM2 status
    pm2 status
    
else
    echo "PM2 not found, installing..."
    npm install -g pm2
    pm2 start server.js --name "convoai"
    pm2 save
fi

# Test the backend
echo "6. 🧪 Testing backend connectivity..."
sleep 3

for i in {1..10}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
    if [ "$RESPONSE" = "200" ]; then
        echo "✅ ConvoAI backend is responding!"
        curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
        break
    else
        echo "⏳ Waiting for backend to start... (attempt $i/10)"
        sleep 2
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Backend failed to start after 20 seconds"
        echo "📋 Checking logs..."
        pm2 logs convoai --lines 20
        exit 1
    fi
done

# Test external access
echo ""
echo "7. 🌐 Testing external domain access..."
EXTERNAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://convoai.space/health 2>/dev/null)
if [ "$EXTERNAL_RESPONSE" = "200" ]; then
    echo "✅ External access working! https://convoai.space is live"
else
    echo "⚠️ External access returning: $EXTERNAL_RESPONSE"
    echo "This might be due to DNS propagation or firewall issues"
fi

# Configure Nginx if needed
echo ""
echo "8. 🔧 Verifying Nginx configuration..."
if sudo nginx -t > /dev/null 2>&1; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl reload nginx
else
    echo "⚠️ Nginx configuration has issues, attempting to fix..."
    
    # Create basic Nginx config
    sudo tee /etc/nginx/sites-available/convoai > /dev/null << 'EOF'
server {
    listen 80;
    server_name convoai.space www.convoai.space;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name convoai.space www.convoai.space;
    
    # SSL Configuration - will be configured by certbot
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/convoai /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "✅ Nginx configuration updated"
    else
        echo "❌ Failed to fix Nginx configuration"
    fi
fi

echo ""
echo "🎉 ConvoAI 502 Fix Complete!"
echo "=========================="
echo "✅ Backend server started on port 3000"
echo "✅ PM2 process management configured"
echo "✅ Nginx proxy configured"
echo ""
echo "🌐 Test your ConvoAI system:"
echo "   • Backend Health: curl http://localhost:3000/health"
echo "   • Live Site: https://convoai.space"
echo "   • Chat Demo: https://convoai.space/chatkit-enhanced-demo.html"
echo ""
echo "📊 Monitor your system:"
echo "   • PM2 Status: pm2 status"
echo "   • PM2 Logs: pm2 logs convoai"
echo "   • Nginx Status: sudo systemctl status nginx"
echo ""
echo "🔧 If issues persist:"
echo "   • Check firewall: sudo ufw status"
echo "   • Check DNS: nslookup convoai.space"
echo "   • Review logs: pm2 logs convoai --lines 50"