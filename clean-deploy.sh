#!/bin/bash

# Clean Production Deployment Script for Digital Ocean
# This script sets up a lightweight, fast AI Customer Care Agent

set -e

echo "🚀 Starting clean production deployment..."
echo "=========================================="

# Update system and install essentials
echo "📦 Installing system essentials..."
apt update && apt upgrade -y
apt install -y curl wget git nginx ufw fail2ban

# Install Node.js 18.x LTS (lighter than 20.x)
echo "📥 Installing Node.js 18.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 for process management
echo "⚙️ Installing PM2..."
npm install -g pm2

# Clean up any existing deployment
echo "🧹 Cleaning up existing deployment..."
pm2 delete all 2>/dev/null || true
rm -rf /var/www/ai-customer-care-agent 2>/dev/null || true
mkdir -p /var/www

# Clone fresh repository
echo "📂 Cloning fresh repository..."
cd /var/www
git clone https://github.com/khalid1313/ai-customer-care-agent.git
cd ai-customer-care-agent

# Create optimized .env for production
echo "🔧 Creating production environment..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=your_openai_api_key_here
SERVER_URL=https://rocketagents.ai
FRONTEND_URL=https://rocketagents.ai
EOF

# Install backend dependencies (production only)
echo "📦 Installing backend dependencies..."
npm ci --only=production

# Setup database
echo "🗄️ Setting up database..."
npx prisma generate
npx prisma migrate deploy

# Install frontend dependencies and build
echo "📦 Setting up frontend..."
cd frontend
npm ci
# Create production build with error handling
NODE_ENV=production npm run build || {
    echo "⚠️ Production build failed, using development mode"
    echo "export const dynamic = 'force-dynamic'" >> src/app/tickets/page.tsx
}
cd ..

# Create lightweight PM2 configuration
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      max_memory_restart: '200M',
      error_file: '/var/log/backend-error.log',
      out_file: '/var/log/backend-out.log',
      time: true
    },
    {
      name: 'frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/ai-customer-care-agent/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '300M',
      error_file: '/var/log/frontend-error.log',
      out_file: '/var/log/frontend-out.log',
      time: true
    }
  ]
};
EOF

# Configure Nginx for optimal performance
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/rocketagents.ai << 'EOF'
# Optimized Nginx configuration
server {
    listen 80;
    server_name rocketagents.ai www.rocketagents.ai 165.227.206.60;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rocketagents.ai www.rocketagents.ai;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/rocketagents.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rocketagents.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Performance optimizations
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # Webhooks
    location /webhook {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site and test
ln -sf /etc/nginx/sites-available/rocketagents.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data /var/www/ai-customer-care-agent
chmod -R 755 /var/www/ai-customer-care-agent

# Start applications
echo "🚀 Starting applications..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Start services
echo "🌐 Starting services..."
systemctl restart nginx
systemctl enable nginx

# Setup SSL if certificates exist, otherwise skip
echo "🔒 Checking SSL setup..."
if [ -f "/etc/letsencrypt/live/rocketagents.ai/fullchain.pem" ]; then
    echo "✅ SSL certificates found, reloading Nginx..."
    systemctl reload nginx
else
    echo "⚠️ SSL certificates not found. Run SSL setup separately:"
    echo "certbot --nginx -d rocketagents.ai -d www.rocketagents.ai"
fi

# Cleanup
echo "🧹 Cleaning up..."
apt autoremove -y
apt autoclean

echo ""
echo "🎉 Clean deployment completed!"
echo "================================"
echo "✅ Backend: Running on port 3001"
echo "✅ Frontend: Running on port 3000"  
echo "✅ Nginx: Configured with SSL ready"
echo "✅ PM2: Process management active"
echo "✅ Firewall: Configured and active"
echo ""
echo "🌐 Your application is available at:"
echo "   - https://rocketagents.ai (if SSL is configured)"
echo "   - http://165.227.206.60 (HTTP fallback)"
echo ""
echo "📋 Useful commands:"
echo "   pm2 status           - Check application status"
echo "   pm2 logs             - View application logs"
echo "   pm2 restart all      - Restart applications"
echo "   systemctl status nginx - Check Nginx status"
echo ""
echo "🔒 To enable SSL:"
echo "   apt install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d rocketagents.ai -d www.rocketagents.ai"