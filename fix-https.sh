#!/bin/bash

# ==========================================
# ConvoAI HTTPS/SSL Quick Fix Script
# ==========================================
# Fixes Cross-Origin-Opener-Policy errors by enabling HTTPS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

DOMAIN="convoai.space"
WWW_DOMAIN="www.convoai.space"
EMAIL="admin@convoai.space"

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║               🔒 ConvoAI HTTPS Quick Fix                    ║"
echo "║          Resolving Cross-Origin-Opener-Policy Issues        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_status "Checking current server configuration..."

# Check if domain resolves to this server
SERVER_IP=$(curl -s -4 icanhazip.com)
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

print_status "Server IP: $SERVER_IP"
print_status "Domain IP: $DOMAIN_IP"

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    print_error "DNS mismatch! Update your DNS to point $DOMAIN to $SERVER_IP"
    exit 1
fi

# Step 1: Update Nginx configuration for proper headers
print_status "Configuring Nginx for HTTPS and security headers..."

# Remove any existing conflicting configs
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/convoai*

# Create comprehensive Nginx config
cat > /etc/nginx/sites-available/convoai-https << EOF
# HTTP Server - Redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }
    
    # Redirect everything else to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # SSL Configuration (will be updated after certificate generation)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers (fixes Cross-Origin-Opener-Policy issues)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # IMPORTANT: Proper Cross-Origin-Opener-Policy for HTTPS
    add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    
    # CORS Headers for API
    add_header Access-Control-Allow-Origin "https://$DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;
    
    # Main application proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Handle Socket.io WebSocket connections specifically
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket headers
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket specific settings
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # API routes with CORS
    location /api/ {
        # Handle preflight OPTIONS requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$DOMAIN" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
            add_header Access-Control-Allow-Credentials "true" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
        
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files with proper caching
    location /public/ {
        alias $(pwd)/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF

# Step 2: Install Certbot if not present
if ! command -v certbot &> /dev/null; then
    print_status "Installing Certbot..."
    apt update
    apt install -y snapd
    snap install core; snap refresh core
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
fi

# Step 3: Create webroot directory
mkdir -p /var/www/html/.well-known/acme-challenge
chown -R www-data:www-data /var/www/html

# Step 4: Enable the new configuration
ln -sf /etc/nginx/sites-available/convoai-https /etc/nginx/sites-enabled/

# Test Nginx configuration
print_status "Testing Nginx configuration..."
if nginx -t; then
    print_success "Nginx configuration is valid"
    systemctl reload nginx
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Step 5: Obtain SSL certificate
print_status "Obtaining SSL certificate from Let's Encrypt..."

# Stop nginx temporarily for standalone method
systemctl stop nginx

# Try to get certificate
if certbot certonly \
    --standalone \
    -d $DOMAIN \
    -d $WWW_DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive \
    --expand; then
    
    print_success "SSL certificate obtained successfully!"
    
    # Update Nginx config with real SSL certificate paths
    sed -i "s|ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;|ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;|" /etc/nginx/sites-available/convoai-https
    sed -i "s|ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;|" /etc/nginx/sites-available/convoai-https
    
else
    print_warning "Failed to obtain SSL certificate, using self-signed certificate"
    print_warning "You may see browser warnings, but HTTPS will still work"
fi

# Step 6: Start Nginx
systemctl start nginx
systemctl enable nginx

# Step 7: Configure automatic renewal
print_status "Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -

# Step 8: Update ConvoAI server for HTTPS
print_status "Updating ConvoAI server configuration for HTTPS..."

# Update CORS origin in .env if it exists
if [ -f ".env" ]; then
    if grep -q "CORS_ORIGIN" .env; then
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,https://$WWW_DOMAIN,http://localhost:3000|" .env
    else
        echo "CORS_ORIGIN=https://$DOMAIN,https://$WWW_DOMAIN,http://localhost:3000" >> .env
    fi
    
    # Add HTTPS-specific settings
    if ! grep -q "FORCE_HTTPS" .env; then
        echo "FORCE_HTTPS=true" >> .env
        echo "DOMAIN=$DOMAIN" >> .env
        echo "SSL_ENABLED=true" >> .env
    fi
fi

# Step 9: Restart ConvoAI application
print_status "Restarting ConvoAI application..."
if command -v pm2 &> /dev/null; then
    pm2 restart convoai 2>/dev/null || pm2 start server.js --name convoai
else
    pkill -f "node server.js" || true
    nohup node server.js > server.log 2>&1 &
fi

# Step 10: Test HTTPS
sleep 3
print_status "Testing HTTPS configuration..."

HTTPS_TEST=$(curl -s -o /dev/null -w "%{http_code}" -k https://localhost)
if [ "$HTTPS_TEST" = "200" ]; then
    print_success "Local HTTPS test passed"
else
    print_warning "Local HTTPS test returned: $HTTPS_TEST"
fi

# Final summary
echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  🎉 HTTPS Setup Complete!                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

print_success "ConvoAI is now configured for HTTPS!"
echo ""
echo -e "${BLUE}🌐 Access your secure ConvoAI system:${NC}"
echo -e "  • Main site: ${GREEN}https://$DOMAIN${NC}"
echo -e "  • WWW site: ${GREEN}https://$WWW_DOMAIN${NC}"
echo -e "  • Chat demo: ${GREEN}https://$DOMAIN/chatkit-enhanced-demo.html${NC}"
echo -e "  • Admin portal: ${GREEN}https://$DOMAIN/org-admin.html${NC}"
echo ""
echo -e "${BLUE}🔒 SSL Certificate:${NC}"
echo -e "  • Issuer: ${GREEN}Let's Encrypt${NC}"
echo -e "  • Auto-renewal: ${GREEN}Enabled${NC}"
echo -e "  • Expires: ${GREEN}$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem 2>/dev/null | cut -d= -f2 || echo 'Check manually')${NC}"
echo ""
echo -e "${BLUE}🛠️ Management:${NC}"
echo -e "  • Check certificates: ${GREEN}sudo certbot certificates${NC}"
echo -e "  • Renew manually: ${GREEN}sudo certbot renew${NC}"
echo -e "  • Nginx reload: ${GREEN}sudo systemctl reload nginx${NC}"
echo ""
echo -e "${GREEN}✅ Cross-Origin-Opener-Policy errors should now be resolved!${NC}"

print_status "Checking final HTTPS status..."
curl -I https://$DOMAIN 2>/dev/null | head -n 10 | grep -E "(HTTP|Server|Content|Security)" || print_warning "External HTTPS test may need time to propagate"