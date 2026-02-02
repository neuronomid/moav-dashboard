# CLAUDE.md — MoaV Manager Project Context

## Project Overview

MoaV Manager is a web dashboard for managing MoaV (Mother of All VPNs) installs across multiple VPS servers. Single-admin, agent-based control plane. Built with Next.js 15 + Supabase.

## MoaV Capability Mapping

MoaV (https://github.com/shayanb/MoaV) is a Docker-based multi-protocol censorship circumvention stack. CLI: `moav.sh`.

### Protocols & Ports

| Protocol | Port | Docker Service | Profile |
|----------|------|----------------|---------|
| Reality (VLESS) | 443/tcp | sing-box | proxy |
| Trojan | 8443/tcp | sing-box | proxy |
| Hysteria2 | 443/udp | sing-box | proxy |
| WireGuard (direct) | 51820/udp | wireguard | wireguard |
| WireGuard (wstunnel) | 8080/tcp | wstunnel | wireguard |
| dnstt (DNS tunnel) | 53/udp | dnstt | dnstt |
| Psiphon Conduit | - | psiphon-conduit | conduit |
| Tor Snowflake | - (host net) | snowflake | snowflake |
| Admin Dashboard | 9443/tcp | admin | admin |
| Certbot (TLS) | 80/tcp | certbot | proxy,wireguard,dnstt |
| Decoy Website | 80/tcp | decoy | proxy |

### MoaV CLI Commands (Agent Must Map These)

**Service control:**
- `moav start [PROFILE...]` — Start services by profile (proxy, wireguard, dnstt, admin, conduit, snowflake, all)
- `moav stop [SERVICE...]` — Stop services (defaults to all)
- `moav restart [SERVICE...]` — Restart services
- `moav status` — Show service health, uptime, ports
- `moav logs [SERVICE] [-n]` — Tail logs (-n disables follow)
- `moav build [SERVICE...]` — Rebuild Docker images

**User management:**
- `moav user add USERNAME [--package]` — Create user across all protocols, optionally ZIP the bundle
- `moav user revoke USERNAME` — Remove user from all protocols
- `moav user list` — List users with existing bundles
- `moav user package USERNAME` — ZIP existing user bundle

**Server operations:**
- `moav export [FILE]` — Backup .env, keys, bundles, certs as tarball
- `moav import FILE` — Restore from backup (detects IP mismatch)
- `moav migrate-ip NEW_IP` — Update IP in all client configs
- `moav update` — Git pull latest changes
- `moav bootstrap` — First-time setup: generate keys, get certs, create initial users
- `moav regenerate-users` — Rebuild all user bundles with current settings

**Testing:**
- `moav test USERNAME [--json]` — Test protocol connectivity for a user

### User Credential Generation Details

**sing-box protocols (Reality, Trojan, Hysteria2):**
- Script: `scripts/singbox-user-add.sh`
- Reality: UUID generated via `sing-box generate uuid` or `uuidgen`
- Trojan/Hysteria2: 24-char password via `openssl rand -base64 18`
- Credentials stored: `state/users/$USERNAME/credentials.env` (USER_ID, USER_UUID, USER_PASSWORD, CREATED_AT)
- Config modified: `configs/sing-box/config.json` — user appended to each inbound via `jq`
- Bundle output: `outputs/bundles/$USERNAME/` — reality.txt, trojan.txt, hysteria2.txt + QR PNGs
- Hot reload: `sing-box reload` or container restart

**WireGuard:**
- Script: `scripts/wg-user-add.sh`
- Keys: `wg genkey` + `wg pubkey` (via Docker or local)
- IP assignment: auto-increment from 10.66.66.2 within /24
- IPv6: `fd00:moav:wg::$NEXT_IP` if enabled
- Config modified: `configs/wireguard/wg0.conf` — new [Peer] block appended
- Bundle output: wireguard.conf, wireguard-ipv6.conf, wireguard-wstunnel.conf, wireguard-instructions.txt, QR PNG
- Credentials: `state/users/$USERNAME/wireguard.env`

**dnstt (DNS Tunnel):**
- Script: `scripts/dnstt-user-add.sh`
- Bundle output: dnstt.txt (DNS tunnel connection config)
- Agent reads: `outputs/bundles/$USERNAME/dnstt.txt` when creating users
- Config stored in `vpn_users.config_raw` for dashboard display

### User Revocation Details

**sing-box:** `scripts/singbox-user-revoke.sh` — uses `jq` to filter user from all inbounds in `config.json`, validates JSON, then reloads sing-box
**WireGuard:** `scripts/wg-user-revoke.sh` — AWK removes [Peer] block from wg0.conf, live-removes via `wg set wg0 peer <PUBKEY> remove`

### MoaV Directory Structure (on VPS)

```
/opt/moav/                    (or wherever cloned)
├── moav.sh                   # CLI tool
├── docker-compose.yml        # Service definitions
├── .env                      # Server config
├── configs/
│   ├── sing-box/config.json  # Reality/Trojan/Hysteria2 config
│   ├── wireguard/wg0.conf    # WireGuard server config
│   └── dnstt/                # DNS tunnel config
├── state/
│   └── users/$USERNAME/      # Per-user credentials
│       ├── credentials.env   # sing-box creds
│       └── wireguard.env     # WG creds
├── outputs/
│   └── bundles/$USERNAME/    # Generated client configs
│       ├── reality.txt       # VLESS link
│       ├── trojan.txt        # Trojan link
│       ├── hysteria2.txt     # Hysteria2 link
│       ├── wireguard.conf    # WG direct config
│       ├── wireguard-wstunnel.conf
│       ├── dnstt.txt         # DNS tunnel config
│       ├── *.png             # QR codes
│       └── $USERNAME.zip     # Full bundle (if --package)
├── scripts/                  # Automation scripts
├── web/                      # Decoy website
└── admin/                    # Stats dashboard
```

### MoaV .env Key Variables

- `DOMAIN` — Server domain (required)
- `ACME_EMAIL` — Let's Encrypt email
- `ADMIN_PASSWORD` — Admin dashboard password
- `SERVER_IP` / `SERVER_IPV6` — Auto-detected or manual
- Protocol toggles: `ENABLE_REALITY`, `ENABLE_TROJAN`, `ENABLE_HYSTERIA2`, `ENABLE_WIREGUARD`, `ENABLE_DNSTT`, `ENABLE_ADMIN_UI`
- `REALITY_TARGET` — TLS camouflage target (default: www.microsoft.com:443)
- `DEFAULT_PROFILES` — Which profiles start by default
- `LOG_LEVEL` — debug/info/warn/error

## Agent Command Allowlist Mapping

The dashboard agent translates command records into MoaV CLI calls:

| Command Type | MoaV CLI Equivalent | Payload |
|-------------|---------------------|---------|
| `service:start` | `moav start $PROFILE` | `{ service: string }` |
| `service:stop` | `moav stop $SERVICE` | `{ service: string }` |
| `service:restart` | `moav restart $SERVICE` | `{ service: string }` |
| `server:status` | `moav status` | `{}` |
| `server:logs` | `moav logs $SERVICE -n` | `{ service: string, lines?: number }` |
| `user:add` | `moav user add $USERNAME --package` | `{ username: string }` |
| `user:revoke` | `moav user revoke $USERNAME` | `{ username: string }` |
| `user:update-access` | revoke + selective re-add per protocol | `{ username: string, access_policy: Record<string, boolean> }` |
| `server:export` | `moav export` | `{}` |
| `server:test` | `moav test $USERNAME --json` | `{ username: string }` |

## Dashboard Architecture

- **Frontend**: Next.js 15 App Router + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/DB**: Supabase (Postgres + Auth + Realtime)
- **Deploy**: Vercel (frontend), VPS (agent)
- **Auth**: Single admin via Supabase email/password
- **Agent comms**: Agent polls Supabase directly using service-role key; dashboard subscribes to Realtime

## Database Tables

- `servers` — VPS registry with agent_token, status_json, last_seen_at
- `vpn_users` — Per-server VPN users with access_policy (JSON toggles)
- `vpn_user_access_effective` — What's actually active after policy applied
- `commands` — Job queue: queued → running → succeeded/failed (Realtime enabled)
- `log_events` — Rolling log lines per server/service (Realtime enabled)

## Hard Constraints

- One MoaV install per VPS
- No multi-tenant/billing features
- No time-series historical data
- Agent uses strict command allowlist (no arbitrary shell)
- Secrets redacted from logs, never stored plaintext
- New VPN users get all services enabled by default

## Agent Architecture

### Agent Directory Structure (on VPS)

```
/opt/moav-agent/              ← Full git repository (cloned from GitHub)
├── agent/                    ← Agent code (working directory)
│   ├── src/
│   │   ├── monitors/
│   │   │   ├── heartbeat.ts           # Reports status every 15s
│   │   │   ├── command-runner.ts      # Polls commands table every 5s
│   │   │   ├── health-monitor.ts      # Auto-remediation every 60s
│   │   │   ├── expiration-monitor.ts  # Checks expired users hourly
│   │   │   └── usage-monitor.ts       # Updates usage every 15min
│   │   └── index.ts                   # Main entry point
│   ├── dist/                          ← Compiled JavaScript (from tsc)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                           ← Configuration (Supabase, agent token)
├── src/                               ← Dashboard code (Next.js)
├── supabase/                          ← Database migrations
└── ... (other dashboard files)
```

### Agent Monitors (5 total)

1. **Heartbeat Monitor** (15s interval)
   - Reports server status to `servers.status_json`
   - Updates `last_seen_at` timestamp
   - Collects: CPU, memory, disk, Docker service states, MoaV version

2. **Command Runner** (5s poll)
   - Polls `commands` table for pending commands
   - Executes MoaV CLI operations (user add/revoke, service control, etc.)
   - Updates command status: pending → running → succeeded/failed

3. **Health Monitor** (60s interval) ⭐ NEW
   - Auto-detects service issues:
     - Services stuck in "restarting" state > 3 minutes
     - Critical services (sing-box, wireguard, admin) stopped
     - Services unhealthy
   - Auto-remediation strategy:
     - First attempt: `docker compose restart <service>`
     - Subsequent attempts: `docker compose down + up <service>`
   - Smart retry logic:
     - 5-minute cooldown between attempts
     - Max 3 attempts per issue
     - Reset counter after 1 hour
   - Logs all remediation events to `log_events` with `[AUTO-REMEDIATION]` prefix

4. **Expiration Monitor** (hourly check)
   - Checks `vpn_users` for expired users (`expires_at < now`)
   - Automatically revokes expired users via `moav user revoke`

5. **Usage Monitor** (15-minute interval)
   - Fetches usage stats from MoaV admin API
   - Updates `vpn_users.current_usage` for each user

### Agent User Config Reading

When the agent executes a `user:add` command, it reads the following config files from `/opt/moav/outputs/bundles/$USERNAME/` and stores them in `vpn_users.config_raw`:

- `reality.txt` → config_raw.reality
- `trojan.txt` → config_raw.trojan
- `hysteria2.txt` → config_raw.hysteria2
- `wireguard.conf` → config_raw.wireguard
- `wireguard-wstunnel.conf` → config_raw.wireguard_wstunnel
- `dnstt.txt` → config_raw.dnstt

**Note**: Files are read with error tolerance - if a protocol is disabled or file missing, the agent logs a warning and continues. This allows partial protocol deployments.

**Implementation**: [agent/src/commands/real.ts:56-72](agent/src/commands/real.ts#L56-L72)

### systemd Service Configuration

- **Location**: `/etc/systemd/system/moav-agent.service`
- **Working Directory**: `/opt/moav-agent/agent`
- **Exec Start**: `/usr/bin/node /opt/moav-agent/agent/dist/index.js`
- **Environment File**: `/opt/moav-agent/agent/.env`
- **Restart Policy**: Always, with 10s delay

### Agent Deployment Process

**Initial Setup:**
```bash
# On VPS
cd /opt
git clone https://github.com/YOUR_USERNAME/moav-dashboard.git moav-agent
cd moav-agent/agent
cp .env.example .env
# Edit .env with Supabase URL, service role key, agent token, MoaV path
npm install
npm run build

# Create systemd service
sudo nano /etc/systemd/system/moav-agent.service
# (see agent/INSTALL.md for service file content)

sudo systemctl daemon-reload
sudo systemctl enable moav-agent
sudo systemctl start moav-agent
```

**Update Process:**
```bash
# On VPS
cd /opt/moav-agent/agent
git pull origin master
npm install
npm run build
sudo systemctl restart moav-agent
sudo journalctl -u moav-agent -f  # Watch logs
```

**Quick Update (after GitHub push):**
```bash
# From local machine - push changes
git push origin master

# On VPS - update agent
cd /opt/moav-agent/agent && git pull && npm install && npm run build && sudo systemctl restart moav-agent
```

### Health Monitoring Details

**Dashboard Integration:**
- Health card on server overview page is clickable
- Opens dialog with 3 tabs:
  1. **Overview**: Current health status, system metrics, detected issues, manual troubleshooting
  2. **Auto-Remediation**: History of automatic fixes from `log_events` table
  3. **Service Logs**: Recent logs (excludes auto-remediation logs)

**Manual Actions Available:**
- `server:health-check` command - Triggers immediate health check + remediation
- `service:restart` command - Manually restart specific service

**Database Schema for Health Monitoring:**
- `log_events` table stores remediation logs with fields:
  - `line` (string): Log message with `[AUTO-REMEDIATION]` prefix
  - `ts` (timestamp): Event timestamp
  - `service` (string): Service name (e.g., "sing-box", "wireguard")
  - `level` (string): "info" for success, "error" for failure
  - `server_id` (uuid): Reference to `servers` table

## Development Commands

```bash
# Next.js app
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint

# Agent (development)
cd agent && npm run dev    # Start agent with tsx watch

# Agent (production on VPS)
cd agent && npm run build  # Compile TypeScript
cd agent && npm start      # Start agent (production)

# Supabase (local)
npx supabase start         # Start local Supabase
npx supabase db reset      # Reset + re-run migrations + seed
npx supabase gen types typescript --local > src/lib/types/database.ts
```
