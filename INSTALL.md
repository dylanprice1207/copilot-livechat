# ConvoAI Installation Guide

## Quick Start (Development)

1. **Clone and Install**
   ```bash
   git clone https://github.com/your-username/convoai-chat.git
   cd convoai-chat
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

## Production Installation Options

### Option 1: One-Click Deployment Script (Ubuntu/Debian)

```bash
# Download and run deployment script
wget https://raw.githubusercontent.com/your-username/convoai-chat/main/scripts/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

### Option 2: Docker Deployment (Recommended)

```bash
# Clone repository
git clone https://github.com/your-username/convoai-chat.git
cd convoai-chat

# Configure environment
cp .env.docker .env
# Edit .env with your production values

# Start services
docker-compose up -d

# Setup SSL (optional)
sudo ./scripts/setup-ssl.sh
```

### Option 3: Manual Installation

#### Step 1: System Requirements
- Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- 4GB+ RAM, 2+ CPU cores
- 20GB+ SSD storage

#### Step 2: Install Dependencies
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org

# Redis & PM2
sudo apt-get install -y redis-server nginx
sudo npm install -g pm2
```

#### Step 3: Application Setup
```bash
# Create application directory
sudo mkdir -p /opt/convoai
cd /opt/convoai

# Clone and build
git clone https://github.com/your-username/convoai-chat.git .
npm install --production
cd frontend && npm install && npm run build && cd ..

# Environment setup
cp .env.production .env
# Edit .env with your values

# Database setup
npm run setup:db
```

#### Step 4: Start Services
```bash
# Start database services
sudo systemctl start mongod redis-server
sudo systemctl enable mongod redis-server

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 5: Configure Nginx
```bash
# Copy configuration
sudo cp nginx/nginx.conf /etc/nginx/sites-available/convoai
sudo ln -sf /etc/nginx/sites-available/convoai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and start
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Cloud Platform Deployment

### AWS (EC2 + MongoDB Atlas)

1. **Launch EC2 Instance**
   - AMI: Ubuntu Server 20.04 LTS
   - Instance Type: t3.medium (minimum)
   - Security Groups: SSH (22), HTTP (80), HTTPS (443), Custom (3000)

2. **Setup MongoDB Atlas**
   - Create cluster at mongodb.com/atlas
   - Get connection string
   - Whitelist EC2 IP address

3. **Deploy Application**
   ```bash
   # Connect to EC2
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Run deployment script
   wget https://raw.githubusercontent.com/your-username/convoai-chat/main/scripts/deploy.sh
   chmod +x deploy.sh
   sudo ./deploy.sh
   ```

4. **Configure DNS**
   - Point domain to EC2 Elastic IP
   - Setup SSL with Let's Encrypt

### Google Cloud Platform

1. **Create Compute Engine Instance**
   ```bash
   gcloud compute instances create convoai-server \
     --image-family=ubuntu-2004-lts \
     --image-project=ubuntu-os-cloud \
     --machine-type=e2-medium \
     --tags=http-server,https-server
   ```

2. **Setup Firewall Rules**
   ```bash
   gcloud compute firewall-rules create allow-convoai \
     --allow tcp:3000 \
     --target-tags=http-server
   ```

3. **Deploy Application**
   Follow manual installation steps above

### DigitalOcean

1. **Create Droplet**
   - Ubuntu 20.04 x64
   - 4GB Memory / 2 CPUs (minimum)
   - Add SSH key

2. **Setup Domain**
   - Point A record to droplet IP
   - Setup CNAME for www

3. **Deploy**
   ```bash
   # SSH to droplet
   ssh root@your-droplet-ip
   
   # Run deployment
   wget https://raw.githubusercontent.com/your-username/convoai-chat/main/scripts/deploy.sh
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Environment Configuration

### Required Variables
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/convoai_production
JWT_SECRET=your-256-bit-secret-key
SESSION_SECRET=your-session-secret-key
OPENAI_API_KEY=your-openai-api-key
```

### Optional Variables
```env
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/private.key
```

## Security Checklist

- [ ] Change default JWT and session secrets
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall (allow only 22, 80, 443)
- [ ] Set up MongoDB authentication
- [ ] Enable Redis password protection
- [ ] Configure rate limiting
- [ ] Set up log monitoring
- [ ] Regular security updates
- [ ] Backup strategy in place

## Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl http://localhost:3000/health

# Service status
systemctl status nginx mongod redis-server

# Application logs
pm2 logs convoai-main
```

### Backups
```bash
# Database backup
mongodump --db convoai_production --out /backup/$(date +%Y%m%d)

# Application backup
tar -czf /backup/convoai-$(date +%Y%m%d).tar.gz /opt/convoai
```

### Updates
```bash
# Pull latest code
cd /opt/convoai
git pull origin main

# Update dependencies
npm install --production
cd frontend && npm install && npm run build && cd ..

# Restart application
pm2 restart convoai-main
```

## Troubleshooting

### Common Issues

1. **Port 3000 not accessible**
   - Check firewall rules
   - Verify application is running: `pm2 status`

2. **Database connection failed**
   - Ensure MongoDB is running: `systemctl status mongod`
   - Check connection string in .env

3. **SSL certificate issues**
   - Run: `sudo certbot renew`
   - Check certificate expiry: `openssl x509 -in /etc/letsencrypt/live/domain/cert.pem -text -noout`

4. **High memory usage**
   - Restart application: `pm2 restart convoai-main`
   - Check logs: `pm2 logs convoai-main`

### Support Resources

- GitHub Issues: https://github.com/your-username/convoai-chat/issues
- Documentation: https://github.com/your-username/convoai-chat/wiki
- Email Support: support@convoai.com