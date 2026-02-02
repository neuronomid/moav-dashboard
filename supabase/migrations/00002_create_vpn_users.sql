-- VPN users table: users managed by MoaV on each server

create type public.vpn_user_status as enum ('active', 'revoked', 'pending');

create table public.vpn_users (
  id            uuid primary key default gen_random_uuid(),
  server_id     uuid not null references public.servers(id) on delete cascade,
  username      text not null,
  status        public.vpn_user_status not null default 'pending',
  note          text,
  access_policy jsonb not null default '{
    "wireguard": true,
    "hysteria2": true,
    "trojan": true,
    "vless-reality": true,
    "dnstt": true,
    "conduit-snowflake": true
  }'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint unique_user_per_server unique (server_id, username)
);

create index idx_vpn_users_server on public.vpn_users (server_id);

create trigger vpn_users_updated_at
  before update on public.vpn_users
  for each row execute function public.set_updated_at();
