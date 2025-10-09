#!/bin/bash

# ==========================================
# ConvoAI Ubuntu Server Setup Script
# ==========================================
# Simplified version for existing projects
# Works from your current project directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(pwd)"
SERVICE_USER="convoai"
LOG_FILE="/tmp/convoai-setup.log"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    clear
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    🚀 ConvoAI Server Setup                   ║"
    echo "║            Professional Live Chat System Ubuntu              ║"
    echo "║                     Existing Project Mode                     ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
    print_success "Running with root privileges"
}

check_project() {
    print_status "Checking ConvoAI project..."
    
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        print_error "package.json not found in current directory"
        print_error "Please run this script from your ConvoAI project directory"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_DIR/server.js" ]; then
        print_error "server.js not found in current directory"
        print_error "Please run this script from your ConvoAI project directory"
        exit 1
    fi
    
    print_success "ConvoAI project found in: $PROJECT_DIR"
}

update_system() {
    print_status "Updating Ubuntu system packages..."
    apt update && apt upgrade -y
    apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
    print_success "System packages updated"
}

install_nodejs() {
    print_status "Installing Node.js 18..."
    
    # Remove old Node.js
    apt remove -y nodejs npm || true
    
    # Install Node.js 18 from NodeSource
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    
    print_success "Node.js installed: $node_version"
    print_success "NPM installed: $npm_version"
}

install_docker() {
    print_status "Installing Docker..."
    
    # Remove old Docker
    apt remove -y docker docker-engine docker.io containerd runc || true
    
    # Install Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start Docker
    systemctl enable docker
    systemctl start docker
    
    print_success "Docker installed successfully"
}

install_redis() {
    print_status "Installing Redis..."
    apt install -y redis-server
    
    # Configure Redis
    sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    
    systemctl enable redis-server
    systemctl restart redis-server
    
    print_success "Redis installed and configured"
}

install_nginx() {
    print_status "Installing Nginx..."
    apt install -y nginx
    
    systemctl enable nginx
    systemctl start nginx
    
    print_success "Nginx installed"
}

create_user() {
    print_status "Creating ConvoAI service user..."
    
    if id "$SERVICE_USER" &>/dev/null; then
        print_warning "User $SERVICE_USER already exists"
    else
        useradd -r -s /bin/false -m -d /home/$SERVICE_USER $SERVICE_USER
        print_success "User $SERVICE_USER created"
    fi
}

setup_project() {
    print_status "Setting up project permissions..."
    
    # Give convoai user access to project directory
    chown -R $SERVICE_USER:$SERVICE_USER "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
    
    print_success "Project permissions configured"
}

install_dependencies() {
    print_status "Installing project dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Install backend dependencies
    sudo -u $SERVICE_USER npm install
    
    # Install frontend dependencies if exists
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        sudo -u $SERVICE_USER npm install
        sudo -u $SERVICE_USER npm run build 2>/dev/null || print_warning "Frontend build failed"
        cd ..
    fi
    
    print_success "Dependencies installed"
}

install_pm2() {
    print_status "Installing PM2 process manager..."
    npm install -g pm2
    
    # Setup PM2 startup
    env PATH=$PATH:/usr/bin pm2 startup systemd -u $SERVICE_USER --hp /home/$SERVICE_USER
    
    print_success "PM2 installed"
}

setup_environment() {
    print_status "Configuring environment..."
    
    # Update existing .env for production or create new one
    if [ -f "$PROJECT_DIR/.env" ]; then
        print_status "Updating existing .env file for production..."
        
        # Update NODE_ENV to production
        sed -i 's/NODE_ENV=development/NODE_ENV=production/' "$PROJECT_DIR/.env"
        
        # Add Redis configuration if not present
        if ! grep -q "REDIS_URL" "$PROJECT_DIR/.env"; then
            echo "" >> "$PROJECT_DIR/.env"
            echo "# Redis Configuration" >> "$PROJECT_DIR/.env"
            echo "REDIS_URL=redis://localhost:6379" >> "$PROJECT_DIR/.env"
            echo "REDIS_PASSWORD=" >> "$PROJECT_DIR/.env"
        fi
        
        # Add session store configuration
        if ! grep -q "SESSION_STORE" "$PROJECT_DIR/.env"; then
            echo "SESSION_STORE=redis" >> "$PROJECT_DIR/.env"
        fi
        
        chown $SERVICE_USER:$SERVICE_USER "$PROJECT_DIR/.env"
        print_success "Environment file updated for production"
    else
        cat > "$PROJECT_DIR/.env" << EOF
# ConvoAI Ubuntu Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration (replace with your MongoDB URI)
MONGODB_URI=mongodb://localhost:27017/convoai

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Security Keys (CHANGE THESE!)
JWT_SECRET=convoai-ubuntu-jwt-secret-$(openssl rand -hex 32)
SESSION_SECRET=convoai-ubuntu-session-secret-$(openssl rand -hex 32)

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
EOF
        chown $SERVICE_USER:$SERVICE_USER "$PROJECT_DIR/.env"
        print_success "Environment file created"
    fi
}

create_pm2_config() {
    print_status "Creating PM2 ecosystem configuration..."
    
    cat > "$PROJECT_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'convoai',
    script: 'server.js',
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
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

    # Create log directory
    mkdir -p /var/log/convoai
    chown -R $SERVICE_USER:$SERVICE_USER /var/log/convoai
    
    chown $SERVICE_USER:$SERVICE_USER "$PROJECT_DIR/ecosystem.config.js"
    print_success "PM2 configuration created"
}

setup_nginx() {
    print_status "Configuring Nginx..."
    
    # First, add rate limiting to the main nginx config
    if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf; then
        sed -i '/http {/a\\tlimit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf
    fi
    
    cat > /etc/nginx/sites-available/convoai << EOF
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

    # Enable site
    ln -sf /etc/nginx/sites-available/convoai /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    systemctl reload nginx
    
    print_success "Nginx configured"
}

setup_firewall() {
    print_status "Configuring UFW firewall..."
    
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    print_success "Firewall configured"
}

start_services() {
    print_status "Starting ConvoAI services..."
    
    cd "$PROJECT_DIR"
    
    # Start application with PM2
    sudo -u $SERVICE_USER pm2 start ecosystem.config.js
    sudo -u $SERVICE_USER pm2 save
    
    # Save PM2 startup configuration
    pm2 startup systemd -u $SERVICE_USER --hp /home/$SERVICE_USER
    
    print_success "ConvoAI started successfully"
}

run_tests() {
    print_status "Running basic health checks..."
    
    # Check if Node.js app is running
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "ConvoAI application is responding"
    else
        print_warning "ConvoAI application may not be fully started yet"
    fi
    
    # Check Redis
    if redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is running"
    else
        print_warning "Redis connection issue"
    fi
    
    # Check Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_warning "Nginx is not running"
    fi
}

show_completion() {
    clear
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                🎉 ConvoAI Setup Complete! 🎉                 ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${BLUE}📊 Installation Summary:${NC}"
    echo -e "  • Project Directory: ${GREEN}$PROJECT_DIR${NC}"
    echo -e "  • Service User: ${GREEN}$SERVICE_USER${NC}"
    echo -e "  • Environment: ${GREEN}Ubuntu 22.04 Production${NC}"
    echo -e "  • Database: ${GREEN}Redis (Local)${NC}"
    echo -e "  • Web Server: ${GREEN}Nginx${NC}"
    echo -e "  • Process Manager: ${GREEN}PM2${NC}"
    echo
    echo -e "${BLUE}🌐 Access Your ConvoAI System:${NC}"
    echo -e "  • Main Application: ${GREEN}http://$(hostname -I | awk '{print $1}')${NC}"
    echo -e "  • Chat Demo: ${GREEN}http://$(hostname -I | awk '{print $1}')/chatkit-enhanced-demo.html${NC}"
    echo -e "  • Admin Portal: ${GREEN}http://$(hostname -I | awk '{print $1}')/org-admin.html${NC}"
    echo
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "  • Status: ${GREEN}sudo -u $SERVICE_USER pm2 status${NC}"
    echo -e "  • Logs: ${GREEN}sudo -u $SERVICE_USER pm2 logs convoai${NC}"
    echo -e "  • Restart: ${GREEN}sudo -u $SERVICE_USER pm2 restart convoai${NC}"
    echo -e "  • Stop: ${GREEN}sudo -u $SERVICE_USER pm2 stop convoai${NC}"
    echo
    echo -e "${BLUE}⚠️  Important Next Steps:${NC}"
    echo -e "  1. ${YELLOW}Edit $PROJECT_DIR/.env with your MongoDB URI${NC}"
    echo -e "  2. ${YELLOW}Add your OpenAI API key to .env${NC}"
    echo -e "  3. ${YELLOW}Configure your domain in Nginx${NC}"
    echo -e "  4. ${YELLOW}Set up SSL certificates (recommended)${NC}"
    echo
    echo -e "${GREEN}🎯 ConvoAI is now running on your Ubuntu server!${NC}"
}

# Main execution
main() {
    print_header
    
    check_root
    check_project
    update_system
    install_nodejs
    install_docker
    install_redis
    install_nginx
    create_user
    setup_project
    install_dependencies
    install_pm2
    setup_environment
    create_pm2_config
    setup_nginx
    setup_firewall
    start_services
    run_tests
    show_completion
}

# Run main function
main "$@"