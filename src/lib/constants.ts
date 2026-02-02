/**
 * MoaV Services - These match the actual Docker services in MoaV
 * Get the list from: docker compose --profile all config --services
 */
export const MOAV_SERVICES = [
  // Core VPN services
  { id: "sing-box", label: "sing-box (Reality/Trojan/Hysteria2)", profile: "proxy" },
  { id: "wireguard", label: "WireGuard", profile: "wireguard" },
  { id: "wstunnel", label: "wstunnel", profile: "wireguard" },
  { id: "dnstt", label: "dnstt (DNS Tunnel)", profile: "dnstt" },

  // Donation/relay services
  { id: "conduit", label: "Psiphon Conduit", profile: "conduit" },
  { id: "snowflake", label: "Tor Snowflake", profile: "snowflake" },

  // Infrastructure
  { id: "decoy", label: "Decoy Website", profile: "proxy" },
  { id: "admin", label: "Admin Panel", profile: "admin" },
  { id: "certbot", label: "Certbot (TLS)", profile: "proxy" },
] as const;

export type MoavServiceId = (typeof MOAV_SERVICES)[number]["id"];

export const MOAV_SERVICE_IDS = MOAV_SERVICES.map((s) => s.id);

/** Default access policy — all services enabled */
export const DEFAULT_ACCESS_POLICY: Record<string, boolean> = {
  "sing-box": true,
  wireguard: true,
  wstunnel: true,
  dnstt: true,
  conduit: true,
  snowflake: true,
};

/**
 * Commands the agent is allowed to execute.
 * Any command type not in this list will be rejected.
 */
export const COMMAND_TYPES = [
  "service:start",
  "service:stop",
  "service:restart",
  "server:status",
  "server:logs",
  "server:export",
  "server:test",
  "user:add",
  "user:revoke",
  "user:update-access",
] as const;

export type CommandType = (typeof COMMAND_TYPES)[number];

export const COMMAND_TYPE_SET = new Set<string>(COMMAND_TYPES);

/** How many seconds before a server is considered offline */
export const SERVER_ONLINE_THRESHOLD_MS = 60_000;
