export interface Command {
  id: string;
  server_id: string;
  type: string;
  payload_json: Record<string, unknown>;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  result_json: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CommandResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export type CommandHandler = (
  payload: Record<string, unknown>
) => Promise<CommandResult>;

export interface ServerStatusJson {
  services: Record<string, "running" | "stopped" | "restarting" | "unknown">;
  health: "ok" | "warn" | "critical";
  uptime_seconds: number;
  cpu_percent: number;
  mem_percent: number;
}
