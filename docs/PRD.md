PRD Revision Lock-In

Fixed decisions
	1.	One MoaV install per VPS (no multi-instance complexity).
	2.	New users get access to all services by default, but you can restrict per user afterward.
	3.	Live status only (no historical charts). We’ll still keep a tiny “last known state” cache so the UI doesn’t go blank if a server briefly disconnects.

⸻

Updated Product Scope

A) Server model
	•	Each Hetzner VPS has exactly:
	•	MoaV stack (single install)
	•	One lightweight agent (recommended)
	•	Dashboard shows live:
	•	online/offline
	•	which MoaV profiles/services are running
	•	basic health indicators
	•	logs (tail/follow)

B) User model (MoaV “VPN users”)
	•	Users are created/revoked via MoaV user commands.
	•	Each user has:
	•	config bundle viewer + download ZIP
	•	test results view (protocol pass/fail)
	•	service access policy (default: all enabled)

⸻

The “Service Restrictions per User” Feature (Core update)

This is the one part that requires careful design so it’s powerful but not confusing.

UX design

Default behavior
	•	When you click Add User, the UI only asks for:
	•	username
	•	target server
	•	(optional) note
	•	Behind the scenes: user is created with full access.

Restriction behavior
	•	In the user detail page: a section called Access Controls
	•	It shows toggles like:
	•	WireGuard
	•	Hysteria2
	•	Trojan
	•	VLESS / Reality
	•	dnstt (DNS tunnel)
	•	Conduit (if applicable per user; otherwise server-level only)
	•	You can toggle services OFF/ON for that user.
	•	UI explains in plain language: “Turning off WireGuard will remove/disable that user’s WireGuard config.”

Implementation policy (important)

MoaV’s default flow generates a bundle per user (configs/QR/etc.). Your dashboard should implement restrictions as:

Policy A (recommended): “Bundle-based access control”
	•	Access is restricted by controlling what configs are generated/kept for the user and what credentials remain valid.
	•	Agent actions:
	•	Apply user policy → regenerate/refresh bundle → remove disabled configs → revoke/rotate disabled credentials as needed.
	•	This is robust and doesn’t require building a deep rules engine inside proxy configs unless MoaV already supports it cleanly.

Policy B (optional later): “Protocol-level enforcement”
	•	If MoaV exposes clean primitives to truly disable a user only for a protocol (without affecting others), use them.
	•	If not, fall back to Policy A.

Result: you always get a consistent UX: toggles control “what the user can use,” not just “what you show them.”

⸻

Live Status Only (What “Live” Means)

What the dashboard shows live
	•	Server online/offline (agent heartbeat)
	•	Current services state (running/stopped/restarting)
	•	Current “health summary” (OK/Warn/Critical)
	•	Logs tail/follow

How “live” is implemented (simple + reliable)
	•	Agent sends heartbeat every ~10–20 seconds.
	•	Dashboard polls server state every ~15 seconds (or manual refresh).
	•	No time-series storage, just:
	•	latest snapshot row per server
	•	last 200–2000 log lines per service (rolling)

This keeps the UI snappy and avoids you dealing with data retention.

⸻

Updated Architecture Recommendation (Still best for non-technical use)
	•	Vercel hosts the web app (UI + light API routes)
	•	Supabase provides auth + database + realtime
	•	Each VPS runs:
	•	MoaV
	•	a small agent container (recommended)
	•	The agent:
	•	executes allowlisted MoaV operations
	•	writes results back to Supabase
	•	streams logs via small chunks/events

This avoids SSH weirdness and makes day-to-day use “click and done.”

⸻

Updated Database Schema (minimal changes)

Add these tables/fields to support your decisions:

servers
	•	id, name, ip/domain, agent_id, last_seen_at, moav_version, status_json

vpn_users
	•	id, server_id, username, status, note
	•	access_policy JSON (the desired toggles)

vpn_user_access_effective
	•	stores what is actually active after applying policy
	•	server_id, username, enabled_services_json, updated_at

commands (jobs)
	•	id, server_id, type, payload_json, status, result_json, created_at

log_events (rolling)
	•	server_id, service, ts, line

No historical usage graphs; you can still keep “current usage totals” if MoaV/agent can provide them, but don’t store time series unless you later want it.

⸻

Updated Screens

Server Detail
	•	Overview (live health + version)
	•	Services (start/stop/restart per service; stack actions)
	•	Users (list/add/revoke; quick “download bundle”)
	•	Test Center (run tests for a user; show pass/fail per protocol)
	•	Backups & Migration (export/import/migrate IP)
	•	Conduit/Snowflake (if enabled; status + logs + restart)

User Detail
	•	Bundle viewer (configs + QR images + download ZIP)
	•	Test results (last run + run now)
	•	Access Controls toggles (default all ON)
	•	Revoke / Rotate credentials

⸻

Acceptance Criteria Updates
	•	Adding a user creates a valid bundle with all services enabled by default.
	•	Toggling OFF a service:
	•	removes/invalidates that service’s credentials for that user
	•	updates the bundle so the user can’t “accidentally” keep using it
	•	is reversible (toggle back ON regenerates what’s needed)
	•	Server page always shows live status (or “Last seen X seconds ago”).
	•	Logs tail works without SSH.

⸻

Implementation guidance for Claude Code (to avoid surprises)
	•	Agent must implement a small, explicit command allowlist (no arbitrary remote shell).
	•	“Restrict per user per service” must be implemented as a repeatable workflow:
	1.	read desired policy
	2.	apply changes (revoke/regen as needed)
	3.	rebuild the user bundle
	4.	report “effective policy” back to Supabase

That’s the key “thinking hard” piece: it guarantees the toggles actually mean something operationally, not just cosmetically.