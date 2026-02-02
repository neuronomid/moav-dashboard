# Implementation Notes — Milestone 1

## Command Allowlist Approach

The agent uses a **strict command allowlist** implemented as a TypeScript `Map<string, CommandHandler>` in `agent/src/commands/index.ts`. Only command types registered in this map will be executed. Any command with an unrecognized `type` field is immediately marked as `failed` with an error message.

The dashboard also validates command types on the server side (`src/lib/constants.ts` exports `COMMAND_TYPE_SET`) before inserting into the database.

**Allowed commands in M1:**

| Type | Description |
|------|-------------|
| `service:start` | Start a MoaV service/profile |
| `service:stop` | Stop a MoaV service |
| `service:restart` | Restart a MoaV service |
| `server:status` | Get current server status |
| `server:logs` | Fetch recent log lines |
| `server:export` | Create backup archive |
| `server:test` | Test protocol connectivity for a user |
| `user:add` | Create a VPN user across all protocols |
| `user:revoke` | Revoke a VPN user |
| `user:update-access` | Update per-service access toggles |

No arbitrary shell commands are accepted. The agent never runs `exec()`, `spawn()`, or any shell primitive based on user input.

## Agent → MoaV Command Mapping (Future)

In M1, all command handlers are stubs that return fake success after a delay. In future milestones, each handler will shell out to the corresponding `moav` CLI command:

| Agent Command | MoaV CLI |
|--------------|----------|
| `service:start` | `moav start <profile>` |
| `service:stop` | `moav stop <service>` |
| `service:restart` | `moav restart <service>` |
| `server:status` | `moav status` (parse output) |
| `server:logs` | `moav logs <service> -n` (capture output) |
| `user:add` | `moav user add <username> --package` |
| `user:revoke` | `moav user revoke <username>` |
| `user:update-access` | Revoke + selective re-add per protocol |
| `server:export` | `moav export` |
| `server:test` | `moav test <username> --json` |

The agent will use Node.js `child_process.execFile` (not `exec`) to avoid shell injection. Arguments will be validated and sanitized before execution.

## What Is Stubbed vs Real in M1

### Real (functional):
- Supabase Auth (email/password login)
- Route protection via middleware
- Server CRUD (add, list, delete)
- VPN user CRUD (add, list, revoke)
- Command queue (create, list, realtime updates)
- Agent heartbeat (updates `last_seen_at` and `status_json` in Supabase)
- Agent command polling (picks up queued commands, transitions status)
- Realtime subscriptions (commands and server status update live in the UI)

### Stubbed (fake data / no real MoaV interaction):
- All command execution (agent returns fake success after a delay)
- Server status values (CPU, memory, uptime are random)
- Service states (hardcoded — always shows same services running/stopped)
- User bundle generation (no actual config files created)
- Protocol test results (always returns "pass")
- Access policy enforcement (toggling services doesn't actually restrict anything yet)
- Log tailing (no real logs streamed)

### Not Yet Implemented (planned for M2+):
- Real MoaV CLI integration on the agent
- Config bundle viewer + ZIP download
- Access Controls toggles on user detail page
- Log streaming (live tail)
- Server backup/restore/migrate UI
- Test Center (run tests, show pass/fail per protocol)
- Agent install script (real one-liner that bootstraps the agent on a VPS)

## Agent Authentication (M1 Simplification)

The agent uses the Supabase **service-role key** to bypass RLS entirely. This is acceptable for M1 because:

1. Single admin / single tenant — no multi-user isolation needed
2. The agent runs on the admin's own VPS (trusted environment)
3. The service-role key is never exposed to the browser

The `agent_token` is used only to associate the agent with its `servers` row during registration. It is not used for ongoing authentication.

**Future improvement**: Mint scoped JWTs per agent using a custom Supabase function, so each agent can only access its own server's data.

## Secrets Handling

- `agent_token` is generated with `crypto.randomBytes(32)` (256 bits of entropy)
- Shown to the admin exactly once in the install script dialog
- Never displayed again in the UI (no "reveal token" feature in M1)
- Log lines pass through `redactSecrets()` regex before display
- Service-role key is stored only in `.env` files which are gitignored
- RLS prevents the browser anon key from accessing any data without authentication
