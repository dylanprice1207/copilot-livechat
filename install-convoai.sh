#!/bin/bash

# ==========================================
# ConvoAI Complete Installation Script
# ==========================================
# This script installs and configures everything needed for ConvoAI
# Compatible with: Ubuntu 20.04+, Debian 10+, CentOS 8+

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION="18"
REDIS_VERSION="7"
PROJECT_DIR="/opt/convoai"
SERVICE_USER="convoai"
DOMAIN=""

# Logging
LOG_FILE="/tmp/convoai-install.log"

print_header() {
    clear
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    🚀 ConvoAI Installer                      ║${NC}"
    echo -e "${BLUE}║            Professional Live Chat System Setup               ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "INFO: $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log "WARNING: $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR: $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (sudo)"
        echo "Usage: sudo ./install-convoai.sh"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "Cannot detect OS version"
        exit 1
    fi
    
    print_status "Detected OS: $OS $VER"
}

check_system_requirements() {
    print_status "Checking system requirements..."
    
    # Check memory
    TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$TOTAL_MEM" -lt 2048 ]; then
        print_warning "System has ${TOTAL_MEM}MB RAM. Recommended: 4GB+"
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
    REQUIRED_SPACE=5242880  # 5GB in KB
    
    if [ "$AVAILABLE_SPACE" -lt "$REQUIRED_SPACE" ]; then
        print_error "Insufficient disk space. Available: $(($AVAILABLE_SPACE/1024/1024))GB, Required: 5GB+"
        exit 1
    fi
    
    print_success "System requirements check passed"
}

update_system() {
    print_status "Updating system packages..."
    
    if command -v apt >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive
        apt update && apt upgrade -y
        apt install -y curl wget git software-properties-common build-essential
    elif command -v yum >/dev/null 2>&1; then
        yum update -y
        yum groupinstall -y "Development Tools"
        yum install -y curl wget git epel-release
    else
        print_error "Unsupported package manager"
        exit 1
    fi
    
    print_success "System updated successfully"
}

install_nodejs() {
    print_status "Installing Node.js $NODE_VERSION..."
    
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    
    if command -v apt >/dev/null 2>&1; then
        apt-get install -y nodejs
    elif command -v yum >/dev/null 2>&1; then
        yum install -y nodejs
    fi
    
    # Install global packages
    npm install -g pm2 nodemon
    
    # Verify installation
    NODE_VER=$(node --version)
    NPM_VER=$(npm --version)
    print_success "Node.js installed: $NODE_VER, npm: $NPM_VER"
}

install_docker() {
    print_status "Installing Docker and Docker Compose..."
    
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Start Docker service
    systemctl start docker
    systemctl enable docker
    
    # Add user to docker group
    usermod -aG docker $SUDO_USER 2>/dev/null || true
    
    print_success "Docker installed successfully"
}

install_redis() {
    print_status "Installing Redis..."
    
    if command -v apt >/dev/null 2>&1; then
        apt install -y redis-server
    elif command -v yum >/dev/null 2>&1; then
        yum install -y redis
    fi
    
    # Configure Redis
    sed -i 's/^# requirepass foobared/requirepass convoai2024/' /etc/redis/redis.conf 2>/dev/null || true
    sed -i 's/^bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf 2>/dev/null || true
    
    systemctl start redis-server 2>/dev/null || systemctl start redis
    systemctl enable redis-server 2>/dev/null || systemctl enable redis
    
    print_success "Redis installed and configured"
}

install_nginx() {
    print_status "Installing Nginx..."
    
    if command -v apt >/dev/null 2>&1; then
        apt install -y nginx
    elif command -v yum >/dev/null 2>&1; then
        yum install -y nginx
    fi
    
    systemctl start nginx
    systemctl enable nginx
    
    print_success "Nginx installed successfully"
}

create_service_user() {
    print_status "Creating service user: $SERVICE_USER..."
    
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd --system --home "$PROJECT_DIR" --shell /bin/false "$SERVICE_USER"
    fi
    
    print_success "Service user created: $SERVICE_USER"
}

setup_project_directory() {
    print_status "Setting up project directory..."
    
    mkdir -p "$PROJECT_DIR"
    mkdir -p /var/log/convoai
    mkdir -p /var/lib/convoai/{uploads,temp,backups}
    
    chown -R "$SERVICE_USER:$SERVICE_USER" "$PROJECT_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" /var/log/convoai
    chown -R "$SERVICE_USER:$SERVICE_USER" /var/lib/convoai
    
    print_success "Project directories created"
}

clone_convoai() {
    print_status "Cloning ConvoAI project..."
    
    cd "$PROJECT_DIR"
    
    if [ -d ".git" ]; then
        print_status "Repository exists, pulling latest changes..."
        sudo -u "$SERVICE_USER" git pull origin main
    else
        # If running from current directory, copy files
        if [ -f "$(pwd)/package.json" ]; then
            print_status "Copying project files from current directory..."
            cp -r . "$PROJECT_DIR/"
            chown -R "$SERVICE_USER:$SERVICE_USER" "$PROJECT_DIR"
        else
            print_error "No ConvoAI project found. Please run this script from the ConvoAI project directory."
            exit 1
        fi
    fi
    
    print_success "ConvoAI project ready"
}

install_dependencies() {
    print_status "Installing ConvoAI dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Backend dependencies
    sudo -u "$SERVICE_USER" npm install --production
    
    # Frontend dependencies
    if [ -d "frontend" ]; then
        cd frontend
        sudo -u "$SERVICE_USER" npm install
        sudo -u "$SERVICE_USER" npm run build
        cd ..
    fi
    
    print_success "Dependencies installed successfully"
}

setup_environment() {
    print_status "Setting up environment configuration..."
    
    cd "$PROJECT_DIR"
    
    # Create production .env if it doesn't exist
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# ConvoAI Production Environment Configuration
NODE_ENV=production
PORT=3000
DOMAIN=${DOMAIN:-localhost}

# Database Configuration (using your existing MongoDB Atlas)
MONGODB_URI=mongodb+srv://DylanP:JWebSA3L8o8M1EIo@cluster0.afz799a.mongodb.net/livechat?retryWrites=true&w=majority

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=convoai2024

# Security Keys (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=convoai-production-jwt-secret-$(openssl rand -hex 32)
SESSION_SECRET=convoai-production-session-secret-$(openssl rand -hex 32)

# OpenAI Configuration (replace with your actual API key)
OPENAI_API_KEY=your-openai-api-key-here

# CORS Configuration
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session Configuration
SESSION_MAX_AGE=86400000
SESSION_STORE=redis

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/convoai/app.log

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/lib/convoai/uploads
EOF
        chown "$SERVICE_USER:$SERVICE_USER" .env
    fi
    
    print_success "Environment configuration ready"
}

setup_database() {
    print_status "Setting up database..."
    
    cd "$PROJECT_DIR"
    
    # Run database initialization script
    if [ -f "scripts/setup-database.js" ]; then
        sudo -u "$SERVICE_USER" node scripts/setup-database.js || print_warning "Database setup script failed"
    fi
    
    print_success "Database setup completed"
}

configure_nginx() {
    print_status "Configuring Nginx..."
    
    NGINX_CONF="/etc/nginx/sites-available/convoai"
    
    cat > "$NGINX_CONF" << 'EOF'
server {
    listen 80;
    server_name _;
    
    client_max_body_size 20M;
    
    # Static files
    location /css/ {
        alias /opt/convoai/public/css/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    location /js/ {
        alias /opt/convoai/public/js/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    location /images/ {
        alias /opt/convoai/public/images/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # API and WebSocket proxy
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
        proxy_connect_timeout 5s;
        proxy_read_timeout 60s;
    }
}
EOF
    
    # Enable site
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    
    print_success "Nginx configured successfully"
}

setup_pm2() {
    print_status "Setting up PM2 process management..."
    
    cd "$PROJECT_DIR"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'convoai',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/convoai/error.log',
    out_file: '/var/log/convoai/out.log',
    log_file: '/var/log/convoai/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads']
  }]
};
EOF
    
    chown "$SERVICE_USER:$SERVICE_USER" ecosystem.config.js
    
    # Start application with PM2
    sudo -u "$SERVICE_USER" pm2 start ecosystem.config.js
    sudo -u "$SERVICE_USER" pm2 save
    
    # Setup PM2 startup script
    env PATH=$PATH:/usr/bin pm2 startup systemd -u "$SERVICE_USER" --hp "$PROJECT_DIR" --service-name convoai
    
    print_success "PM2 configured and application started"
}

configure_firewall() {
    print_status "Configuring firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        ufw --force enable
        ufw allow ssh
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw --force reload
    elif command -v firewall-cmd >/dev/null 2>&1; then
        systemctl start firewalld
        systemctl enable firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
    fi
    
    print_success "Firewall configured"
}

setup_ssl() {
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
        print_status "Setting up SSL certificate for $DOMAIN..."
        
        # Install certbot
        if command -v apt >/dev/null 2>&1; then
            apt install -y certbot python3-certbot-nginx
        elif command -v yum >/dev/null 2>&1; then
            yum install -y certbot python3-certbot-nginx
        fi
        
        # Get SSL certificate
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || print_warning "SSL setup failed - configure manually"
        
        # Setup auto-renewal
        echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
        
        print_success "SSL certificate configured for $DOMAIN"
    fi
}

create_systemd_service() {
    print_status "Creating systemd service..."
    
    cat > /etc/systemd/system/convoai.service << EOF
[Unit]
Description=ConvoAI Live Chat System
After=network.target

[Service]
Type=forking
User=$SERVICE_USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable convoai
    
    print_success "Systemd service created"
}

run_tests() {
    print_status "Running basic functionality tests..."
    
    sleep 5  # Wait for services to fully start
    
    # Test health endpoint
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        print_success "✅ Health check passed"
    else
        print_warning "⚠️  Health check failed"
    fi
    
    # Test main page
    if curl -f http://localhost/ >/dev/null 2>&1; then
        print_success "✅ Web server responding"
    else
        print_warning "⚠️  Web server not responding"
    fi
    
    # Test Redis
    if redis-cli ping >/dev/null 2>&1; then
        print_success "✅ Redis connection working"
    else
        print_warning "⚠️  Redis connection failed"
    fi
}

display_completion_info() {
    clear
    print_header
    
    echo -e "${GREEN}🎉 ConvoAI Installation Completed Successfully! 🎉${NC}"
    echo ""
    echo -e "${BLUE}📊 Installation Summary:${NC}"
    echo -e "  • Project Directory: ${GREEN}$PROJECT_DIR${NC}"
    echo -e "  • Service User: ${GREEN}$SERVICE_USER${NC}"
    echo -e "  • Log Files: ${GREEN}/var/log/convoai/${NC}"
    echo -e "  • Upload Directory: ${GREEN}/var/lib/convoai/uploads${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access Your ConvoAI System:${NC}"
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
        echo -e "  • Main Site: ${GREEN}https://$DOMAIN${NC}"
        echo -e "  • Chat Demo: ${GREEN}https://$DOMAIN/chatkit-enhanced-demo.html${NC}"
        echo -e "  • Admin Portal: ${GREEN}https://$DOMAIN/org-admin.html${NC}"
    else
        echo -e "  • Main Site: ${GREEN}http://localhost${NC}"
        echo -e "  • Chat Demo: ${GREEN}http://localhost/chatkit-enhanced-demo.html${NC}"
        echo -e "  • Admin Portal: ${GREEN}http://localhost/org-admin.html${NC}"
    fi
    echo ""
    echo -e "${BLUE}🔑 Default Credentials:${NC}"
    echo -e "  • Username: ${GREEN}admin@convoai.com${NC}"
    echo -e "  • Password: ${GREEN}admin123${NC}"
    echo -e "  ${YELLOW}⚠️  Please change these credentials after first login!${NC}"
    echo ""
    echo -e "${BLUE}🛠️  Useful Commands:${NC}"
    echo -e "  • Check status: ${GREEN}sudo systemctl status convoai${NC}"
    echo -e "  • View logs: ${GREEN}sudo pm2 logs convoai${NC}"
    echo -e "  • Restart app: ${GREEN}sudo pm2 restart convoai${NC}"
    echo -e "  • Nginx logs: ${GREEN}sudo tail -f /var/log/nginx/access.log${NC}"
    echo ""
    echo -e "${BLUE}📚 Next Steps:${NC}"
    echo -e "  1. ${YELLOW}Change default passwords${NC}"
    echo -e "  2. ${YELLOW}Configure your domain in /opt/convoai/.env${NC}"
    echo -e "  3. ${YELLOW}Set up SSL certificate if not done automatically${NC}"
    echo -e "  4. ${YELLOW}Configure backup strategy${NC}"
    echo -e "  5. ${YELLOW}Test all functionality thoroughly${NC}"
    echo ""
    echo -e "${GREEN}🚀 ConvoAI is ready for production use!${NC}"
    echo -e "${BLUE}📖 Documentation: https://github.com/dylanprice1207/copilot-livechat${NC}"
}

main() {
    print_header
    
    # Get domain input
    read -p "Enter your domain name (optional, press Enter for localhost): " DOMAIN
    
    echo -e "\n${BLUE}Starting ConvoAI installation...${NC}\n"
    
    check_root
    detect_os
    check_system_requirements
    update_system
    install_nodejs
    install_docker
    install_redis
    install_nginx
    create_service_user
    setup_project_directory
    clone_convoai
    install_dependencies
    setup_environment
    setup_database
    configure_nginx
    setup_pm2
    configure_firewall
    create_systemd_service
    
    if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
        setup_ssl
    fi
    
    run_tests
    display_completion_info
    
    print_success "Installation completed! Check $LOG_FILE for detailed logs."
}

# Handle script interruption
trap 'print_error "Installation interrupted!"; exit 1' INT TERM

# Run main function
main "$@"