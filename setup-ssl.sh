#!/bin/bash

# SSL Setup Script for rocketagents.ai
# Run this script on your Digital Ocean server to enable HTTPS

set -e

echo "🔒 Setting up SSL/HTTPS for rocketagents.ai..."
echo "================================================"

# Install Certbot
echo "📦 Installing Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
echo "🔐 Obtaining SSL certificate..."
certbot --nginx -d rocketagents.ai -d www.rocketagents.ai --non-interactive --agree-tos --email khalid.lilla@gmail.com

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx

# Set up automatic renewal
echo "⏰ Setting up automatic renewal..."
crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | crontab -

# Test the renewal process
echo "🧪 Testing certificate renewal..."
certbot renew --dry-run

echo ""
echo "🎉 SSL setup completed successfully!"
echo "🌐 Your site is now available at:"
echo "   - https://rocketagents.ai"
echo "   - https://www.rocketagents.ai"
echo ""
echo "📋 SSL Certificate Information:"
certbot certificates

echo ""
echo "✅ HTTP traffic will automatically redirect to HTTPS"
echo "✅ Certificate will auto-renew every 90 days"
echo ""
echo "🔧 Useful commands:"
echo "   certbot certificates        - View certificate info"
echo "   certbot renew              - Manually renew certificates"
echo "   systemctl status nginx     - Check Nginx status"