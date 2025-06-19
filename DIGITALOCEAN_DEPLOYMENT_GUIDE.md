# DigitalOcean Deployment Guide for RocketAgents.ai

## Step 1: Create Droplet

1. Log into DigitalOcean
2. Click "Create" → "Droplets"
3. Choose:
   - **Image**: Ubuntu 22.04 (LTS) x64
   - **Plan**: Basic → Regular Intel → $6/mo (1GB RAM)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: Password (easier) or SSH Key
   - **Hostname**: `rocketagents`
4. Click "Create Droplet"
5. Copy the IP address once created

## Step 2: Configure GoDaddy DNS

1. Log into GoDaddy
2. Go to "My Products" → Find your domain → "DNS"
3. Delete all existing A records
4. Add these records:
   ```
   Type: A    Name: @     Value: [Your-Droplet-IP]    TTL: 600
   Type: A    Name: www   Value: [Your-Droplet-IP]    TTL: 600
   ```
5. Save changes

## Step 3: Initial Server Setup

SSH into your server:
```bash
ssh root@[Your-Droplet-IP]
```

Run these commands one by one:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install required packages
apt install -y nginx git certbot python3-certbot-nginx

# Create web directory
mkdir -p /var/www/rocketagents
cd /var/www/rocketagents
```

## Step 4: Upload Your Files

From your local computer, run:
```bash
# Create a zip of your frontend folder
cd /Users/khalid/Documents/ai-customer-care-agent
zip -r frontend.zip frontend/

# Upload to server
scp frontend.zip root@[Your-Droplet-IP]:/var/www/rocketagents/

# Back on server, unzip
ssh root@[Your-Droplet-IP]
cd /var/www/rocketagents
unzip frontend.zip
```

## Step 5: Configure Nginx

Create Nginx configuration:
```bash
nano /etc/nginx/sites-available/rocketagents
```

Paste this content:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name rocketagents.ai www.rocketagents.ai;
    
    root /var/www/rocketagents/frontend/public;
    index index.html landing.html;
    
    location / {
        try_files $uri $uri/ /landing.html;
    }
}
```

Save (Ctrl+O, Enter, Ctrl+X) then:

```bash
# Enable the site
ln -s /etc/nginx/sites-available/rocketagents /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx
```

## Step 6: Setup Firewall

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
```

## Step 7: Install SSL Certificate

```bash
certbot --nginx -d rocketagents.ai -d www.rocketagents.ai
```

Follow prompts:
- Enter email
- Agree to terms (A)
- Share email (N for no)
- Redirect HTTP to HTTPS (2)

## Step 8: Test Your Site

1. Visit http://rocketagents.ai (should redirect to HTTPS)
2. Visit https://rocketagents.ai
3. Visit https://www.rocketagents.ai

## Troubleshooting Commands

```bash
# Check Nginx status
systemctl status nginx

# Check Nginx errors
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx

# Check if files are in correct location
ls -la /var/www/rocketagents/frontend/public/
```

## Quick Update Process

When you need to update the site:
```bash
# From your local computer
scp frontend/public/landing.html root@[Your-Droplet-IP]:/var/www/rocketagents/frontend/public/
```

## Important Notes

- DNS propagation can take 5-30 minutes
- SSL certificate auto-renews every 90 days
- Always backup before major changes
- Monitor server resources: `htop`

---

**Need help?** The DigitalOcean community and support are excellent resources.