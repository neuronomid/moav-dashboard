# MoaV Manager

Control panel for managing MoaV (Mother of All VPNs) installs across multiple VPS servers. Single-admin dashboard with agent-based control plane.

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend/DB**: Supabase (Postgres + Auth + Realtime)
- **Agent**: Standalone Node.js/TypeScript process on each VPS
- **Deploy**: Vercel (dashboard) + VPS (agent)

## Prerequisites

- Node.js 18+
- A Supabase project (or local Supabase via CLI)
- npm

## Local Development

### 1. Install dependencies

```bash
npm install
cd agent && npm install && cd ..
```

### 2. Set up Supabase

**Option A: Local Supabase (recommended for dev)**

```bash
npx supabase start
```

This starts a local Supabase instance and prints the URL, anon key, and service role key.

Run migrations:

```bash
npx supabase db reset
```

**Option B: Hosted Supabase**

Create a project at [supabase.com](https://supabase.com), then run migrations against it:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the values from the Supabase output:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 4. Create admin user

Via Supabase Studio (http://127.0.0.1:54323 > Authentication > Add user) or:

```bash
# Local only
npx supabase auth create-user --email admin@example.com --password your-password
```

### 5. Start the dashboard

```bash
npm run dev
```

Open http://localhost:3000 and log in.

### 6. Start the agent stub

```bash
cd agent
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and AGENT_TOKEN
# (get the AGENT_TOKEN from the dashboard when adding a server)
npm run dev
```

## Deploy to Vercel

1. Push the repo to GitHub
2. Import to Vercel
3. Set the three environment variables in Vercel project settings
4. Deploy

The `agent/` directory is not deployed to Vercel — it runs on each VPS.

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Login page (unauthenticated)
│   │   ├── (protected)/        # Dashboard, servers, jobs (authenticated)
│   │   └── api/agent/          # Agent registration + heartbeat endpoints
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── layout/             # Sidebar, page header
│   │   ├── servers/            # Server cards, status badges
│   │   ├── users/              # VPN user list, add dialog
│   │   └── jobs/               # Job list, status badges
│   ├── hooks/                  # Realtime subscription hooks
│   ├── lib/
│   │   ├── supabase/           # Supabase client utilities
│   │   ├── actions/            # Server actions (commands, users, servers)
│   │   ├── constants.ts        # Service definitions, command allowlist
│   │   └── types/              # TypeScript type definitions
│   └── ...
├── agent/                      # Agent stub (runs on VPS)
│   └── src/
│       ├── index.ts            # Entry point
│       ├── heartbeat.ts        # Sends status every 15s
│       ├── command-runner.ts   # Polls and executes commands
│       └── commands/           # Command handlers (stubs for M1)
├── supabase/
│   ├── migrations/             # SQL migration files
│   └── seed.sql                # Dev seed data
├── middleware.ts                # Auth middleware
└── docs/PRD.md                 # Product requirements
```
