#!/bin/bash

# This script runs on your server

# Navigate to app directory
cd /var/www/rocketagents

# Pull latest changes
git pull origin main

# Install/update dependencies
npm install --production

# Build frontend if needed
# npm run build

# Copy Nginx config
sudo cp nginx-config.conf /etc/nginx/sites-available/rocketagents
sudo ln -sf /etc/nginx/sites-available/rocketagents /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Restart PM2 processes (if backend exists)
# pm2 restart ecosystem.config.js --env production
# pm2 save

# Install SSL certificate
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d rocketagents.ai -d www.rocketagents.ai --non-interactive --agree-tos -m your-email@example.com

echo "Deployment complete!"