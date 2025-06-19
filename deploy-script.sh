#!/bin/bash
# Automated deployment script for RocketAgents.ai

echo "🚀 Starting deployment to production server..."

# Build frontend (if needed)
echo "📦 Building frontend..."
cd frontend
npm run build 2>/dev/null || echo "No build script found, using existing files"
cd ..

# Upload only changed files
echo "📤 Uploading changes to server..."
rsync -avz --delete --exclude 'node_modules' --exclude '.git' --exclude '*.log' \
  frontend/ root@165.227.206.60:/var/www/rocketagents/frontend/

# Reload Nginx on server
echo "🔄 Reloading web server..."
ssh root@165.227.206.60 "systemctl reload nginx && echo 'Server reloaded successfully!'"

echo "✅ Deployment complete! Check https://rocketagents.ai"
echo "🕐 Changes should be live in 30 seconds"