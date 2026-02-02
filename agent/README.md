# MoaV Agent Stub

Lightweight agent that runs on each VPS alongside MoaV. It connects to Supabase, sends heartbeats, and executes commands from the dashboard.

## Setup

```bash
cd agent
npm install
cp .env.example .env
```

Edit `.env` with your values:
- `SUPABASE_URL` — your Supabase project URL (or `http://127.0.0.1:54321` for local)
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard or `npx supabase start` output
- `AGENT_TOKEN` — from the MoaV Manager dashboard when adding a server

## Run

```bash
npm run dev     # development (auto-restart on changes)
npm start       # production
```

## What It Does (M1 Stub)

- **Registers** with the dashboard by matching its `AGENT_TOKEN` to a server record
- **Heartbeat** every 15 seconds — updates `last_seen_at` and `status_json` with fake metrics
- **Polls** for queued commands every 5 seconds — picks them up, marks as running, executes a stub handler, marks as succeeded/failed
- **All handlers are stubs** — they simulate MoaV CLI calls with a short delay and fake results

## Command Allowlist

Only these command types are accepted:

`service:start`, `service:stop`, `service:restart`, `server:status`, `server:logs`, `server:export`, `server:test`, `user:add`, `user:revoke`, `user:update-access`

Anything else is rejected with a "failed" status.
