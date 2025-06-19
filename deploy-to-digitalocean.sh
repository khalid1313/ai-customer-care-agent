#!/bin/bash

# AI Customer Care Agent - Digital Ocean Deployment Script
# Run this script on your Digital Ocean server (165.227.206.60)

set -e  # Exit on any error

echo "🚀 Starting AI Customer Care Agent deployment..."
echo "Server: 165.227.206.60 (rocketagents.ai)"
echo "=================================================="

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
apt install -y curl wget git nginx ufw fail2ban

# Install Node.js 18.x (LTS)
echo "📥 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installations
echo "✅ Verifying installations..."
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Git version: $(git --version)"

# Install PM2 for process management
echo "⚙️ Installing PM2 process manager..."
npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
cd /var/www
rm -rf ai-customer-care-agent 2>/dev/null || true

# Clone the repository
echo "📂 Cloning repository from GitHub..."
git clone https://github.com/khalid1313/ai-customer-care-agent.git
cd ai-customer-care-agent

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create .env file with production settings
echo "🔧 Creating environment configuration..."
cat > .env << 'EOF'
# Production Environment Configuration
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL="file:./dev.db"

# AI Configuration - REPLACE WITH YOUR ACTUAL OPENAI API KEY
OPENAI_API_KEY=your_openai_api_key_here

# Instagram Integration
INSTAGRAM_PAGE_ACCESS_TOKEN=your_instagram_token_here
INSTAGRAM_ACCESS_TOKEN=your_fallback_token_here
INSTAGRAM_APP_ID=1602165647122301
INSTAGRAM_APP_SECRET=your_app_secret_here
WEBHOOK_VERIFY_TOKEN=test123

# Optional Integrations
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_ENVIRONMENT=your_pinecone_env_here

# Server Configuration
SERVER_URL=https://rocketagents.ai
FRONTEND_URL=https://rocketagents.ai
EOF

# Set up database
echo "🗄️ Setting up database..."
npx prisma generate
npx prisma migrate deploy

# Build frontend
echo "🏗️ Building frontend..."
cd frontend
npm run build
cd ..

# Set up Nginx configuration
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/rocketagents.ai << 'EOF'
server {
    listen 80;
    server_name rocketagents.ai www.rocketagents.ai 165.227.206.60;

    # Frontend (Next.js)
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
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook endpoints
    location /webhook {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/rocketagents.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ai-care-backend',
      script: 'src/server.js',
      cwd: '/var/www/ai-customer-care-agent',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/ai-care-backend-error.log',
      out_file: '/var/log/ai-care-backend-out.log',
      log_file: '/var/log/ai-care-backend.log',
      time: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'ai-care-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/ai-customer-care-agent/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/ai-care-frontend-error.log',
      out_file: '/var/log/ai-care-frontend-out.log',
      log_file: '/var/log/ai-care-frontend.log',
      time: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data /var/www/ai-customer-care-agent
chmod -R 755 /var/www/ai-customer-care-agent

# Start services with PM2
echo "🚀 Starting applications with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Start/restart Nginx
echo "🌐 Starting Nginx..."
systemctl restart nginx
systemctl enable nginx

# Show status
echo "📊 Deployment Status:"
echo "===================="
pm2 status
echo ""
echo "Nginx status:"
systemctl status nginx --no-pager -l

echo ""
echo "🎉 Deployment completed successfully!"
echo "🌐 Your application should be accessible at:"
echo "   - http://rocketagents.ai"
echo "   - http://165.227.206.60"
echo ""
echo "📝 Next steps:"
echo "1. Configure SSL certificate with Let's Encrypt"
echo "2. Update environment variables in /var/www/ai-customer-care-agent/.env"
echo "3. Test the API endpoints"
echo ""
echo "🔧 Useful commands:"
echo "   pm2 status           - Check application status"
echo "   pm2 logs             - View application logs"
echo "   pm2 restart all      - Restart applications"
echo "   nginx -t             - Test Nginx configuration"
echo "   systemctl status nginx - Check Nginx status"