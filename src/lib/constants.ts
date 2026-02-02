export const MOAV_SERVICES = [
  { id: "wireguard", label: "WireGuard", profile: "wireguard" },
  { id: "hysteria2", label: "Hysteria2", profile: "proxy" },
  { id: "trojan", label: "Trojan", profile: "proxy" },
  { id: "vless-reality", label: "VLESS / Reality", profile: "proxy" },
  { id: "dnstt", label: "dnstt", profile: "dnstt" },
  { id: "conduit-snowflake", label: "Conduit / Snowflake", profile: "conduit" },
] as const;

export type MoavServiceId = (typeof MOAV_SERVICES)[number]["id"];

export const MOAV_SERVICE_IDS = MOAV_SERVICES.map((s) => s.id);

/** Default access policy — all services enabled */
export const DEFAULT_ACCESS_POLICY: Record<MoavServiceId, boolean> = {
  wireguard: true,
  hysteria2: true,
  trojan: true,
  "vless-reality": true,
  dnstt: true,
  "conduit-snowflake": true,
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
