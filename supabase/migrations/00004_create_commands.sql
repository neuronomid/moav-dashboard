-- Commands table: job queue for agent execution

create type public.command_status as enum (
  'queued', 'running', 'succeeded', 'failed', 'cancelled'
);

create table public.commands (
  id            uuid primary key default gen_random_uuid(),
  server_id     uuid not null references public.servers(id) on delete cascade,
  type          text not null,
  payload_json  jsonb not null default '{}'::jsonb,
  status        public.command_status not null default 'queued',
  result_json   jsonb,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

-- Agent polls for queued commands per server
create index idx_commands_queued
  on public.commands (server_id, created_at asc)
  where status = 'queued';

-- Dashboard lists commands by server
create index idx_commands_server_created
  on public.commands (server_id, created_at desc);

-- Enable realtime
alter publication supabase_realtime add table public.commands;
