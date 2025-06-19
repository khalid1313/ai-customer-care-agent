# Git Deployment Strategy for RocketAgents 1.0

## Repository: https://github.com/khalid1313/Rocketagents-1.0

## Branch Strategy (Safe Development)

### 1. **Main Branches**
```
main (production) ← Only stable, tested code
├── staging (pre-production) ← Testing before going live
├── develop (development) ← Integration branch for new features
└── feature/* (feature branches) ← Individual features
```

### 2. **Branch Protection Rules**

**CRITICAL: No Auto-Updates to Production**
- `main` branch = LIVE WEBSITE
- **NEVER** auto-deploys
- **MANUAL** deployment only
- Requires your explicit approval

## Safe Development Workflow

### 3. **Daily Development Process**

```bash
# 1. Create feature branch (SAFE - doesn't affect live site)
git checkout develop
git pull origin develop
git checkout -b feature/new-landing-page

# 2. Make changes and test locally
# 3. Commit changes (SAFE - only in feature branch)
git add .
git commit -m "Update landing page design"
git push origin feature/new-landing-page

# 4. Create Pull Request to 'develop' (NOT main)
# This allows review before merging
```

### 4. **When Ready to Go Live (Manual Only)**

```bash
# Step 1: Merge to staging for testing
git checkout staging
git merge develop
git push origin staging

# Deploy to staging server for testing
./deploy-staging.sh

# Step 2: Only after testing, deploy to production
git checkout main
git merge staging
git push origin main

# Step 3: MANUAL production deployment
./deploy-production.sh
```

## Server Setup with Git

### 5. **One-Time Server Setup**
```bash
# On your server (after SSL completes)
cd /var/www/rocketagents
git init
git remote add origin https://github.com/khalid1313/Rocketagents-1.0.git
git checkout main
```

### 6. **Production Deployment Script**