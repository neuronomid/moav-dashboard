-- Effective access: what's actually active after agent applies policy

create table public.vpn_user_access_effective (
  id                    uuid primary key default gen_random_uuid(),
  server_id             uuid not null references public.servers(id) on delete cascade,
  vpn_user_id           uuid not null references public.vpn_users(id) on delete cascade,
  username              text not null,
  enabled_services_json jsonb not null default '[]'::jsonb,
  updated_at            timestamptz not null default now()
);

create unique index idx_vpn_access_effective_user
  on public.vpn_user_access_effective (server_id, vpn_user_id);

create trigger vpn_user_access_effective_updated_at
  before update on public.vpn_user_access_effective
  for each row execute function public.set_updated_at();
