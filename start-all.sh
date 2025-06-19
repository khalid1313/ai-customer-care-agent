#!/bin/bash

echo "🚀 Starting AI Customer Care Platform..."
echo ""

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Start backend
echo "📡 Starting backend server on port 3002..."
cd /Users/khalid/Documents/ai-customer-care-agent
npm run dev &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend
echo "💻 Starting frontend server on port 5173..."
cd /Users/khalid/Documents/ai-customer-care-agent/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting!"
echo ""
echo "📍 Backend API: http://localhost:3002"
echo "🌐 Frontend App: http://localhost:5173"
echo ""
echo "🎯 Demo Login:"
echo "   Email: admin@example.com"
echo "   Password: admin123"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait