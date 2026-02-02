-- Servers table: one row per VPS with a MoaV install

create table public.servers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  host          text not null,
  agent_token   text not null unique,
  agent_id      text,
  is_registered boolean not null default false,
  last_seen_at  timestamptz,
  moav_version  text,
  status_json   jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_servers_agent_token on public.servers (agent_token);
create index idx_servers_last_seen on public.servers (last_seen_at desc nulls last);

-- Reusable updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger servers_updated_at
  before update on public.servers
  for each row execute function public.set_updated_at();
