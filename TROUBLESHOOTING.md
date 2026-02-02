# Troubleshooting: User Add/Revoke Not Working on MoaV VPS

## Problem
After updating the agent code, user add/revoke commands from dashboard are not working on the MoaV VPS.

## Root Cause
The agent code was updated to use the full path to `moav.sh` (`/opt/moav/moav.sh`), but:
1. The agent on the VPS hasn't been rebuilt/restarted with the new code yet
2. OR the moav.sh path/permissions need to be verified

## Solution Steps

### Step 1: Update the agent on your VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to the agent directory
cd /path/to/moav-manager/agent

# Pull latest changes
git pull origin master

# Install dependencies (if needed)
npm install

# Build the agent
npm run build
# This compiles TypeScript to JavaScript in the dist/ folder

# Check for build errors
echo "Exit code: $?"
# Should be 0 if successful
```

### Step 2: Verify MoaV installation

```bash
# Check if moav.sh exists
ls -la /opt/moav/moav.sh

# Make sure it's executable
chmod +x /opt/moav/moav.sh

# Test moav.sh directly
/opt/moav/moav.sh status

# Test user list command
/opt/moav/moav.sh user list

# If moav is installed elsewhere, find it:
find /opt -name "moav.sh" 2>/dev/null
find /root -name "moav.sh" 2>/dev/null
find $HOME -name "moav.sh" 2>/dev/null
```

### Step 3: Update agent .env if needed

```bash
# Edit agent .env file
nano /path/to/moav-manager/agent/.env

# Add or update this line if moav.sh is in a different location:
MOAV_PATH=/opt/moav/moav.sh

# Or if it's elsewhere:
# MOAV_PATH=/root/moav/moav.sh
```

### Step 4: Restart the agent

```bash
# If using PM2:
pm2 restart moav-agent
pm2 logs moav-agent --lines 50

# If using systemd:
systemctl restart moav-agent
journalctl -u moav-agent -n 50 -f

# If running directly:
pkill -f "node.*agent"
cd /path/to/moav-manager/agent
npm start
```

### Step 5: Test from dashboard

1. Add a new test user from the dashboard (e.g., "testuser123")
2. Watch the agent logs in real-time:
   ```bash
   pm2 logs moav-agent --lines 0
   # OR
   tail -f /path/to/agent/logs/agent.log
   ```
3. Check the commands table:
   ```sql
   SELECT id, type, status, error, created_at, completed_at
   FROM commands
   WHERE type = 'user:add'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

4. Verify on MoaV:
   ```bash
   /opt/moav/moav.sh user list
   ```

### Step 6: Debug failed commands

If the command shows as 'failed' in the database:

```sql
SELECT
    id,
    type,
    status,
    payload,
    error,
    result
FROM commands
WHERE type IN ('user:add', 'user:revoke')
    AND status = 'failed'
ORDER BY created_at DESC
LIMIT 3;
```

Common errors and solutions:

1. **"Command failed: /opt/moav/moav.sh user add..."**
   - moav.sh doesn't exist at that path
   - Solution: Find correct path and set MOAV_PATH in .env

2. **"Permission denied"**
   - moav.sh is not executable
   - Solution: `chmod +x /opt/moav/moav.sh`

3. **"No such file or directory"**
   - moav.sh doesn't exist
   - Solution: Verify MoaV installation location

4. **Command stuck in 'running' state**
   - Agent crashed or was restarted
   - Solution: Restart agent and reset stuck commands:
   ```sql
   UPDATE commands
   SET status = 'failed', error = 'Agent restarted'
   WHERE status = 'running'
       AND started_at < NOW() - INTERVAL '5 minutes';
   ```

## Quick Test Script

Run this test script on your VPS (already created in repo):

```bash
cd /path/to/moav-manager/agent
chmod +x test-moav.sh
./test-moav.sh
```

This will verify:
- moav.sh exists
- moav.sh is executable
- moav commands work

## Still Not Working?

1. Check agent logs for detailed errors
2. Run the SQL queries in `debug-commands.sql`
3. Verify the agent is actually polling for commands:
   ```bash
   pm2 logs moav-agent | grep "Processing user:add"
   ```

4. Check if agent can connect to Supabase:
   ```bash
   # Look for connection errors in logs
   pm2 logs moav-agent | grep -i "error\|failed\|supabase"
   ```
