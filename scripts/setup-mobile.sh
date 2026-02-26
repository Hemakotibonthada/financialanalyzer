#!/bin/bash

# Financial Analyzer - Mobile App Initialization Script
# This script helps set up the React Native project structure

echo "================================================"
echo "  Financial Analyzer - Mobile App Setup"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo -e "${RED}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js installed: $(node --version)${NC}"

# Check if we're in the right directory
if [ ! -d "mobile" ]; then
    echo -e "${RED}❌ Please run this script from the Financial_Analyzer root directory${NC}"
    exit 1
fi

echo ""
echo "================================================"
echo "  Step 1: Installing React Native CLI"
echo "================================================"
npm install -g react-native-cli

echo ""
echo "================================================"
echo "  Step 2: Checking if native folders exist"
echo "================================================"

if [ -d "mobile/android" ] && [ -d "mobile/ios" ]; then
    echo -e "${GREEN}✅ Native folders already exist!${NC}"
    echo ""
    echo -e "${YELLOW}Skipping initialization. Proceeding to install dependencies...${NC}"
else
    echo -e "${YELLOW}Native folders not found. Initializing React Native project...${NC}"
    echo ""
    
    # Backup our custom files
    echo -e "${YELLOW}Backing up custom files...${NC}"
    BACKUP_DIR="mobile_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "mobile/src" ]; then
        cp -r mobile/src "$BACKUP_DIR/src"
    fi
    cp mobile/package.json "$BACKUP_DIR/package.json"
    cp mobile/*.md "$BACKUP_DIR/" 2>/dev/null || :
    
    echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
    echo ""
    
    # Initialize React Native project
    echo -e "${YELLOW}Initializing React Native project (this may take a few minutes)...${NC}"
    npx react-native@0.73.2 init FinancialAnalyzerTemp --version 0.73.2
    
    # Move native folders to mobile directory
    echo -e "${YELLOW}Moving native folders...${NC}"
    if [ -d "FinancialAnalyzerTemp/android" ]; then
        mv FinancialAnalyzerTemp/android mobile/android
    fi
    if [ -d "FinancialAnalyzerTemp/ios" ]; then
        mv FinancialAnalyzerTemp/ios mobile/ios
    fi
    
    # Clean up temp directory
    rm -rf FinancialAnalyzerTemp
    
    # Restore custom files
    echo -e "${YELLOW}Restoring custom files...${NC}"
    cp -r "$BACKUP_DIR/src" mobile/src
    cp "$BACKUP_DIR/package.json" mobile/package.json
    cp "$BACKUP_DIR"/*.md mobile/ 2>/dev/null || :
    
    echo -e "${GREEN}✅ React Native project initialized!${NC}"
fi

echo ""
echo "================================================"
echo "  Step 3: Installing Dependencies"
echo "================================================"
cd mobile
npm install

echo ""
echo "================================================"
echo "  Step 4: Linking Vector Icons"
echo "================================================"
npx react-native link react-native-vector-icons

# iOS specific setup
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "================================================"
    echo "  Step 5: Installing iOS Pods"
    echo "================================================"
    cd ios
    pod install
    cd ..
fi

echo ""
echo "================================================"
echo -e "  ${GREEN}✅ Setup Complete!${NC}"
echo "================================================"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "${NC}1. Update API URL in src/services/api.js${NC}"
echo -e "${NC}2. Start the backend server: cd ../backend && npm run dev${NC}"
echo -e "${NC}3. For Android: npm run android${NC}"
echo -e "${NC}4. For iOS (macOS only): npm run ios${NC}"
echo ""
echo -e "${CYAN}For detailed instructions, see MOBILE_SETUP_GUIDE.md${NC}"
echo ""

cd ..
