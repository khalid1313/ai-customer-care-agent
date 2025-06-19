#!/bin/bash

# Complete server setup script - run this on your DigitalOcean server

echo "Installing Node.js and required packages..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs nginx certbot python3-certbot-nginx

echo "Creating web directory..."
mkdir -p /var/www/rocketagents
cd /var/www/rocketagents

echo "Setup complete! Now upload your files."