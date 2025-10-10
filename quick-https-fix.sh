#!/bin/bash

# Quick HTTPS Fix for ConvoAI
# Run this on your Ubuntu server to fix Cross-Origin-Opener-Policy errors

echo "🔒 ConvoAI HTTPS Quick Fix"
echo "========================"

# Check if we're running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root: sudo $0"
   exit 1
fi

# Check current Nginx status
echo "📋 Checking current configuration..."
nginx -t 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️ Nginx configuration has issues, fixing..."
fi

# Create basic HTTPS redirect configuration
echo "🔧 Creating HTTPS configuration..."
cat > /etc/nginx/sites-available/convoai << 'EOF'
server {
    listen 80;
    server_name convoai.space www.convoai.space;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name convoai.space www.convoai.space;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/convoai.space/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/convoai.space/privkey.pem;
    
    # Security Headers (fixes Cross-Origin-Opener-Policy)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
    
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

# Enable the configuration
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/convoai*
ln -sf /etc/nginx/sites-available/convoai /etc/nginx/sites-enabled/

# Check if SSL certificates exist
if [ ! -f "/etc/letsencrypt/live/convoai.space/fullchain.pem" ]; then
    echo "⚠️ No SSL certificate found, attempting to get one..."
    
    # Install certbot if needed
    if ! command -v certbot &> /dev/null; then
        echo "📦 Installing certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Get SSL certificate
    systemctl stop nginx
    certbot certonly --standalone -d convoai.space -d www.convoai.space --non-interactive --agree-tos --email admin@convoai.space
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL certificate obtained"
    else
        echo "❌ Failed to get SSL certificate"
        echo "🔧 Using temporary configuration without SSL..."
        
        cat > /etc/nginx/sites-available/convoai << 'EOF'
server {
    listen 80;
    server_name convoai.space www.convoai.space;
    
    # Security headers for HTTP (temporary)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    fi
fi

# Test and restart Nginx
echo "🧪 Testing Nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl restart nginx
    systemctl enable nginx
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Restart ConvoAI application
echo "🚀 Restarting ConvoAI application..."
if command -v pm2 &> /dev/null; then
    pm2 restart convoai 2>/dev/null || pm2 start server.js --name convoai
else
    pkill -f "node server.js"
    cd /copilot-livechat || cd /root/copilot-livechat || cd $(pwd)
    nohup node server.js > server.log 2>&1 &
fi

echo ""
echo "✅ HTTPS configuration complete!"
echo ""
echo "🌐 Test your site:"
if [ -f "/etc/letsencrypt/live/convoai.space/fullchain.pem" ]; then
    echo "   • https://convoai.space"
    echo "   • https://www.convoai.space"
else
    echo "   • http://convoai.space (HTTP only - SSL setup needed)"
fi
echo ""
echo "🔍 Check status:"
echo "   • curl -I https://convoai.space"
echo "   • sudo systemctl status nginx"
echo "   • pm2 logs convoai"