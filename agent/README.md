# MoaV Manager Agent

Production-ready agent that connects your MoaV VPN server to the management dashboard.

## Features

✅ **User Management**
- Automatically creates users on MoaV with all protocol configs
- Generates and stores client configuration files
- Revokes users from all protocols
- Updates user access policies

✅ **Automatic Monitoring**
- **Expiration Check**: Automatically revokes users when their expiry date is reached (hourly check)
- **Data Usage Tracking**: Monitors bandwidth usage per user (updates every 15 minutes)
- **Data Limit Enforcement**: Automatically revokes users who exceed their data quota

✅ **Real-time Control**
- Start/stop/restart VPN services
- View service logs
- Get server status
- Test user connectivity
- Export/backup server configuration

✅ **Production Ready**
- Graceful shutdown handling
- Error recovery
- Automatic reconnection
- Comprehensive logging

## Installation

### Prerequisites

- Node.js 18+ installed
- MoaV installed at `/opt/moav/` (or set custom path in `.env`)
- Supabase project with the dashboard database

### Quick Setup

1. **Clone the repository** (if not already done):
   ```bash
   cd /opt
   git clone https://github.com/neuronomid/moav-dashboard.git moav-manager
   cd moav-manager/agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the agent**:
   ```bash
   npm run build
   ```

4. **Create environment file**:
   ```bash
   cp .env.example .env
   nano .env
   ```

5. **Configure `.env` file**:
   ```env
   # Supabase connection (from your dashboard settings)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Agent token (from dashboard when adding a server)
   AGENT_TOKEN=your-agent-token-here

   # MoaV installation path (default: /opt/moav/moav.sh)
   MOAV_PATH=/opt/moav/moav.sh
   ```

6. **Start the agent**:
   ```bash
   npm start
   ```

## Running as a Service

### Option 1: Using systemd (Recommended)

Create `/etc/systemd/system/moav-agent.service`:

```ini
[Unit]
Description=MoaV Manager Agent
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/moav-manager/agent
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=moav-agent

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl enable moav-agent
systemctl start moav-agent
systemctl status moav-agent

# View logs:
journalctl -u moav-agent -f
```

### Option 2: Using PM2

```bash
npm install -g pm2
cd /opt/moav-manager/agent
pm2 start dist/index.js --name moav-agent
pm2 save
pm2 startup  # Follow instructions to enable auto-start

# View logs:
pm2 logs moav-agent
```

## Monitoring & Maintenance

### Check Agent Status

```bash
# With systemd:
systemctl status moav-agent
journalctl -u moav-agent -n 50

# With PM2:
pm2 status
pm2 logs moav-agent --lines 50
```

### Update Agent

```bash
cd /opt/moav-manager/agent
git pull origin master
npm install
npm run build

# Restart service:
systemctl restart moav-agent  # or: pm2 restart moav-agent
```

### Troubleshooting

**Agent not connecting:**
- Check `AGENT_TOKEN` is correct in `.env`
- Verify Supabase credentials
- Check network connectivity: `curl https://your-project.supabase.co`

**Commands not executing:**
- Check MoaV path: `ls -la /opt/moav/moav.sh`
- Verify moav.sh is executable: `chmod +x /opt/moav/moav.sh`
- Test manually: `/opt/moav/moav.sh status`

**Users not being created:**
- Check agent logs for errors
- Verify MoaV is running: `/opt/moav/moav.sh status`
- Check database for failed commands:
  ```sql
  SELECT * FROM commands WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5;
  ```

## Architecture

### Core Services

1. **Heartbeat** (15s interval)
   - Updates last_seen_at in database
   - Keeps connection alive

2. **Command Runner** (5s poll)
   - Fetches pending commands from database
   - Executes MoaV CLI commands
   - Returns results to database

3. **Expiration Monitor** (hourly)
   - Checks for expired users
   - Automatically revokes expired accounts

4. **Usage Monitor** (15min)
   - Tracks data usage per user
   - Enforces data limits
   - Updates usage statistics

### Command Types

| Type | Action |
|------|--------|
| `user:add` | Create user with all protocol configs |
| `user:revoke` | Remove user from all protocols |
| `user:update` | Update user settings |
| `user:update-access` | Modify protocol access |
| `service:start` | Start VPN service/profile |
| `service:stop` | Stop VPN service |
| `service:restart` | Restart VPN service |
| `server:status` | Get server health status |
| `server:logs` | Fetch service logs |
| `server:export` | Create backup |
| `server:test` | Test user connectivity |

## Development

### Project Structure

```
agent/
├── src/
│   ├── commands/          # Command handlers
│   │   ├── index.ts       # Command registry
│   │   ├── real.ts        # Production commands
│   │   └── stubs.ts       # Test stubs
│   ├── monitors/          # Background monitors
│   │   ├── expiration-monitor.ts
│   │   └── usage-monitor.ts
│   ├── lib/
│   │   └── shell.ts       # Shell command runner
│   ├── command-runner.ts  # Command processor
│   ├── heartbeat.ts       # Heartbeat service
│   ├── supabase.ts        # Database client
│   └── index.ts           # Main entry point
├── dist/                  # Compiled JavaScript
├── package.json
└── tsconfig.json
```

### Scripts

- `npm run dev` - Run in development mode with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled agent

## Security Notes

- Keep your `AGENT_TOKEN` secret
- Rotate tokens periodically
- Use service-role key only on the server, never in client code
- Review command logs regularly
- Keep agent updated

## Support

For issues, check:
1. Agent logs (systemd/PM2)
2. MoaV logs: `/opt/moav/moav.sh logs`
3. Database commands table for errors
4. GitHub issues: https://github.com/neuronomid/moav-dashboard/issues
