# Safe Development Workflow for RocketAgents 1.0

## 🔒 KEY SAFETY PRINCIPLES

### ✅ **SAFE ACTIONS** (Won't affect live site):
- Creating feature branches
- Making commits to feature branches
- Creating pull requests
- Working on `develop` branch
- Testing on staging

### ❌ **DANGEROUS ACTIONS** (Could affect live site):
- Pushing directly to `main` branch
- Auto-deployment to production
- Skipping testing phase

## Daily Development Process

### 1. **Start New Feature (SAFE)**
```bash
# Always start from develop branch
git checkout develop
git pull origin develop

# Create feature branch (SAFE - isolated from main)
git checkout -b feature/update-hero-section

# Make your changes
# Edit files, test locally

# Commit changes (SAFE - only affects your branch)
git add .
git commit -m "Update hero section with new design"
git push origin feature/update-hero-section
```

### 2. **Review & Testing Phase**
```bash
# Create Pull Request on GitHub:
# From: feature/update-hero-section
# To: develop (NOT main!)

# After review, merge to develop
git checkout develop
git merge feature/update-hero-section
git push origin develop

# Deploy to staging for testing
./deploy-staging.sh

# Test on: http://165.227.206.60:8080
```

### 3. **Production Deployment (MANUAL ONLY)**
```bash
# Only after thorough testing
git checkout main
git merge develop
git push origin main

# MANUAL production deployment
./deploy-production.sh
# ↑ This script asks for confirmation before deploying
```

## Branch Purposes

| Branch | Purpose | Auto-Deploy | Safety Level |
|--------|---------|-------------|--------------|
| `main` | 🔴 **LIVE WEBSITE** | **NO** | Production |
| `staging` | 🟡 **Testing** | Optional | Safe Testing |
| `develop` | 🟢 **Integration** | **NO** | Safe Development |
| `feature/*` | 🟢 **New Features** | **NO** | Completely Safe |

## Emergency Rollback

If something goes wrong in production:

```bash
# Quick rollback to previous version
ssh root@165.227.206.60 "
    cd /var/www/rocketagents
    git log --oneline -5  # See recent commits
    git reset --hard HEAD~1  # Go back 1 commit
    systemctl reload nginx
"

# Or restore from backup
ssh root@165.227.206.60 "
    cd /var/www/rocketagents
    ls backup-production-*  # See available backups
    tar -xzf backup-production-YYYYMMDD-HHMMSS.tar.gz
    systemctl reload nginx
"
```

## Repository Setup Commands

### First-time setup on your local machine:
```bash
cd /Users/khalid/Documents/ai-customer-care-agent

# Connect to your GitHub repo
git remote add origin https://github.com/khalid1313/Rocketagents-1.0.git

# Create and push main branches
git checkout -b main
git push -u origin main

git checkout -b develop
git push -u origin develop

git checkout -b staging
git push -u origin staging

# Set main as default branch
git checkout main
```

## Summary: Your Safe Workflow

1. **🛠️ Development**: Work on feature branches (completely safe)
2. **🧪 Testing**: Deploy to staging branch (safe testing)  
3. **🚀 Production**: Manual deployment only (you control when)
4. **🔄 Updates**: Never automatic, always your decision

**Your live site will NEVER update unless you explicitly run `./deploy-production.sh`**