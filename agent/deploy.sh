#!/bin/bash
# Simple deployment script for MoaV Agent
# This script updates and restarts the agent on your VPS

set -e  # Exit on any error

echo "🚀 MoaV Agent Deployment Script"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the agent directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the agent directory${NC}"
    echo "   cd /path/to/moav-manager/agent && ./deploy.sh"
    exit 1
fi

echo -e "${YELLOW}Step 1/6: Pulling latest changes from GitHub...${NC}"
git pull origin master || {
    echo -e "${RED}❌ Failed to pull from GitHub${NC}"
    exit 1
}
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

echo -e "${YELLOW}Step 2/6: Installing dependencies...${NC}"
npm install || {
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
}
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 3/6: Building TypeScript...${NC}"
npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

echo -e "${YELLOW}Step 4/6: Checking MoaV installation...${NC}"
MOAV_PATH="${MOAV_PATH:-/opt/moav/moav.sh}"
if [ -f "$MOAV_PATH" ]; then
    echo -e "${GREEN}✓ Found moav.sh at: $MOAV_PATH${NC}"

    # Make sure it's executable
    if [ ! -x "$MOAV_PATH" ]; then
        echo -e "${YELLOW}  Making moav.sh executable...${NC}"
        chmod +x "$MOAV_PATH"
    fi
else
    echo -e "${RED}❌ Warning: moav.sh not found at $MOAV_PATH${NC}"
    echo "   Please set MOAV_PATH in your .env file"
fi
echo ""

echo -e "${YELLOW}Step 5/6: Checking for running agent...${NC}"

# Try different methods to find and stop the agent
if command -v pm2 &> /dev/null; then
    echo "  Using PM2..."
    pm2 restart moav-agent 2>/dev/null || pm2 start npm --name moav-agent -- start
    echo -e "${GREEN}✓ Agent restarted with PM2${NC}"
elif systemctl is-active --quiet moav-agent 2>/dev/null; then
    echo "  Using systemd..."
    sudo systemctl restart moav-agent
    echo -e "${GREEN}✓ Agent restarted with systemd${NC}"
else
    echo -e "${YELLOW}  Starting agent manually...${NC}"
    # Kill any existing node process running the agent
    pkill -f "node.*agent" 2>/dev/null || true
    sleep 2

    # Start the agent
    npm start &
    echo -e "${GREEN}✓ Agent started${NC}"
fi
echo ""

echo -e "${YELLOW}Step 6/6: Verifying agent is running...${NC}"
sleep 3

if command -v pm2 &> /dev/null; then
    pm2 list | grep moav-agent && echo -e "${GREEN}✓ Agent is running${NC}" || echo -e "${RED}❌ Agent may not be running${NC}"
    echo ""
    echo "To view logs: pm2 logs moav-agent"
elif pgrep -f "node.*agent" > /dev/null; then
    echo -e "${GREEN}✓ Agent process is running${NC}"
    echo ""
    echo "To view logs: journalctl -u moav-agent -f"
else
    echo -e "${YELLOW}⚠ Could not verify if agent is running${NC}"
fi
echo ""

echo "================================"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Try adding a user from the dashboard"
echo "2. Check if it appears in: $MOAV_PATH user list"
echo ""
