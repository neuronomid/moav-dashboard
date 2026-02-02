// Re-export database types for convenience
export type {
  Command,
  CommandInsert,
  CommandUpdate,
  CommandType,
  Server,
  ServerUpdate,
  LogEvent,
  LogEventInsert,
  VpnUser,
  VpnUserAccessEffective,
  Json,
  Database,
} from "./database.types";

// Helper types for command handling
export interface CommandResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export type CommandHandler = (
  payload: Record<string, unknown>
) => Promise<CommandResult>;

// Server status structure stored in status_json
export interface ServerStatusJson {
  services: Record<string, "running" | "stopped" | "restarting" | "unknown">;
  health: "ok" | "warn" | "critical";
  uptime_seconds: number;
  cpu_percent: number;
  mem_percent: number;
}

// Access policy structure stored in access_policy JSON
export interface AccessPolicy {
  wireguard: boolean;
  hysteria2: boolean;
  trojan: boolean;
  vless_reality: boolean;
  dnstt: boolean;
  conduit: boolean;
}

