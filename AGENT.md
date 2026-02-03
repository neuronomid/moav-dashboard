# AGENT.md — MoaV Manager Working Notes

## Project Summary
MoaV Manager is a single-admin web dashboard for managing MoaV (Mother of All VPNs) installations across multiple VPS servers. It uses an agent-based control plane: the dashboard writes jobs to a Supabase `commands` table; each VPS agent polls and executes allowlisted MoaV CLI actions, then reports results and health.

## Stack (Source of Truth)
- **Dashboard**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Lucide icons. (See `package.json`.)
- **Backend**: Supabase (Postgres, Auth, Realtime).
- **Agent**: Node.js + TypeScript, runs on each VPS.

## Core Architecture
- **Pull model**: UI → `commands` row → agent polls → executes → updates command + realtime UI.
- **Heartbeat**: agent reports `servers.status_json` + `last_seen_at` (live only, no time-series).
- **Strict allowlist**: agent executes only predefined command types; no arbitrary shell.

## Key Constraints
- One MoaV install per VPS.
- Single admin (no multi-tenant/billing).
- Live status only (no historical charts).
- New users default to all services enabled; per-user access toggles must be enforced operationally.
- Secrets redaction in logs; never expose service-role key to browser.

## Important Tables
- `servers`: VPS registry + `status_json`, `last_seen_at`.
- `vpn_users`: user records + desired `access_policy`.
- `vpn_user_access_effective`: actual applied access state.
- `commands`: job queue (queued → running → succeeded/failed).
- `log_events`: rolling log stream (includes auto-remediation events).

## Agent Monitors (current design)
- Heartbeat (15s)
- Command runner (5s)
- Health monitor (60s auto-remediation)
- Expiration monitor (hourly)
- Usage monitor (15m)

## MoaV CLI Mapping (Allowlist)
Examples (see `IMPLEMENTATION_NOTES.md` / `CLAUDE.md`):
- `service:start` → `moav start <profile>`
- `service:stop` → `moav stop <service>`
- `service:restart` → `moav restart <service>`
- `server:status` → `moav status`
- `server:logs` → `moav logs <service> -n`
- `user:add` → `moav user add <username> --package`
- `user:revoke` → `moav user revoke <username>`
- `server:test` → `moav test <username> --json`
- `server:export` → `moav export`

Agent should use `execFile`, validate args, and avoid shell injection.

## Local Development
- Dashboard: `npm run dev` (root)
- Agent dev: `cd agent && npm run dev`
- Agent build: `cd agent && npm run build`
- Supabase local: `npx supabase start` then `npx supabase db reset`

## Env Vars
- Root `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Agent `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AGENT_TOKEN`, `MOAV_PATH` (default `/opt/moav/moav.sh`).

## Project Structure (high-level)
- `src/` — Next.js app (pages, components, lib/actions, hooks).
- `agent/` — VPS agent (monitors + command handlers).
- `supabase/` — migrations + seed.
- `docs/` — PRD and git workflow notes.
- Root docs: `README.md`, `IMPLEMENTATION_NOTES.md`, `QUICK_START.md`, `TROUBLESHOOTING.md`.

## Notes on Documentation
- Some docs differ on Next.js version; treat `package.json` as source of truth.
- M1 includes stubs for MoaV execution unless the agent has been updated to real `moav.sh` calls.

## When Modifying Code
- Preserve strict command allowlist.
- Don’t add arbitrary remote shell execution.
- Keep logs and secrets sanitized.
- Maintain “live-only” data model (no time-series unless explicitly requested).
