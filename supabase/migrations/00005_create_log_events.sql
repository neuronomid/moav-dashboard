-- Rolling log events from agent

create table public.log_events (
  id          bigint generated always as identity primary key,
  server_id   uuid not null references public.servers(id) on delete cascade,
  service     text not null,
  ts          timestamptz not null default now(),
  line        text not null
);

create index idx_log_events_tail
  on public.log_events (server_id, service, ts desc);

-- Enable realtime for live log tailing
alter publication supabase_realtime add table public.log_events;
