#!/bin/bash

# Quick fix for Nginx configuration issue
# Run this on your Ubuntu server to fix the rate limiting problem

echo "🔧 Fixing Nginx configuration..."

# Get the project directory (current directory)
PROJECT_DIR="$(pwd)"

# Remove the broken site configuration
sudo rm -f /etc/nginx/sites-enabled/convoai
sudo rm -f /etc/nginx/sites-available/convoai

# Add rate limiting to main nginx.conf if not present
if ! sudo grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
    sudo sed -i '/http {/a\\tlimit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf
    echo "✅ Added rate limiting to nginx.conf"
fi

# Create corrected site configuration
sudo tee /etc/nginx/sites-available/convoai > /dev/null << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files
    location /public/ {
        alias $PROJECT_DIR/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Handle Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/convoai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    # Reload Nginx
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
    
    # Show status
    echo "📊 Service Status:"
    sudo systemctl status nginx --no-pager -l
    
    echo ""
    echo "🎉 Nginx configuration fixed!"
    echo "Your ConvoAI application should now be accessible via Nginx"
    
else
    echo "❌ Nginx configuration test failed"
    echo "Please check the configuration manually"
    exit 1
fi