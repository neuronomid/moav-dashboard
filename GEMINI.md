# GEMINI.md — MoaV Manager Project Context

## 1. Project Overview
**MoaV Manager** is a web-based dashboard for managing multiple "Mother of All VPNs" (MoaV) server installations. It provides a centralized control plane for a single administrator to manage VPS nodes, VPN users, and service health without needing SSH access to each server.

- **Core Philosophy**: Single-admin, agent-based architecture. The dashboard talks to the database, and agents on VPS nodes poll the database for commands.
- **Repository**: Monorepo containing the Next.js web dashboard and the Node.js agent.

## 2. Technology Stack

### Frontend (Web Dashboard)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Icons**: Lucide React
- **Theme**: Next-themes (Dark/Light support)

### Backend & Database
- **Platform**: Supabase
- **Components**: 
  - **PostgreSQL**: Primary data store.
  - **Auth**: Admin authentication.
  - **Realtime**: For live updates of commands and logs.
- **Access Pattern**: 
  - Dashboard uses Supabase Client (RLS enabled).
  - Agent uses Supabase Service Key (Bypasses RLS) to poll/write.

### Agent (VPS Side)
- **Runtime**: Node.js
- **Location**: `/agent` directory
- **Function**: Runs on the VPS, polls Supabase for jobs, executes MoaV CLI commands (mocked in Milestone 1), and reports status.

## 3. Architecture & Data Flow

### The "Pull" Model
1. **Admin** triggers an action in the Dashboard (e.g., "Restart Service").
2. **Dashboard** writes a record to the `commands` table in Supabase.
3. **Agent** (running on VPS) polls `commands` for pending jobs assigned to its `server_id`.
4. **Agent** executes the corresponding MoaV CLI command (or mock).
5. **Agent** updates the `commands` record with `status: 'completed'` and `result`.
6. **Dashboard** receives the update via Supabase Realtime and updates the UI.

### Database Schema
- **`servers`**: Registry of VPS nodes (`id`, `name`, `ip`, `agent_token`, `last_seen_at`, `status_json`).
- **`vpn_users`**: Users defined on a server (`username`, `access_policy`).
- **`vpn_user_access_effective`**: The actual active state of a user's access.
- **`commands`**: Async job queue (`type`, `payload`, `status`, `result`).
- **`log_events`**: Live log stream from the agent.

## 4. Directory Structure

```
/
├── agent/                  # Node.js agent code
│   ├── src/                # Agent source logic
│   ├── deploy.sh           # Agent deployment script
│   └── package.json        # Agent-specific dependencies
├── docs/                   # Documentation (PRD, Git workflows)
├── src/                    # Next.js Dashboard source
│   ├── app/                # App Router pages and layouts
│   ├── components/         # React components (shadcn/ui)
│   ├── lib/                # Utilities, Supabase client
│   └── types/              # Shared TypeScript definitions
├── supabase/               # Supabase config and migrations
├── .gemini/                # Gemini CLI configuration & aliases
├── CLAUDE.md               # Context for Claude (Reference)
├── DEPLOY_AGENT.md         # Agent deployment guide
├── GEMINI.md               # Project Context (this file)
├── IMPLEMENTATION_NOTES.md # Implementation details/Status
├── QUICK_START.md          # Quick start guide
├── TROUBLESHOOTING.md      # Troubleshooting guide
└── package.json            # Root/Dashboard dependencies
```

## 5. Development Workflow

### Running the Dashboard
```bash
npm run dev
# Runs Next.js at http://localhost:3000
```

### Running the Agent (Development)
```bash
cd agent
npm run dev
# Runs agent with tsx watch
```

### Supabase (Local/Remote)
- The project is configured to use Supabase. Ensure `.env.local` is set up with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Agent requires `SUPABASE_SERVICE_ROLE_KEY` in `agent/.env` to bypass RLS.

### Development Credentials
- **Email**: `admin@gmail.com`
- **Password**: `test1234`

## 6. Milestone 1 Status: Stubbed vs. Real

**Currently Implemented & Real:**
- Supabase Auth & RLS.
- Server & User CRUD operations in the DB.
- Command queueing system.
- Agent polling & heartbeat mechanism.
- Realtime UI updates.

**Currently Stubbed (Simulated):**
- **MoaV Interaction**: The agent does NOT yet call `moav.sh`. All commands (`service:start`, `user:add`) return fake success after a delay.
- **Logs**: `server:logs` returns mock log lines.
- **Tests**: `server:test` returns all-pass results.
- **Bundles**: No actual VPN config bundles are generated.

## 7. Command Allowlist (Agent)
The agent strictly executes only these allowed command types:
- `service:start`, `service:stop`, `service:restart`
- `server:status` (heartbeat info)
- `server:logs` (tailing)
- `server:export` (backup)
- `server:test` (connectivity check)
- `server:health-check` (deep health inspection)
- `user:add`, `user:update`, `user:revoke`, `user:update-access`

## 8. Coding Guidelines
- **Paths**: Always use absolute paths when reading/writing files.
- **Styling**: Use Tailwind utility classes. For complex components, use `shadcn/ui`.
- **Type Safety**: strict TypeScript usage. Avoid `any`.
- **Simplicity**: Prefer functional components and hooks.
- **Agent Safety**: The agent should never execute arbitrary shell commands. It must use the mapped allowlist.
