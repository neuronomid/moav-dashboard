-- Dev seed: one test server (already "registered" with a recent heartbeat)
insert into public.servers (name, host, agent_token, is_registered, last_seen_at, moav_version, status_json)
values (
  'Test VPS 1',
  '203.0.113.10',
  'dev_test_token_' || repeat('0', 49),
  true,
  now(),
  '1.2.0',
  '{
    "services": {
      "wireguard": "running",
      "hysteria2": "running",
      "trojan": "stopped",
      "vless-reality": "running",
      "dnstt": "stopped",
      "conduit-snowflake": "stopped"
    },
    "health": "ok",
    "uptime_seconds": 86400,
    "cpu_percent": 12.5,
    "mem_percent": 45.2
  }'::jsonb
);

-- Seed a VPN user on the test server
insert into public.vpn_users (server_id, username, status, note)
select id, 'alice', 'active', 'Test user'
from public.servers
where name = 'Test VPS 1';
