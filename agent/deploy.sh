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

echo -e "${YELLOW}Step 5/6: Restarting agent...${NC}"

# Check if systemd service exists
if systemctl list-unit-files | grep -q "moav-agent.service"; then
    echo "  Using systemd service..."
    sudo systemctl restart moav-agent
    echo -e "${GREEN}✓ Agent restarted with systemd${NC}"
elif command -v pm2 &> /dev/null && pm2 list | grep -q moav-agent; then
    echo "  Using PM2..."
    pm2 restart moav-agent
    echo -e "${GREEN}✓ Agent restarted with PM2${NC}"
else
    echo -e "${YELLOW}  No service manager detected${NC}"
    echo -e "${YELLOW}  Please set up systemd service (see INSTALL.md)${NC}"
    echo ""
    echo "  Or start manually with:"
    echo "    npm start"
    exit 0
fi
echo ""

echo -e "${YELLOW}Step 6/6: Verifying agent is running...${NC}"
sleep 3

if systemctl is-active --quiet moav-agent 2>/dev/null; then
    echo -e "${GREEN}✓ Agent is running${NC}"
    echo ""
    echo "View logs: ${BLUE}sudo journalctl -u moav-agent -f${NC}"
    echo "Check status: ${BLUE}sudo systemctl status moav-agent${NC}"
elif command -v pm2 &> /dev/null && pm2 list | grep -q moav-agent; then
    echo -e "${GREEN}✓ Agent is running${NC}"
    echo ""
    echo "View logs: ${BLUE}pm2 logs moav-agent${NC}"
else
    echo -e "${RED}❌ Could not verify if agent is running${NC}"
fi
echo ""

echo "================================"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Try adding a user from the dashboard"
echo "2. Check if it appears in: $MOAV_PATH user list"
echo ""
