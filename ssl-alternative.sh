#!/bin/bash

# Alternative SSL setup using DNS validation
# This bypasses the HTTP-01 challenge firewall issues

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

print_status "Alternative SSL Setup - DNS Challenge Method"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    print_status "Installing certbot..."
    sudo apt update
    sudo apt install -y snapd
    sudo snap install core; sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
fi

print_status "Attempting SSL certificate with manual DNS challenge..."
print_warning "This method requires manual DNS record creation"

# Try manual DNS challenge
sudo certbot certonly \
    --manual \
    --preferred-challenges dns \
    -d $DOMAIN \
    -d $WWW_DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --manual-public-ip-logging-ok

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained successfully!"
    
    # Create SSL nginx config
    sudo tee /etc/nginx/sites-available/convoai-ssl > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN $WWW_DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # Enable SSL config
    sudo rm -f /etc/nginx/sites-enabled/*
    sudo ln -sf /etc/nginx/sites-available/convoai-ssl /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    print_success "HTTPS is now configured!"
    print_success "Access your site: https://$DOMAIN"
    
else
    print_error "SSL certificate generation failed"
    print_status "Falling back to HTTP-only configuration..."
    
    # Create HTTP-only config
    sudo tee /etc/nginx/sites-available/convoai-http > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN _;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    sudo rm -f /etc/nginx/sites-enabled/*
    sudo ln -sf /etc/nginx/sites-available/convoai-http /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    
    print_warning "Running on HTTP only: http://$DOMAIN"
fi