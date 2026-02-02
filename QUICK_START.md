# Quick Start: Health Monitoring Update

## Your Question: One Agent or Two?

**Answer: Just ONE agent!** 🎉

You're not creating a new agent. Your existing agent just got a new superpower:

### Before This Update:
```
Your VPS Agent:
├── ✓ Heartbeat (reports status)
├── ✓ Command Runner (executes dashboard commands)
├── ✓ Expiration Monitor (disables expired users)
└── ✓ Usage Monitor (tracks data usage)
```

### After This Update:
```
Your VPS Agent (Same One!):
├── ✓ Heartbeat (reports status)
├── ✓ Command Runner (executes dashboard commands)
├── ✓ Health Monitor (NEW! Auto-fixes issues) ⭐
├── ✓ Expiration Monitor (disables expired users)
└── ✓ Usage Monitor (tracks data usage)
```

**Still ONE agent, now with 5 monitors instead of 4!**

## What Changed?

### Agent Side (VPS):
- Added [health-monitor.ts](agent/src/monitors/health-monitor.ts) - automatically detects and fixes service issues
- Updated [index.ts](agent/src/index.ts) - starts the health monitor on agent startup

### Dashboard Side:
- Made the Health card clickable
- Shows detailed health info, auto-remediation history, and logs
- Added manual "Fix Now" buttons for service issues

## How to Deploy (3 Steps)

### Step 1: Push to GitHub

```bash
# From your project root
git add .
git commit -m "feat: add health monitoring with auto-remediation"
git push origin master
```

### Step 2: Update Agent on VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to agent directory
cd /opt/moav-agent/agent

# Pull, build, restart
git pull origin master
npm install
npm run build
sudo systemctl restart moav-agent

# Watch it start with the new health monitor
sudo journalctl -u moav-agent -f
```

You should see:
```
Starting services:
- Heartbeat (15s interval)...
- Command runner (5s poll)...
- Health monitor (60s checks + auto-remediation)...  ← NEW!
- Expiration monitor (hourly check)...
- Usage monitor (15min updates)...
```

### Step 3: Test It Out

1. Open your dashboard and go to your server's overview page
2. Click on the **Health** card (now says "Click for details")
3. See the health dialog with three tabs:
   - **Overview**: Current status + manual troubleshooting
   - **Auto-Remediation**: History of automatic fixes
   - **Service Logs**: Recent service logs

## How It Works

The agent now runs a health check every 60 seconds and:

1. **Detects Issues**:
   - sing-box stuck in "restarting" for > 3 minutes ✓
   - Critical services stopped ✓
   - Services running but unhealthy ✓

2. **Auto-Fixes**:
   - First try: `docker compose restart <service>`
   - If fails: `docker compose down + up <service>`
   - Logs everything to database

3. **Smart Retry**:
   - Max 3 attempts per issue
   - 5-minute cooldown between attempts
   - Resets after 1 hour

## Your sing-box Issue

The agent will now automatically fix your sing-box restart problem:

```
[health-monitor] 🔧 Detected issue with sing-box: Service stuck in restarting state for 180s
[health-monitor] Attempting to restart sing-box...
[health-monitor] ✓ Successfully remediated sing-box (attempt 1)
```

This happens automatically - no manual intervention needed!

## Troubleshooting

**Build error?** → Already fixed! The health dialog now uses the correct database schema.

**Agent not starting health monitor?**
```bash
# Check if you rebuilt after pulling
cd /opt/moav-agent/agent
npm run build
sudo systemctl restart moav-agent
```

**Dashboard not showing dialog?**
```bash
# Rebuild the dashboard
npm run build
# Or just hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

## Summary

✅ One agent (not two)
✅ Same agent, enhanced with health monitoring
✅ Automatically fixes sing-box and other service issues
✅ Dashboard shows health details and remediation history
✅ Manual troubleshooting buttons available

Ready to deploy? Follow the 3 steps above!
