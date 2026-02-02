# Quick Agent Deployment Guide

## Step 1: Update Your GitHub Repo

First, commit and push all the new changes to your public GitHub repository:

```bash
cd /Users/omid/Documents/Projects/moav-manager

# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "feat: add health monitoring and auto-remediation to agent"

# Push to GitHub (make sure to replace YOUR_USERNAME with your actual GitHub username)
git push origin master
```

## Step 2: Update the Scripts with Your GitHub Username

Before deploying, update these files with your actual GitHub username:

1. [agent/INSTALL.md](agent/INSTALL.md) - Replace `YOUR_USERNAME` with your GitHub username
2. [agent/install.sh](agent/install.sh) - Replace `YOUR_USERNAME` with your GitHub username

Quick replace command:
```bash
# Replace YOUR_USERNAME with your actual username (e.g., omidmohebbise)
sed -i '' 's/YOUR_USERNAME/your-actual-username/g' agent/INSTALL.md
sed -i '' 's/YOUR_USERNAME/your-actual-username/g' agent/install.sh
```

Then commit and push again:
```bash
git add agent/INSTALL.md agent/install.sh
git commit -m "fix: update GitHub username in installation scripts"
git push origin master
```

## Step 3: Deploy to Your VPS

SSH into your VPS and run:

```bash
# If you haven't installed the agent yet (first time):
cd /opt/moav-agent/agent
git pull origin master
npm install
npm run build
sudo systemctl restart moav-agent

# Or use the deploy script:
cd /opt/moav-agent/agent
./deploy.sh
```

## Step 4: Verify Installation

Check if the health monitor is running:

```bash
# View live logs
sudo journalctl -u moav-agent -f

# You should see these lines:
# - Health monitor (60s checks + auto-remediation)...
# [health-monitor] Starting health monitor...
```

## Step 5: Test the Dashboard

1. Open your MoaV Manager dashboard
2. Navigate to your server's overview page
3. Click on the **Health** card (it now says "Click for details")
4. You should see a dialog with:
   - Health status overview
   - Detected service issues
   - Auto-remediation history
   - Manual troubleshooting buttons

## What's New?

### Agent Improvements
- ✅ **Auto-healing health monitor** runs every 60 seconds
- ✅ Detects services stuck in "restarting" state (like your sing-box issue)
- ✅ Automatically attempts to fix issues:
  - First attempt: `docker compose restart`
  - Subsequent attempts: `docker compose down + up`
- ✅ Logs all remediation attempts to database
- ✅ Smart cooldown and retry limits to avoid flapping

### Dashboard Improvements
- ✅ **Clickable Health card** - Shows detailed health information
- ✅ **Auto-Remediation History** - See what the agent has fixed automatically
- ✅ **Manual Fix Buttons** - Manually restart problematic services
- ✅ **Service Logs Viewer** - View recent service logs
- ✅ **Real-time Status** - Live updates from the agent

## Health Monitor Behavior

The agent will automatically fix these issues:

| Issue | Detection Time | Action |
|-------|----------------|--------|
| Service stuck in "restarting" | 3 minutes | Restart → Recreate |
| Critical service stopped | Immediate | Start service |
| Service unhealthy | 3 minutes | Restart → Recreate |

**Cooldown**: 5 minutes between attempts
**Max Attempts**: 3 tries before giving up
**Reset**: After 1 hour, retry counter resets

## Testing

To test the auto-remediation with your sing-box issue:

1. Deploy the new agent (follow steps above)
2. Wait for the agent to detect sing-box is stuck (max 3 minutes)
3. Watch the logs: `sudo journalctl -u moav-agent -f`
4. You'll see:
   ```
   [health-monitor] 🔧 Detected issue with sing-box: Service stuck in restarting state for 180s
   [health-monitor] Attempting to restart sing-box...
   [health-monitor] ✓ Successfully remediated sing-box (attempt 1)
   ```
5. Check the dashboard - Health card should show the remediation event

## Troubleshooting

**"Health monitor not starting"**
- Make sure you rebuilt the agent: `npm run build`
- Check logs: `sudo journalctl -u moav-agent -n 50`

**"Dialog not showing"**
- Clear browser cache and refresh
- Check browser console for errors

**"Auto-remediation not working"**
- Verify Docker is accessible: `docker ps`
- Check MoaV path: `ls -la /opt/moav/moav.sh`
- Ensure agent can run Docker commands: `groups $USER` (should include 'docker')

## Need Help?

- Check full documentation: [agent/INSTALL.md](agent/INSTALL.md)
- View agent logs: `sudo journalctl -u moav-agent -f`
- Check agent status: `sudo systemctl status moav-agent`
