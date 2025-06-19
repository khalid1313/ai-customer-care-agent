#!/bin/bash
# Automated GitHub push script

echo "🚀 Pushing RocketAgents to GitHub..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    git remote add origin https://github.com/khalid1313/Rocketagents-1.0.git
fi

# Stage all files
echo "📦 Staging files..."
git add .

# Commit with timestamp
echo "💾 Committing changes..."
git commit -m "RocketAgents project upload - $(date)"

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
echo "Username: khalid1313"
echo "Password: [REDACTED]"
git push -u origin main

echo "✅ Upload complete! Repository ready for server deployment."