#!/bin/bash

echo "🔧 Killing any existing Node processes..."
pkill -f "node src/server.js" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

echo "⏳ Waiting for processes to stop..."
sleep 3

echo "🚀 Starting backend on port 3005..."
cd /Users/khalid/Documents/ai-customer-care-agent
PORT=3005 node src/server.js &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 5

echo "🎨 Starting frontend on port 3004..."
cd frontend
npm run dev -- --port 3004 &
FRONTEND_PID=$!

echo "✅ Servers started!"
echo "🔗 Backend: http://localhost:3005"
echo "🔗 Frontend: http://localhost:3004"
echo "🔑 Login: admin@example.com / admin123"

echo "Press Ctrl+C to stop all servers"
wait