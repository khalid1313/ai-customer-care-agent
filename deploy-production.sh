#!/bin/bash
# PRODUCTION deployment script - MANUAL ONLY
# This script NEVER runs automatically

echo "🚨 PRODUCTION DEPLOYMENT STARTING 🚨"
echo "Repository: https://github.com/khalid1313/Rocketagents-1.0"
echo ""

# Safety check
read -p "Are you sure you want to deploy to LIVE site? (type 'YES' to continue): " confirm
if [ "$confirm" != "YES" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "📊 Current production status:"
ssh root@165.227.206.60 "cd /var/www/rocketagents && git status"

echo ""
echo "🔄 Creating backup of current production..."
ssh root@165.227.206.60 "
    cd /var/www/rocketagents
    # Create backup with timestamp
    tar -czf backup-production-$(date +%Y%m%d-%H%M%S).tar.gz frontend/
    # Keep only last 5 backups
    ls -dt backup-production-*.tar.gz | tail -n +6 | xargs rm -f
"

echo "📥 Pulling latest changes from main branch..."
ssh root@165.227.206.60 "
    cd /var/www/rocketagents
    git fetch origin
    git checkout main
    git reset --hard origin/main
    echo 'Git pull completed'
"

echo "🔄 Reloading web server..."
ssh root@165.227.206.60 "systemctl reload nginx"

echo ""
echo "✅ PRODUCTION DEPLOYMENT COMPLETE!"
echo "🌐 Live site: https://rocketagents.ai"
echo "🕐 Changes will be live in 30 seconds"
echo ""

# Health check
sleep 5
if curl -s https://rocketagents.ai > /dev/null; then
    echo "✅ Site is responding correctly"
else
    echo "❌ WARNING: Site may be down! Check immediately!"
fi