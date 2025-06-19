# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY *.js ./

# Create necessary directories
RUN mkdir -p logs

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001
RUN chown -R backend:nodejs /app
USER backend

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');const options={hostname:'localhost',port:3001,path:'/health',method:'GET'};const req=http.request(options,(res)=>{if(res.statusCode===200){process.exit(0)}else{process.exit(1)}});req.on('error',()=>process.exit(1));req.end();"

# Start the application
CMD ["node", "src/server.js"]