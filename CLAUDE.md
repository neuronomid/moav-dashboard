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

## Development Commands

```bash
# Next.js app
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint

# Agent stub
cd agent && npm run dev    # Start agent with tsx watch
cd agent && npm start      # Start agent (production)

# Supabase (local)
npx supabase start         # Start local Supabase
npx supabase db reset      # Reset + re-run migrations + seed
npx supabase gen types typescript --local > src/lib/types/database.ts
```
