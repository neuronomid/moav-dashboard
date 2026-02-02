/** Hand-written types matching the Supabase schema.
 *  Replace with `supabase gen types typescript` output later. */

export type ServerStatus = "online" | "offline" | "unknown";

export interface Server {
  id: string;
  name: string;
  host: string;
  agent_token: string;
  agent_id: string | null;
  is_registered: boolean;
  last_seen_at: string | null;
  moav_version: string | null;
  status_json: ServerStatusJson;
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
  access_policy: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface VpnUserAccessEffective {
  id: string;
  server_id: string;
  vpn_user_id: string;
  username: string;
  enabled_services_json: string[];
  updated_at: string;
}

export type CommandStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface Command {
  id: string;
  server_id: string;
  type: string;
  payload_json: Record<string, unknown>;
  status: CommandStatus;
  result_json: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface LogEvent {
  id: number;
  server_id: string;
  service: string;
  ts: string;
  line: string;
}

/** Convenience type for inserting a new server */
export type ServerInsert = Pick<Server, "name" | "host" | "agent_token">;

/** Convenience type for inserting a new VPN user */
export type VpnUserInsert = Pick<VpnUser, "server_id" | "username"> &
  Partial<Pick<VpnUser, "note" | "access_policy">>;

/** Convenience type for inserting a new command */
export type CommandInsert = Pick<
  Command,
  "server_id" | "type" | "payload_json"
>;
