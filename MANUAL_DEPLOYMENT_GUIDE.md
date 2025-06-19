# Manual Deployment Guide for Digital Ocean

Follow these steps in your Digital Ocean console to deploy the AI Customer Care Agent.

## Step 1: Access Your Server

1. Go to Digital Ocean dashboard
2. Click on your droplet (165.227.206.60)
3. Click "Console" to access the server terminal
4. Login as root with password: `RocketAgents2025!`

## Step 2: Update System and Install Node.js

```bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git nginx ufw

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 process manager
npm install -g pm2

# Verify installations
node --version
npm --version
```

## Step 3: Clone and Setup Application

```bash
# Go to web directory
cd /var/www

# Clone the repository
git clone https://github.com/khalid1313/ai-customer-care-agent.git
cd ai-customer-care-agent

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 4: Configure Environment

```bash
# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=your_openai_api_key_here
INSTAGRAM_PAGE_ACCESS_TOKEN=your_instagram_token_here
INSTAGRAM_APP_ID=1602165647122301
WEBHOOK_VERIFY_TOKEN=test123
SERVER_URL=https://rocketagents.ai
FRONTEND_URL=https://rocketagents.ai
EOF
```

## Step 5: Setup Database and Build

```bash
# Setup database
npx prisma generate
npx prisma migrate deploy

# Build frontend
cd frontend
npm run build
cd ..
```

## Step 6: Configure Nginx

```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/rocketagents.ai << 'EOF'
server {
    listen 80;
    server_name rocketagents.ai www.rocketagents.ai 165.227.206.60;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Webhooks
    location /webhook {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/rocketagents.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t
```

## Step 7: Start Applications

```bash
# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ai-care-backend',
      script: 'src/server.js',
      env: { NODE_ENV: 'production', PORT: 3001 }
    },
    {
      name: 'ai-care-frontend', 
      script: 'npm',
      args: 'start',
      cwd: '/var/www/ai-customer-care-agent/frontend',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
};
EOF

# Set permissions
chown -R www-data:www-data /var/www/ai-customer-care-agent

# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Start Nginx
systemctl restart nginx
systemctl enable nginx

# Configure firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
```

## Step 8: Verify Deployment

```bash
# Check application status
pm2 status

# Check Nginx status
systemctl status nginx

# Test the endpoints
curl http://localhost:3001/api/health
curl http://localhost:3000
```

## Step 9: Access Your Application

Your application should now be accessible at:
- http://rocketagents.ai
- http://165.227.206.60

## Troubleshooting Commands

```bash
# View application logs
pm2 logs

# Restart applications
pm2 restart all

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
```

## SSL Setup (Optional)

```bash
# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d rocketagents.ai -d www.rocketagents.ai
```

Your AI Customer Care Agent is now deployed and running on Digital Ocean!