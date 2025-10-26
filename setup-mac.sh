#!/bin/bash

# Financial Analyzer - macOS Network Setup Script
# This script configures the application for network access on macOS

echo "=========================================="
echo "🍎 Financial Analyzer - macOS Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get IP address (try multiple interfaces)
echo "🔍 Detecting network IP address..."
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | grep -v "inet 169.254" | awk '{print $2}' | head -n 1)

if [ -z "$IP" ]; then
    echo -e "${RED}❌ Could not detect IP address${NC}"
    echo "Please check your network connection and try again."
    exit 1
fi

echo -e "${GREEN}✅ IP Address detected: $IP${NC}"
echo ""

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: frontend directory not found${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Update .env file
echo "📝 Updating frontend/.env..."
cat > frontend/.env << EOL
# Frontend configuration
# Network/Mobile Access Mode - Access from any device on same network
VITE_API_URL=http://$IP:5001/api

VITE_APP_NAME=Financial Analyzer

# Current Network IP: $IP
# Access from mobile: http://$IP:3000
EOL

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Updated frontend/.env with IP: $IP${NC}"
else
    echo -e "${RED}❌ Failed to update .env file${NC}"
    exit 1
fi
echo ""

# Check Node.js installation
echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
NODE_PATH=$(which node)
echo -e "${GREEN}✅ Node.js $NODE_VERSION found at: $NODE_PATH${NC}"
echo ""

# Check npm installation
echo "🔍 Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm $NPM_VERSION installed${NC}"
echo ""

# Check if dependencies are installed
echo "🔍 Checking dependencies..."
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Backend dependencies not found. Installing...${NC}"
    cd backend && npm install && cd ..
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend dependencies installed${NC}"
    else
        echo -e "${RED}❌ Failed to install backend dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Backend dependencies found${NC}"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Frontend dependencies not found. Installing...${NC}"
    cd frontend && npm install && cd ..
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
    else
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Frontend dependencies found${NC}"
fi
echo ""

# Check firewall status
echo "🔍 Checking macOS Firewall..."
FIREWALL_STATUS=$(sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)

if [[ $FIREWALL_STATUS == *"enabled"* ]]; then
    echo -e "${YELLOW}⚠️  Firewall is enabled${NC}"
    echo ""
    read -p "Do you want to add Node.js to firewall exceptions? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Adding Node.js to firewall exceptions (requires sudo)..."
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$NODE_PATH"
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp "$NODE_PATH"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Node.js added to firewall exceptions${NC}"
        else
            echo -e "${YELLOW}⚠️  Could not modify firewall. You may need to add Node.js manually.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Skipped firewall configuration${NC}"
        echo "You may need to manually allow connections on ports 3000 and 5001"
    fi
else
    echo -e "${GREEN}✅ Firewall is disabled or already configured${NC}"
fi
echo ""

# Check if ports are in use
echo "🔍 Checking if ports are available..."
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 5001 (backend) is already in use${NC}"
    read -p "Do you want to kill the process using port 5001? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:5001 | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✅ Killed process on port 5001${NC}"
    fi
else
    echo -e "${GREEN}✅ Port 5001 is available${NC}"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Port 3000 (frontend) is already in use${NC}"
    read -p "Do you want to kill the process using port 3000? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✅ Killed process on port 3000${NC}"
    fi
else
    echo -e "${GREEN}✅ Port 3000 is available${NC}"
fi
echo ""

# Display network interfaces
echo "=========================================="
echo "📡 Network Interfaces"
echo "=========================================="
ifconfig | grep -A 1 "flags" | grep "inet " | grep -v 127.0.0.1 | awk '{print "   " $1 " " $2}'
echo ""

# Summary
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo -e "${BLUE}📱 Access URLs:${NC}"
echo -e "   ${GREEN}Frontend:${NC} http://$IP:3000"
echo -e "   ${GREEN}Backend:${NC}  http://$IP:5001"
echo ""
echo -e "${BLUE}🚀 To start the servers:${NC}"
echo ""
echo -e "   ${YELLOW}Terminal 1 - Backend:${NC}"
echo "   cd backend"
echo "   node server.js"
echo ""
echo -e "   ${YELLOW}Terminal 2 - Frontend:${NC}"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo -e "${BLUE}📱 From iPhone/iPad:${NC}"
echo "   1. Connect to the same WiFi network"
echo "   2. Open Safari"
echo "   3. Go to: http://$IP:3000"
echo ""
echo -e "${BLUE}🧪 Test Backend:${NC}"
echo "   curl http://$IP:5001/api/health"
echo ""
echo "=========================================="
echo ""

# Ask if user wants to start servers now
read -p "Do you want to start the servers now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting servers..."
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Start backend in background
    cd backend
    echo -e "${GREEN}Starting backend...${NC}"
    node server.js &
    BACKEND_PID=$!
    cd ..
    
    # Wait a bit for backend to start
    sleep 3
    
    # Start frontend
    cd frontend
    echo -e "${GREEN}Starting frontend...${NC}"
    npm run dev
    
    # When frontend stops, kill backend too
    kill $BACKEND_PID 2>/dev/null
else
    echo -e "${YELLOW}Servers not started. Run the commands above to start manually.${NC}"
fi
