-- Row Level Security: authenticated admin gets full access, anon gets nothing.
-- Agent uses service-role key which bypasses RLS entirely.

alter table public.servers enable row level security;
alter table public.vpn_users enable row level security;
alter table public.vpn_user_access_effective enable row level security;
alter table public.commands enable row level security;
alter table public.log_events enable row level security;

-- servers
create policy "admin_select_servers" on public.servers
  for select to authenticated using (true);
create policy "admin_insert_servers" on public.servers
  for insert to authenticated with check (true);
create policy "admin_update_servers" on public.servers
  for update to authenticated using (true);
create policy "admin_delete_servers" on public.servers
  for delete to authenticated using (true);

-- vpn_users
create policy "admin_select_vpn_users" on public.vpn_users
  for select to authenticated using (true);
create policy "admin_insert_vpn_users" on public.vpn_users
  for insert to authenticated with check (true);
create policy "admin_update_vpn_users" on public.vpn_users
  for update to authenticated using (true);
create policy "admin_delete_vpn_users" on public.vpn_users
  for delete to authenticated using (true);

-- vpn_user_access_effective (read-only for admin, writes via service-role)
create policy "admin_select_access_effective" on public.vpn_user_access_effective
  for select to authenticated using (true);

-- commands (admin can read + insert, agent updates via service-role)
create policy "admin_select_commands" on public.commands
  for select to authenticated using (true);
create policy "admin_insert_commands" on public.commands
  for insert to authenticated with check (true);

-- log_events (admin reads, agent inserts via service-role)
create policy "admin_select_log_events" on public.log_events
  for select to authenticated using (true);

-- Enable realtime on servers table
alter publication supabase_realtime add table public.servers;
