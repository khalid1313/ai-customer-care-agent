#!/bin/bash

# AI Customer Care Agent - Docker Deployment Script

echo "🚀 Deploying AI Customer Care Agent with Docker..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Please copy .env.docker to .env and fill in your configuration:"
    echo "   cp .env.docker .env"
    echo "   nano .env"
    exit 1
fi

# Build and start services
echo "🔨 Building and starting Docker containers..."
docker-compose -f docker-compose.aicare.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose -f docker-compose.aicare.yml ps

# Show logs
echo "📋 Recent logs:"
docker-compose -f docker-compose.aicare.yml logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo ""
echo "📊 To view logs: docker-compose -f docker-compose.aicare.yml logs -f"
echo "🛑 To stop: docker-compose -f docker-compose.aicare.yml down"
echo "🔄 To restart: docker-compose -f docker-compose.aicare.yml restart"