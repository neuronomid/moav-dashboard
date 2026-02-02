import { supabase } from "./supabase.js";
import { commandRegistry } from "./commands/index.js";
let interval = null;
async function pollAndExecute(serverId) {
    // Fetch queued commands for this server
    const { data: commands, error } = await supabase
        .from("commands")
        .select("*")
        .eq("server_id", serverId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(5);
    if (error) {
        console.error("[command-runner] Poll error:", error.message);
        return;
    }
    if (!commands || commands.length === 0)
        return;
    for (const cmd of commands) {
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
                result: { error: `Unknown command type: ${cmd.type}` },
                error: `Unknown command type: ${cmd.type}`,
                completed_at: new Date().toISOString(),
            })
                .eq("id", cmd.id);
            continue;
        }
        try {
            // Merge server_id into payload so handlers can access it
            const basePayload = cmd.payload ?? {};
            const payload = {
                ...basePayload,
                server_id: cmd.server_id,
            };
            const result = await handler(payload);
            await supabase
                .from("commands")
                .update({
                status: result.success ? "completed" : "failed",
                result: (result.success
                    ? { data: result.data ?? null }
                    : { error: result.error ?? null }),
                error: result.success ? null : (result.error ?? null),
                completed_at: new Date().toISOString(),
            })
                .eq("id", cmd.id);
            console.log(`[command-runner] ${cmd.type} → ${result.success ? "succeeded" : "failed"}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Unknown execution error";
            console.error(`[command-runner] ${cmd.type} threw:`, message);
            await supabase
                .from("commands")
                .update({
                status: "failed",
                result: { error: message },
                error: message,
                completed_at: new Date().toISOString(),
            })
                .eq("id", cmd.id);
        }
    }
}
export function startCommandRunner(serverId) {
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
