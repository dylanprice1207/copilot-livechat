#!/bin/bash

# SSL Certificate Setup Script for ConvoAI
# ========================================

set -e

# Configuration
DOMAIN="your-domain.com"
EMAIL="admin@your-domain.com"
NGINX_CONFIG_PATH="/etc/nginx/sites-available/convoai"
SSL_PATH="/etc/nginx/ssl"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (sudo)"
    exit 1
fi

# Get domain from user
read -p "Enter your domain name (e.g., convoai.com): " DOMAIN
read -p "Enter your email for Let's Encrypt: " EMAIL

print_status "Setting up SSL certificate for $DOMAIN..."

# Install Certbot
print_status "Installing Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
systemctl stop nginx

# Get SSL certificate
print_status "Obtaining SSL certificate..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Create SSL directory
mkdir -p "$SSL_PATH"

# Link certificates
ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_PATH/cert.pem"
ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_PATH/private.key"

# Update Nginx configuration
print_status "Updating Nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN/g" "$NGINX_CONFIG_PATH"

# Test Nginx configuration
nginx -t

# Start nginx
systemctl start nginx
systemctl reload nginx

# Setup auto-renewal
print_status "Setting up automatic certificate renewal..."
cat > /etc/cron.d/certbot-renew << EOF
0 12 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

print_success "SSL certificate setup completed!"
print_success "Your site is now available at: https://$DOMAIN"

# Test SSL
print_status "Testing SSL configuration..."
curl -I "https://$DOMAIN" || print_error "SSL test failed"

print_success "SSL setup completed successfully! 🔒"