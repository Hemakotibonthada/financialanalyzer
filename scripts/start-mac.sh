#!/bin/bash

# Quick Start Script for macOS
# Starts both backend and frontend servers with network access

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "🚀 Financial Analyzer - Quick Start"
echo "=========================================="
echo ""

# Get IP
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | grep -v "inet 169.254" | awk '{print $2}' | head -n 1)

if [ -z "$IP" ]; then
    echo "❌ Could not detect IP address"
    exit 1
fi

echo -e "${GREEN}📍 Network IP: $IP${NC}"
echo ""
echo -e "${BLUE}📱 Access from mobile: http://$IP:3000${NC}"
echo ""
echo "Starting servers... (Press Ctrl+C to stop both)"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Start backend
cd backend
node server.js &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for backend to start..."
sleep 3

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ Servers started!${NC}"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
