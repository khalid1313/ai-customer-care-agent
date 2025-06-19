# AI Customer Care Agent - Docker Setup

## Quick Start

1. **Copy environment template:**
   ```bash
   cp .env.docker .env
   ```

2. **Configure your environment:**
   Edit `.env` file with your actual API keys and settings.

3. **Deploy with Docker:**
   ```bash
   ./docker-deploy.sh
   ```

## Manual Setup

### Prerequisites
- Docker and Docker Compose installed
- Your API keys (OpenAI, Pinecone, Shopify)

### Configuration
1. Copy `.env.docker` to `.env`
2. Fill in all required values:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `PINECONE_API_KEY` - Your Pinecone API key  
   - `PINECONE_ENVIRONMENT` - Your Pinecone environment
   - `PINECONE_INDEX_NAME` - Your Pinecone index name
   - `SHOPIFY_DOMAIN` - Your Shopify store domain (optional)
   - `SHOPIFY_ACCESS_TOKEN` - Your Shopify access token (optional)

### Deployment Commands

**Start services:**
```bash
docker-compose -f docker-compose.aicare.yml up -d
```

**View logs:**
```bash
docker-compose -f docker-compose.aicare.yml logs -f
```

**Stop services:**
```bash
docker-compose -f docker-compose.aicare.yml down
```

**Rebuild and restart:**
```bash
docker-compose -f docker-compose.aicare.yml up --build -d
```

## Service URLs
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

## Volume Persistence
- `aicare-data` - Database and application data
- `aicare-logs` - Application logs

## Network
- Custom network: `aicare-network`
- All services communicate internally via this network

## Troubleshooting

**Services not starting:**
```bash
docker-compose -f docker-compose.aicare.yml ps
docker-compose -f docker-compose.aicare.yml logs
```

**Reset everything:**
```bash
docker-compose -f docker-compose.aicare.yml down -v
docker system prune -f
```

**Database issues:**
```bash
# Access backend container
docker exec -it aicare-backend sh
# Run Prisma commands
npx prisma migrate deploy
npx prisma db seed
```