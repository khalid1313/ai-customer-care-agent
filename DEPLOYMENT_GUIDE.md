# Deployment Guide for rocketagents.ai

This guide explains how to deploy the AI Customer Care Agent to both local development and production environments.

## 🏠 Local Development

The application is already configured to work on localhost with auto-discovery of backend ports.

### Quick Start
```bash
# Start backend
npm start

# Start frontend (in another terminal)
cd frontend
npm run dev
```

The frontend will auto-discover the backend running on any common port (3001-3008).

## 🚀 Production Deployment to rocketagents.ai

### Environment Configuration

The application automatically detects the environment:
- **Local**: `localhost` or `127.0.0.1` → Uses auto-discovery
- **Production**: `rocketagents.ai` → Uses `https://rocketagents.ai`

### Deployment Options

#### Option 1: Docker Compose (Recommended)

1. **Build and deploy using Docker Compose:**
```bash
docker-compose -f docker-compose.production.yml up -d
```

2. **Configure SSL certificates:**
   - Place your SSL certificates in `./ssl/` directory
   - Update paths in `nginx.conf` if needed

#### Option 2: Manual Deployment

1. **Build frontend:**
```bash
cd frontend
npm run build
```

2. **Deploy backend:**
```bash
npm install
npm start
```

3. **Configure reverse proxy (Nginx/Apache) to:**
   - Serve frontend on port 443 (HTTPS)
   - Proxy `/api/*` requests to backend on port 3001

### Environment Variables

#### Production (.env.production)
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://rocketagents.ai
NEXT_PUBLIC_API_URL=https://rocketagents.ai
NEXT_PUBLIC_BACKEND_URL=https://rocketagents.ai
```

#### Development (.env.local)
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:3006
```

### Domain Configuration

The application is configured for `rocketagents.ai` with:
- ✅ **HTTPS support** (SSL required for production)
- ✅ **Automatic environment detection**
- ✅ **CORS configuration** for the domain
- ✅ **Security headers** for production

### GitHub Actions Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:
1. ✅ **Installs dependencies**
2. ✅ **Builds the application**
3. ✅ **Deploys on push to main/master**

### Required Infrastructure

#### For rocketagents.ai:
1. **Domain**: `rocketagents.ai` with DNS pointing to your server
2. **SSL Certificate**: Valid SSL certificate for HTTPS
3. **Server**: Linux server with Docker support
4. **Ports**: 80 (HTTP redirect), 443 (HTTPS), 3001 (backend)

### Security Features

#### Production Security:
- ✅ **HTTPS enforcement**
- ✅ **Security headers** (X-Frame-Options, CSP, etc.)
- ✅ **CORS protection**
- ✅ **Environment isolation**

### Database

The application uses SQLite database (`dev.db`):
- **Development**: Local file
- **Production**: Persistent volume in Docker or server filesystem

### Testing the Deployment

#### Local Testing:
```bash
# Check frontend
curl http://localhost:3000

# Check backend
curl http://localhost:3006/api/auth/login
```

#### Production Testing:
```bash
# Check frontend
curl https://rocketagents.ai

# Check backend API
curl https://rocketagents.ai/api/auth/login
```

### Troubleshooting

#### Common Issues:

1. **Environment Detection**
   - Check browser console for environment logs
   - Verify hostname matches `rocketagents.ai`

2. **API Connection**
   - Ensure backend is running on correct port
   - Check CORS configuration
   - Verify SSL certificates

3. **Database Issues**
   - Ensure database file has proper permissions
   - Run Prisma migrations: `npx prisma db push`

### Monitoring

#### Health Checks:
- **Frontend**: `https://rocketagents.ai`
- **Backend**: `https://rocketagents.ai/api/auth/login`
- **Database**: Check application logs

### Backup Strategy

#### Important Files to Backup:
- `dev.db` (SQLite database)
- `prisma/` (Database schema)
- Environment configuration files
- SSL certificates

---

## 📝 Quick Commands

### Local Development
```bash
npm start                    # Start backend
cd frontend && npm run dev   # Start frontend
```

### Production Build
```bash
cd frontend && npm run build # Build frontend
docker-compose -f docker-compose.production.yml up -d # Deploy
```

### Database Management
```bash
npx prisma db push          # Apply schema changes
npx prisma studio           # Open database browser
```

The application is now ready for deployment to `rocketagents.ai`! 🚀