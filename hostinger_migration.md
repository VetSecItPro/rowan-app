# Hostinger VPS Migration Guide for Rowan App

## 📊 Your VPS Specifications Analysis

**Hostinger KVM2 VPS Plan:**
- **CPU:** 2 vCPU cores (Shared Intel Xeon/AMD EPYC)
- **RAM:** 8 GB
- **Storage:** 100 GB NVMe SSD
- **Bandwidth:** 8 TB monthly (300 Mbps max)
- **OS:** Ubuntu/AlmaLinux with full root access

### 🚀 Scaling Capacity Estimate

| Metric | Conservative | Optimistic | Notes |
|--------|-------------|------------|-------|
| **Concurrent Users** | 200-500 | 1,000+ | With proper optimization |
| **Daily Active Users** | 2,000-5,000 | 10,000+ | Depends on usage patterns |
| **API Requests/min** | 5,000-10,000 | 20,000+ | With Redis caching |
| **Database Ops** | Unlimited* | Unlimited* | *Via Supabase (external) |

**Upgrade Triggers:**
- CPU usage consistently >80%
- RAM usage >85% (6.8GB)
- Response times >2 seconds
- Storage >80GB used

---

## 🛠️ Complete Migration Process

### Phase 1: VPS Initial Setup

#### 1.1 Connect to VPS
```bash
# SSH into your VPS (replace with your IP)
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git unzip software-properties-common
```

#### 1.2 Install Node.js 18+
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js and npm
apt-get install -y nodejs

# Verify installation
node --version  # Should be v18+
npm --version
```

#### 1.3 Install Process Manager (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

#### 1.4 Install and Configure Nginx
```bash
# Install Nginx
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Verify Nginx is running
systemctl status nginx
```

#### 1.5 Install SSL Certificate Tools
```bash
# Install Certbot for Let's Encrypt
apt install -y certbot python3-certbot-nginx

# Install UFW firewall
apt install -y ufw
```

---

### Phase 2: Security Hardening

#### 2.1 Configure Firewall
```bash
# Configure UFW
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Verify firewall status
ufw status
```

#### 2.2 Create Application User
```bash
# Create dedicated user for the app
adduser --system --group --shell /bin/bash rowan
usermod -aG sudo rowan

# Switch to rowan user for app deployment
su - rowan
```

#### 2.3 Set Up SSH Key Authentication (Optional but Recommended)
```bash
# On your local machine, generate SSH key
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key to VPS
ssh-copy-id rowan@your-vps-ip
```

---

### Phase 3: Application Deployment

#### 3.1 Clone Repository
```bash
# As rowan user
cd /home/rowan

# Clone your repository
git clone https://github.com/your-username/rowan-app.git
cd rowan-app

# Verify all files are present
ls -la
```

#### 3.2 Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

**Complete .env.local Configuration:**
```bash
# Next.js Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase Configuration (Keep existing values)
NEXT_PUBLIC_SUPABASE_URL=your-existing-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-existing-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-existing-service-role-key

# Upstash Redis (Keep existing values)
UPSTASH_REDIS_REST_URL=your-existing-redis-url
UPSTASH_REDIS_REST_TOKEN=your-existing-redis-token

# Resend Email (Keep existing values)
RESEND_API_KEY=your-existing-resend-key

# External API Keys (Keep existing values)
GEMINI_API_KEY=your-existing-gemini-key
SPOONACULAR_API_KEY=your-existing-spoonacular-key
TASTY_API_KEY=your-existing-tasty-key
NINJA_API_KEY=your-existing-ninja-key

# Sentry Configuration (Optional)
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
SENTRY_AUTH_TOKEN=your-sentry-token

# VPS-Specific Settings
PORT=3000
```

#### 3.3 Install Dependencies and Build
```bash
# Install all dependencies
npm install

# Build the application
npm run build

# Test the build locally
npm start &
curl http://localhost:3000
# Should return HTML content

# Stop the test server
pkill -f "npm start"
```

#### 3.4 Create PM2 Ecosystem File
```bash
# Create PM2 configuration
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'rowan-app',
    script: 'npm',
    args: 'start',
    cwd: '/home/rowan/rowan-app',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/rowan/logs/rowan-error.log',
    out_file: '/home/rowan/logs/rowan-out.log',
    log_file: '/home/rowan/logs/rowan-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=4096'
  }]
};
```

#### 3.5 Create Log Directory and Start Application
```bash
# Create logs directory
mkdir -p /home/rowan/logs

# Start the application with PM2
pm2 start ecosystem.config.js --env production

# Verify it's running
pm2 status
pm2 logs rowan-app

# Set PM2 to start on boot
pm2 save
pm2 startup
# Follow the instructions output by this command
```

---

### Phase 4: Nginx Configuration

#### 4.1 Create Nginx Configuration
```bash
# As root user
sudo nano /etc/nginx/sites-available/rowan-app
```

**Nginx Configuration:**
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Upstream for Next.js
upstream nextjs_upstream {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS (will be configured after SSL)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://vercel.com; style-src 'self' 'unsafe-inline'; font-src 'self' data: https:; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://api.gemini.google.com https://*.ingest.sentry.io; frame-src 'self' https://vercel.live;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;

    # Client max body size
    client_max_body_size 10M;

    # Rate limiting for API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;

        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }

    # Special rate limiting for login endpoints
    location ~ ^/api/auth/(login|signup) {
        limit_req zone=login burst=3 nodelay;
        limit_req_status 429;

        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }

    # Static files caching
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://nextjs_upstream;
    }

    # Main application
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### 4.2 Enable Nginx Configuration
```bash
# Enable the site
ln -s /etc/nginx/sites-available/rowan-app /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

### Phase 5: SSL Certificate Setup

#### 5.1 Obtain SSL Certificate
```bash
# Make sure your domain points to your VPS IP first
# Then run Certbot
certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
certbot renew --dry-run

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

---

### Phase 6: Performance Optimization

#### 6.1 Optimize Next.js Configuration
```bash
# Edit next.config.mjs
nano /home/rowan/rowan-app/next.config.mjs
```

**Updated next.config.mjs for VPS:**
```javascript
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // VPS-specific optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  // Compression and caching
  compress: true,
  poweredByHeader: false,

  // Image optimization
  images: {
    domains: ['your-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://vercel.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data: https:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://api.gemini.google.com https://*.ingest.sentry.io",
              "frame-src 'self' https://vercel.live",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

// Sentry configuration (optional)
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  autoInstrumentServerFunctions: false,
  autoInstrumentMiddleware: false,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
```

#### 6.2 System-Level Optimizations
```bash
# Optimize system settings
sudo nano /etc/sysctl.conf
```

**Add to /etc/sysctl.conf:**
```bash
# Network optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr

# File system optimizations
fs.file-max = 65536
vm.swappiness = 10
```

```bash
# Apply settings
sudo sysctl -p
```

#### 6.3 Node.js Memory Optimization
```bash
# Update PM2 configuration for memory optimization
nano /home/rowan/rowan-app/ecosystem.config.js
```

**Optimized ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'rowan-app',
    script: 'npm',
    args: 'start',
    cwd: '/home/rowan/rowan-app',
    instances: 2, // Start with 2 instances, can increase
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=3072' // 3GB per instance
    },
    max_memory_restart: '3G',
    min_uptime: '10s',
    max_restarts: 10,
    error_file: '/home/rowan/logs/rowan-error.log',
    out_file: '/home/rowan/logs/rowan-out.log',
    log_file: '/home/rowan/logs/rowan-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};
```

---

### Phase 7: Monitoring and Maintenance

#### 7.1 Set Up Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/rowan-app
```

**logrotate configuration:**
```bash
/home/rowan/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su rowan rowan
}
```

#### 7.2 System Monitoring Scripts
```bash
# Create monitoring script
nano /home/rowan/monitor.sh
```

**monitor.sh:**
```bash
#!/bin/bash
LOG_FILE="/home/rowan/logs/system-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] System Status Check" >> $LOG_FILE

# Check CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
echo "[$DATE] CPU Usage: ${CPU_USAGE}%" >> $LOG_FILE

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf("%.2f", ($3/$2) * 100.0)}')
echo "[$DATE] Memory Usage: ${MEM_USAGE}%" >> $LOG_FILE

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')
echo "[$DATE] Disk Usage: $DISK_USAGE" >> $LOG_FILE

# Check if app is running
PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status')
echo "[$DATE] App Status: $PM2_STATUS" >> $LOG_FILE

# Alert if CPU > 80%
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "[$DATE] ALERT: High CPU usage!" >> $LOG_FILE
fi

# Alert if Memory > 85%
if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
    echo "[$DATE] ALERT: High memory usage!" >> $LOG_FILE
fi

echo "[$DATE] Check completed" >> $LOG_FILE
echo "" >> $LOG_FILE
```

```bash
# Make script executable
chmod +x /home/rowan/monitor.sh

# Add to crontab (run every 15 minutes)
crontab -e
# Add: */15 * * * * /home/rowan/monitor.sh
```

#### 7.3 Automated Backups
```bash
# Create backup script
nano /home/rowan/backup.sh
```

**backup.sh:**
```bash
#!/bin/bash
BACKUP_DIR="/home/rowan/backups"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/home/rowan/rowan-app"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files (excluding node_modules)
tar -czf "$BACKUP_DIR/rowan-app-$DATE.tar.gz" \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude="logs" \
    -C /home/rowan rowan-app/

# Backup environment file
cp "$APP_DIR/.env.local" "$BACKUP_DIR/env-$DATE.backup"

# Backup nginx configuration
sudo cp /etc/nginx/sites-available/rowan-app "$BACKUP_DIR/nginx-$DATE.conf"

# Keep only last 7 backups
find $BACKUP_DIR -name "rowan-app-*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env-*.backup" -mtime +7 -delete
find $BACKUP_DIR -name "nginx-*.conf" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable and schedule
chmod +x /home/rowan/backup.sh

# Add to crontab (daily backup at 2 AM)
crontab -e
# Add: 0 2 * * * /home/rowan/backup.sh >> /home/rowan/logs/backup.log 2>&1
```

---

### Phase 8: Deployment Automation

#### 8.1 Create Deployment Script
```bash
# Create deploy script for updates
nano /home/rowan/deploy.sh
```

**deploy.sh:**
```bash
#!/bin/bash
set -e

APP_DIR="/home/rowan/rowan-app"
BRANCH="main"

echo "Starting deployment..."

# Navigate to app directory
cd $APP_DIR

# Backup current version
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || true

# Pull latest changes
git fetch origin
git reset --hard origin/$BRANCH

# Install/update dependencies
npm ci --production=false

# Build application
npm run build

# Restart application
pm2 restart rowan-app

# Wait for app to start
sleep 10

# Check if app is responding
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Deployment successful!"
    rm -f package.json.backup package-lock.json.backup
else
    echo "Deployment failed! Rolling back..."
    git reset --hard HEAD^
    mv package.json.backup package.json
    mv package-lock.json.backup package-lock.json 2>/dev/null || true
    npm ci --production=false
    npm run build
    pm2 restart rowan-app
    exit 1
fi
```

```bash
# Make executable
chmod +x /home/rowan/deploy.sh
```

---

### Phase 9: Testing and Verification

#### 9.1 Functionality Testing Checklist
```bash
# Test all endpoints
curl -I https://your-domain.com/
curl -I https://your-domain.com/api/health
curl -I https://your-domain.com/dashboard
curl -I https://your-domain.com/login

# Test 2FA functionality
# 1. Navigate to https://your-domain.com/settings
# 2. Go to Security tab
# 3. Test Enable 2FA flow
# 4. Verify QR code generation
# 5. Test verification with authenticator app

# Test privacy settings
# 1. Navigate to Privacy tab in settings
# 2. Toggle each setting
# 3. Verify persistence after page refresh

# Test real-time features
# 1. Open two browser windows
# 2. Test task creation/updates
# 3. Test message sending
# 4. Verify real-time sync
```

#### 9.2 Performance Testing
```bash
# Install Apache Bench for testing
sudo apt install apache2-utils

# Test concurrent connections
ab -n 1000 -c 50 https://your-domain.com/

# Test API endpoints
ab -n 500 -c 25 https://your-domain.com/api/tasks

# Monitor during testing
htop
# Check PM2 status
pm2 monit
```

---

### Phase 10: Scaling Triggers and Upgrade Path

#### 10.1 Monitoring Thresholds
Create alerts when these metrics are consistently hit:

**CPU Usage:**
- Warning: >70% for 10+ minutes
- Critical: >85% for 5+ minutes
- Action: Scale to 4 vCPU plan

**Memory Usage:**
- Warning: >75% (6GB)
- Critical: >85% (6.8GB)
- Action: Scale to 16GB RAM plan

**Response Times:**
- Warning: >1 second average
- Critical: >2 seconds average
- Action: Optimize code or scale hardware

**Disk Usage:**
- Warning: >80GB used
- Critical: >90GB used
- Action: Clean logs or upgrade storage

#### 10.2 Performance Optimization Before Scaling
```bash
# Enable Redis caching more aggressively
# Update Upstash Redis usage in your app

# Optimize database queries
# Add indexes to frequently queried Supabase tables

# Implement CDN
# Set up Cloudflare for static asset caching

# Code splitting
# Implement dynamic imports for large components
```

---

### Phase 11: Troubleshooting Guide

#### 11.1 Common Issues and Solutions

**App won't start:**
```bash
# Check PM2 logs
pm2 logs rowan-app

# Check environment variables
cat /home/rowan/rowan-app/.env.local

# Verify Node.js version
node --version

# Check port availability
sudo netstat -tulpn | grep :3000
```

**502 Bad Gateway:**
```bash
# Check if app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test upstream
curl http://localhost:3000

# Restart services
pm2 restart rowan-app
sudo systemctl restart nginx
```

**High memory usage:**
```bash
# Check memory per process
pm2 monit

# Reduce PM2 instances
pm2 scale rowan-app 1

# Check for memory leaks
node --inspect /home/rowan/rowan-app/server.js
```

**SSL certificate issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL configuration
sudo nginx -t
```

---

### Phase 12: Maintenance Schedule

#### Daily Tasks (Automated):
- ✅ System monitoring (every 15 minutes)
- ✅ Application backup (2 AM)
- ✅ Log rotation
- ✅ SSL certificate check

#### Weekly Tasks (Manual):
- 📊 Review performance metrics
- 🔄 Update system packages: `sudo apt update && sudo apt upgrade`
- 📝 Review error logs
- 💾 Verify backup integrity

#### Monthly Tasks (Manual):
- 🔐 Security audit
- 📈 Capacity planning review
- 🧹 Clean old files and logs
- 🚀 Update Node.js/dependencies if needed

---

## 🎯 Scaling Roadmap

### Current Capacity (Your VPS):
- **Users:** 500-1,000 concurrent, 5,000-10,000 daily
- **Requests:** 10,000-20,000 per minute
- **Storage:** Support for ~50,000 user records

### Next Upgrade Triggers:
1. **4 vCPU, 16GB RAM** - 2,000+ concurrent users
2. **8 vCPU, 32GB RAM** - 5,000+ concurrent users
3. **Load Balancer + Multiple VPS** - 10,000+ concurrent users

### Alternative Scaling Options:
- **Cloudflare CDN** - Reduce server load by 30-50%
- **Database Read Replicas** - If Supabase becomes bottleneck
- **Microservices Split** - Separate API and frontend servers

---

## 📋 Final Deployment Checklist

- [ ] ✅ VPS provisioned and secured
- [ ] ✅ Node.js and PM2 installed
- [ ] ✅ Application deployed and built
- [ ] ✅ Environment variables configured
- [ ] ✅ Nginx configured with SSL
- [ ] ✅ Firewall configured
- [ ] ✅ Monitoring scripts set up
- [ ] ✅ Backup automation configured
- [ ] ✅ All functionality tested
- [ ] ✅ Performance benchmarked
- [ ] ✅ Documentation updated

**Estimated Total Setup Time:** 4-6 hours for experienced admin, 8-12 hours for beginners.

**Monthly Operating Cost:** ~$15-30 (VPS) + existing external services (Supabase, Redis, etc.)

Your Hostinger VPS is well-suited for this application and should handle significant growth before requiring upgrades!