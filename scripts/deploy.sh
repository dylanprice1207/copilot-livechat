#!/bin/bash

# ConvoAI Production Deployment Script
# ===================================

set -e

echo "🚀 Starting ConvoAI production deployment..."

# Configuration
APP_NAME="convoai"
APP_DIR="/opt/convoai"
REPO_URL="https://github.com/your-username/convoai-chat.git"
NODE_VERSION="18"
SERVICE_USER="convoai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (sudo)"
    exit 1
fi

print_status "Updating system packages..."
apt update && apt upgrade -y

print_status "Installing system dependencies..."
apt install -y curl wget git nginx software-properties-common

# Install Node.js
print_status "Installing Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Install Redis
print_status "Installing Redis..."
apt-get install -y redis-server

# Install PM2
print_status "Installing PM2..."
npm install -g pm2

# Create service user
print_status "Creating service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --home $APP_DIR --shell /bin/false $SERVICE_USER
fi

# Create application directory
print_status "Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p /var/log/convoai

# Clone repository
print_status "Cloning application repository..."
cd $APP_DIR
if [ -d ".git" ]; then
    print_status "Repository exists, pulling latest changes..."
    git pull origin main
else
    git clone $REPO_URL .
fi

# Install dependencies
print_status "Installing application dependencies..."
npm install --production

# Build frontend
print_status "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Set permissions
print_status "Setting file permissions..."
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR
chown -R $SERVICE_USER:$SERVICE_USER /var/log/convoai
chmod -R 755 $APP_DIR
chmod -R 755 /var/log/convoai

# Setup environment file
print_status "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.production .env
    print_warning "Please edit .env file with your production configuration"
fi

# Setup database
print_status "Setting up database..."
sudo systemctl start mongod
sudo systemctl enable mongod
node scripts/setup-database.js || print_warning "Database setup failed - please run manually"

# Setup services
print_status "Starting services..."
systemctl start redis-server
systemctl enable redis-server

# Setup firewall
print_status "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000

# Start application with PM2
print_status "Starting ConvoAI application..."
sudo -u $SERVICE_USER pm2 start ecosystem.config.js
sudo -u $SERVICE_USER pm2 save

# Setup PM2 startup
env PATH=$PATH:/usr/bin pm2 startup systemd -u $SERVICE_USER --hp $APP_DIR

# Setup Nginx
print_status "Configuring Nginx..."
cp nginx/nginx.conf /etc/nginx/sites-available/convoai
ln -sf /etc/nginx/sites-available/convoai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

print_success "ConvoAI deployment completed!"
print_status "Next steps:"
echo "1. Edit $APP_DIR/.env with your production configuration"
echo "2. Setup SSL certificates (Let's Encrypt recommended)"
echo "3. Configure your domain DNS to point to this server"
echo "4. Run: systemctl restart nginx"

print_status "Useful commands:"
echo "- Check application logs: pm2 logs convoai-main"
echo "- Restart application: pm2 restart convoai-main"
echo "- Check system status: systemctl status nginx mongod redis"

print_success "ConvoAI is ready for production! 🎉"