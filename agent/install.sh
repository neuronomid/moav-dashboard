#!/bin/bash
# One-command installer for MoaV Agent
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/moav-manager/master/agent/install.sh | bash

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MoaV Agent Installer            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please do not run this script as root${NC}"
    echo "   Run as regular user with sudo access"
    exit 1
fi

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing Node.js 20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old. Need 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Git not found. Installing...${NC}"
    sudo apt-get update
    sudo apt-get install -y git
fi
echo -e "${GREEN}✓ Git $(git --version | cut -d' ' -f3)${NC}"

# Check MoaV installation
MOAV_PATH="/opt/moav/moav.sh"
if [ ! -f "$MOAV_PATH" ]; then
    echo -e "${RED}❌ MoaV not found at $MOAV_PATH${NC}"
    echo "   Please install MoaV first: https://github.com/shayanb/MoaV"
    exit 1
fi
echo -e "${GREEN}✓ MoaV installed${NC}"
echo ""

# Installation directory
INSTALL_DIR="/opt/moav-agent"

echo -e "${YELLOW}Installing to: $INSTALL_DIR${NC}"
echo ""

# Create directory
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠ Directory exists. Backing up...${NC}"
    sudo mv "$INSTALL_DIR" "$INSTALL_DIR.backup.$(date +%s)"
fi

sudo mkdir -p "$INSTALL_DIR"
sudo chown $USER:$USER "$INSTALL_DIR"

# Clone repository
echo -e "${YELLOW}Cloning repository...${NC}"
git clone https://github.com/YOUR_USERNAME/moav-manager.git "$INSTALL_DIR"
cd "$INSTALL_DIR/agent"
echo -e "${GREEN}✓ Repository cloned${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --quiet
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build
echo -e "${YELLOW}Building agent...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Configuration
echo -e "${YELLOW}Setting up configuration...${NC}"
if [ ! -f ".env" ]; then
    cat > .env <<EOF
# Supabase connection (get from your Supabase dashboard)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Agent token (get from MoaV Manager dashboard when adding server)
AGENT_TOKEN=

# MoaV installation path
MOAV_PATH=/opt/moav/moav.sh
EOF
    echo -e "${YELLOW}⚠ Created .env file - YOU MUST EDIT IT NOW${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi
echo ""

# Create systemd service
echo -e "${YELLOW}Creating systemd service...${NC}"
sudo tee /etc/systemd/system/moav-agent.service > /dev/null <<EOF
[Unit]
Description=MoaV Manager Agent
After=network.target docker.service
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR/agent
ExecStart=/usr/bin/node $INSTALL_DIR/agent/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=moav-agent

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
echo -e "${GREEN}✓ Systemd service created${NC}"
echo ""

# Final instructions
echo -e "${BLUE}╔════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Installation Complete!          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Configure the agent before starting:${NC}"
echo ""
echo "1. Edit the configuration file:"
echo -e "   ${BLUE}nano $INSTALL_DIR/agent/.env${NC}"
echo ""
echo "2. Add these required values:"
echo "   - SUPABASE_URL (from your Supabase project)"
echo "   - SUPABASE_SERVICE_ROLE_KEY (from Supabase Settings > API)"
echo "   - AGENT_TOKEN (from MoaV Manager dashboard)"
echo ""
echo "3. Start the agent:"
echo -e "   ${BLUE}sudo systemctl start moav-agent${NC}"
echo ""
echo "4. Enable auto-start on boot:"
echo -e "   ${BLUE}sudo systemctl enable moav-agent${NC}"
echo ""
echo "5. Check status:"
echo -e "   ${BLUE}sudo systemctl status moav-agent${NC}"
echo ""
echo "6. View logs:"
echo -e "   ${BLUE}sudo journalctl -u moav-agent -f${NC}"
echo ""
echo -e "${GREEN}For more details, see: $INSTALL_DIR/agent/INSTALL.md${NC}"
echo ""
