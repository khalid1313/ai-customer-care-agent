#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Create app directory
sudo mkdir -p /var/www/rocketagents
sudo chown -R $USER:$USER /var/www/rocketagents

# Clone your repository (replace with your actual repo URL)
cd /var/www/rocketagents
# git clone https://github.com/yourusername/ai-customer-care-agent.git .

# Install dependencies
# npm install --production

# Setup firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable