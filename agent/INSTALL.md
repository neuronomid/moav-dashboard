# MoaV Agent Installation Guide

Quick and easy installation guide for deploying the MoaV Agent on your VPS.

## Prerequisites

- Ubuntu/Debian VPS with root access
- MoaV already installed at `/opt/moav`
- Node.js 18+ installed
- Git installed

## One-Command Installation

Run this on your VPS to install the agent:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/moav-manager/master/agent/install.sh | bash
```

Or manual installation (recommended for first-time setup):

## Manual Installation

### Step 1: Install Node.js (if not already installed)

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 2: Clone the Repository

```bash
# Clone to /opt/moav-agent (recommended location)
sudo mkdir -p /opt/moav-agent
sudo chown $USER:$USER /opt/moav-agent
cd /opt/moav-agent
git clone https://github.com/YOUR_USERNAME/moav-manager.git .
cd agent
```

### Step 3: Configure Environment

```bash
# Copy the example .env file
cp .env.example .env

# Edit with your credentials
nano .env
```

Add these values:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AGENT_TOKEN=your_agent_token_from_dashboard
MOAV_PATH=/opt/moav/moav.sh
```

### Step 4: Build and Install

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Test the agent
npm start
```

Press `Ctrl+C` to stop the test run.

### Step 5: Set Up as System Service (Recommended)

Create a systemd service for automatic startup and management:

```bash
# Create the service file
sudo tee /etc/systemd/system/moav-agent.service > /dev/null <<EOF
[Unit]
Description=MoaV Manager Agent
After=network.target docker.service
Wants=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/moav-agent/agent
ExecStart=/usr/bin/node /opt/moav-agent/agent/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=moav-agent

# Environment
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable moav-agent

# Start the agent
sudo systemctl start moav-agent

# Check status
sudo systemctl status moav-agent
```

### Step 6: Verify Installation

```bash
# Check agent status
sudo systemctl status moav-agent

# View live logs
sudo journalctl -u moav-agent -f

# Check if agent is connected to dashboard
# You should see heartbeat messages every 15 seconds
```

## Updating the Agent

When you push updates to GitHub, run this on your VPS:

```bash
cd /opt/moav-agent/agent
./deploy.sh
```

Or use the quick update command:

```bash
cd /opt/moav-agent/agent && git pull && npm install && npm run build && sudo systemctl restart moav-agent
```

## Useful Commands

```bash
# Start agent
sudo systemctl start moav-agent

# Stop agent
sudo systemctl stop moav-agent

# Restart agent
sudo systemctl restart moav-agent

# View status
sudo systemctl status moav-agent

# View logs (live)
sudo journalctl -u moav-agent -f

# View last 100 log lines
sudo journalctl -u moav-agent -n 100

# Disable auto-start
sudo systemctl disable moav-agent

# Enable auto-start
sudo systemctl enable moav-agent
```

## Troubleshooting

### Agent won't start

```bash
# Check logs for errors
sudo journalctl -u moav-agent -n 50

# Verify environment variables
cat /opt/moav-agent/agent/.env

# Test MoaV connection
/opt/moav/moav.sh status
```

### Can't connect to Supabase

```bash
# Test Supabase connection
curl -I https://your-project.supabase.co/rest/v1/

# Check firewall
sudo ufw status
```

### Agent connected but commands not working

```bash
# Verify MoaV is accessible
ls -la /opt/moav/moav.sh
/opt/moav/moav.sh status

# Check agent has permission
groups $USER  # Should include 'docker' if using Docker
```

## What the Agent Does

The agent includes these monitors:

1. **Heartbeat** (15s) - Sends service status to dashboard
2. **Command Runner** (5s) - Executes commands from dashboard
3. **Health Monitor** (60s) - Auto-fixes service issues (NEW!)
4. **Expiration Monitor** (1h) - Disables expired VPN users
5. **Usage Monitor** (15m) - Tracks data usage per user

The new **Health Monitor** automatically detects and fixes:
- Services stuck in "restarting" state
- Critical services that are stopped
- Unhealthy services

## Security Notes

- The agent uses a service role key with full database access
- Keep your `.env` file secure (`chmod 600 .env`)
- The agent token uniquely identifies your server
- Never commit `.env` to Git

## Next Steps

After installation:
1. Check the dashboard - your server should show as "Online"
2. Try adding a VPN user from the dashboard
3. Monitor the agent logs to see it execute commands
4. The health monitor will automatically fix any service issues

## Getting Help

- Check logs: `sudo journalctl -u moav-agent -f`
- GitHub Issues: https://github.com/YOUR_USERNAME/moav-manager/issues
