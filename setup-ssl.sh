#!/bin/bash

# ==========================================
# ConvoAI SSL Certificate Setup Script
# ==========================================
# Sets up Let's Encrypt SSL for ConvoAI

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

# Configuration
DOMAIN="convoai.space"
WWW_DOMAIN="www.convoai.space"
EMAIL="admin@convoai.space"  # Change this to your email
PROJECT_DIR="$(pwd)"

print_header() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                🔒 ConvoAI SSL Certificate Setup             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_domain_dns() {
    print_status "Checking DNS configuration..."
    
    # Get server IP
    SERVER_IP=$(curl -s -4 icanhazip.com)
    print_status "Server IP: $SERVER_IP"
    
    # Check domain resolution
    DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)
    WWW_DOMAIN_IP=$(dig +short $WWW_DOMAIN | tail -n1)
    
    print_status "Domain IP: $DOMAIN_IP"
    print_status "WWW Domain IP: $WWW_DOMAIN_IP"
    
    if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
        print_warning "Domain $DOMAIN does not point to this server"
        print_warning "Expected: $SERVER_IP, Got: $DOMAIN_IP"
    fi
    
    if [ "$WWW_DOMAIN_IP" != "$SERVER_IP" ]; then
        print_warning "Domain $WWW_DOMAIN does not point to this server"
        print_warning "Expected: $SERVER_IP, Got: $WWW_DOMAIN_IP"
    fi
}

setup_firewall() {
    print_status "Configuring firewall for SSL..."
    
    # Configure UFW
    ufw --force enable
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 3000/tcp
    
    print_success "Firewall configured"
}

install_certbot() {
    print_status "Installing Certbot..."
    
    # Install snapd if not present
    apt update
    apt install -y snapd
    
    # Install certbot via snap
    snap install core; snap refresh core
    snap install --classic certbot
    
    # Create symlink
    ln -sf /snap/bin/certbot /usr/bin/certbot
    
    print_success "Certbot installed"
}

setup_nginx_for_ssl() {
    print_status "Setting up Nginx for SSL verification..."
    
    # Stop nginx
    systemctl stop nginx
    
    # Create webroot directory
    mkdir -p /var/www/html/.well-known/acme-challenge
    chown -R www-data:www-data /var/www/html
    
    # Create temporary config for SSL verification
    cat > /etc/nginx/sites-available/ssl-setup << EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files \$uri =404;
    }
    
    # Redirect all other traffic to HTTPS (after SSL is set up)
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
    
    # Enable SSL setup config
    rm -f /etc/nginx/sites-enabled/*
    ln -sf /etc/nginx/sites-available/ssl-setup /etc/nginx/sites-enabled/
    
    # Test and start nginx
    nginx -t
    systemctl start nginx
    
    print_success "Nginx configured for SSL setup"
}

obtain_ssl_certificate() {
    print_status "Obtaining SSL certificate from Let's Encrypt..."
    
    # Try webroot method first
    if certbot certonly \
        --webroot \
        -w /var/www/html \
        -d $DOMAIN \
        -d $WWW_DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --non-interactive; then
        
        print_success "SSL certificate obtained successfully!"
        return 0
    else
        print_warning "Webroot method failed, trying standalone..."
        
        # Stop nginx for standalone mode
        systemctl stop nginx
        
        # Try standalone method
        if certbot certonly \
            --standalone \
            -d $DOMAIN \
            -d $WWW_DOMAIN \
            --email $EMAIL \
            --agree-tos \
            --non-interactive; then
            
            print_success "SSL certificate obtained via standalone!"
            return 0
        else
            print_error "Failed to obtain SSL certificate"
            return 1
        fi
    fi
}

create_ssl_nginx_config() {
    print_status "Creating SSL-enabled Nginx configuration..."
    
    cat > /etc/nginx/sites-available/convoai-ssl << EOF
# Rate limiting (add to /etc/nginx/nginx.conf in http block if not present)
# limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;
    
    # Allow Let's Encrypt renewals
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
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Main application
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
    
    # Socket.io WebSocket support
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
    
    # Add rate limiting to nginx.conf if not present
    if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
        sed -i '/http {/a\\tlimit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf
    fi
    
    # Enable SSL config
    rm -f /etc/nginx/sites-enabled/*
    ln -sf /etc/nginx/sites-available/convoai-ssl /etc/nginx/sites-enabled/
    
    print_success "SSL Nginx configuration created"
}

setup_ssl_renewal() {
    print_status "Setting up automatic SSL renewal..."
    
    # Test renewal
    certbot renew --dry-run
    
    # Create renewal hook to reload nginx
    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << EOF
#!/bin/bash
systemctl reload nginx
EOF
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
    
    print_success "SSL auto-renewal configured"
}

test_ssl_setup() {
    print_status "Testing SSL configuration..."
    
    # Test nginx config
    if nginx -t; then
        print_success "Nginx configuration is valid"
        systemctl reload nginx
        
        # Test HTTPS connection
        sleep 2
        if curl -s -k https://localhost > /dev/null; then
            print_success "HTTPS connection working"
        else
            print_warning "HTTPS connection test failed"
        fi
    else
        print_error "Nginx configuration test failed"
        return 1
    fi
}

show_completion() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              🎉 SSL Certificate Setup Complete! 🎉          ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}🌐 Your ConvoAI is now secured with HTTPS:${NC}"
    echo -e "  • Main Site: ${GREEN}https://$DOMAIN${NC}"
    echo -e "  • WWW Site: ${GREEN}https://$WWW_DOMAIN${NC}"
    echo -e "  • Chat Demo: ${GREEN}https://$DOMAIN/chatkit-enhanced-demo.html${NC}"
    echo -e "  • Admin Portal: ${GREEN}https://$DOMAIN/org-admin.html${NC}"
    echo
    echo -e "${BLUE}🔒 SSL Certificate Information:${NC}"
    echo -e "  • Issuer: ${GREEN}Let's Encrypt${NC}"
    echo -e "  • Auto-renewal: ${GREEN}Enabled${NC}"
    echo -e "  • Certificate path: ${GREEN}/etc/letsencrypt/live/$DOMAIN/${NC}"
    echo
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "  • Check SSL status: ${GREEN}sudo certbot certificates${NC}"
    echo -e "  • Renew certificates: ${GREEN}sudo certbot renew${NC}"
    echo -e "  • Test renewal: ${GREEN}sudo certbot renew --dry-run${NC}"
    echo
    echo -e "${GREEN}🎯 Your ConvoAI is now production-ready with SSL!${NC}"
}

# Main execution
main() {
    print_header
    check_root
    check_domain_dns
    setup_firewall
    install_certbot
    setup_nginx_for_ssl
    
    if obtain_ssl_certificate; then
        create_ssl_nginx_config
        setup_ssl_renewal
        test_ssl_setup
        show_completion
    else
        print_error "SSL setup failed. Please check domain DNS and firewall settings."
        exit 1
    fi
}

# Run main function
main "$@"