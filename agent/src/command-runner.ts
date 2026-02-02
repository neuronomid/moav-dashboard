import { supabase } from "./supabase.js";
import { commandRegistry } from "./commands/index.js";
import type { Command, Json } from "./types.js";

let interval: ReturnType<typeof setInterval> | null = null;

async function pollAndExecute(serverId: string) {
  // Fetch queued commands for this server
  const { data: commands, error } = await supabase
    .from("commands")
    .select("*")
    .eq("server_id", serverId)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    console.error("[command-runner] Poll error:", error.message);
    return;
  }

  if (!commands || commands.length === 0) return;

  for (const cmd of commands as Command[]) {
    console.log(`[command-runner] Processing ${cmd.type} (${cmd.id})`);

    // Mark as running
    await supabase
      .from("commands")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", cmd.id);

    // Look up handler
    const handler = commandRegistry.get(cmd.type);

    if (!handler) {
      console.warn(`[command-runner] Unknown command type: ${cmd.type}`);
      await supabase
        .from("commands")
        .update({
          status: "failed",
          result_json: { error: `Unknown command type: ${cmd.type}` },
          completed_at: new Date().toISOString(),
        })
        .eq("id", cmd.id);
      continue;
    }

    try {
      // Merge server_id into payload so handlers can access it
      const basePayload = (cmd.payload_json as Record<string, unknown> | null) ?? {};
      const payload: Record<string, unknown> = {
        ...basePayload,
        server_id: cmd.server_id,
      };

      const result = await handler(payload);

      await supabase
        .from("commands")
        .update({
          status: result.success ? "succeeded" : "failed",
          result_json: (result.success
            ? { data: result.data ?? null }
            : { error: result.error ?? null }) as Json,
          completed_at: new Date().toISOString(),
        })
        .eq("id", cmd.id);

      console.log(
        `[command-runner] ${cmd.type} → ${result.success ? "succeeded" : "failed"}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown execution error";
      console.error(`[command-runner] ${cmd.type} threw:`, message);

      await supabase
        .from("commands")
        .update({
          status: "failed",
          result_json: { error: message },
          completed_at: new Date().toISOString(),
        })
        .eq("id", cmd.id);
    }
  }
}

export function startCommandRunner(serverId: string) {
  // Poll immediately, then every 5 seconds
  pollAndExecute(serverId);
  interval = setInterval(() => pollAndExecute(serverId), 5_000);
}

export function stopCommandRunner() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
