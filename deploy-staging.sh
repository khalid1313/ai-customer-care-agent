#!/bin/bash
# STAGING deployment script - for testing before production

echo "🧪 STAGING DEPLOYMENT"
echo "Repository: https://github.com/khalid1313/Rocketagents-1.0"
echo "Branch: staging"
echo ""

# For now, we'll use the same server but different directory
# Later you can set up a separate staging server

echo "📥 Deploying staging branch for testing..."

# Create staging directory on server
ssh root@165.227.206.60 "
    mkdir -p /var/www/staging
    cd /var/www/staging
    
    # Clone if not exists, otherwise pull
    if [ ! -d '.git' ]; then
        git clone https://github.com/khalid1313/Rocketagents-1.0.git .
    fi
    
    git fetch origin
    git checkout staging
    git reset --hard origin/staging
    echo 'Staging deployment complete'
"

# Configure staging nginx (optional - for testing on different port)
ssh root@165.227.206.60 "
    # Create simple staging config
    cat > /etc/nginx/sites-available/staging << 'EOF'
server {
    listen 8080;
    server_name 165.227.206.60;
    root /var/www/staging/frontend/public;
    index index.html landing.html;
    
    location / {
        try_files \$uri \$uri/ /landing.html;
    }
}
EOF
    
    # Enable staging site
    ln -sf /etc/nginx/sites-available/staging /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
"

echo ""
echo "✅ STAGING DEPLOYMENT COMPLETE!"
echo "🧪 Test site: http://165.227.206.60:8080"
echo "📝 Test thoroughly before deploying to production"
echo ""
echo "To deploy to production after testing:"
echo "./deploy-production.sh"