/** Hand-written types matching the Supabase schema.
 *  These should match the tables created in the database. */

export type ServerStatus = "online" | "offline" | "unknown";

export interface Server {
  id: string;
  name: string;
  ip: string;
  agent_token: string;
  last_seen_at: string | null;
  moav_version: string | null;
  status_json: ServerStatusJson | null;
  created_at: string;
  updated_at: string;
}

export interface ServerStatusJson {
  services?: Record<string, ServiceState>;
  health?: "ok" | "warn" | "critical";
  uptime_seconds?: number;
  cpu_percent?: number;
  mem_percent?: number;
}

export type ServiceState = "running" | "stopped" | "restarting" | "unknown";

export type VpnUserStatus = "active" | "revoked" | "pending";

export interface VpnUser {
  id: string;
  server_id: string;
  username: string;
  status: VpnUserStatus;
  note: string | null;
  access_policy: AccessPolicy | null;
  config_raw: Record<string, string> | null;
  data_limit_gb: number | null;
  data_used_gb: number | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessPolicy {
  wireguard: boolean;
  hysteria2: boolean;
  trojan: boolean;
  vless_reality: boolean;
  dnstt: boolean;
  conduit: boolean;
}

export interface VpnUserAccessEffective {
  id: string;
  server_id: string;
  username: string;
  enabled_services_json: AccessPolicy | null;
  updated_at: string;
}

export type CommandStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type CommandType =
  | "service:start"
  | "service:stop"
  | "service:restart"
  | "server:status"
  | "server:logs"
  | "server:export"
  | "server:test"
  | "server:health-check"
  | "user:add"
  | "user:revoke"
  | "user:update-access"
  | "user:update";

export interface Command {
  id: string;
  server_id: string;
  type: CommandType;
  payload_json: Record<string, unknown> | null;
  status: CommandStatus;
  result_json: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface LogEvent {
  id: string;
  server_id: string;
  service: string;
  ts: string;
  line: string;
  level: "debug" | "info" | "warn" | "error" | null;
}

/** Convenience type for inserting a new server */
export type ServerInsert = Pick<Server, "name" | "ip" | "agent_token">;

/** Convenience type for inserting a new VPN user */
export type VpnUserInsert = Pick<VpnUser, "server_id" | "username"> &
  Partial<Pick<VpnUser, "note" | "access_policy">>;

/** Convenience type for inserting a new command */
export type CommandInsert = Pick<
  Command,
  "server_id" | "type" | "payload_json"
>;
