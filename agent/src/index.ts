import "dotenv/config";
import { supabase } from "./supabase.js";
import { startHeartbeat, stopHeartbeat } from "./heartbeat.js";
import { startCommandRunner, stopCommandRunner } from "./command-runner.js";
import { startExpirationMonitor, stopExpirationMonitor } from "./monitors/expiration-monitor.js";
import { startUsageMonitor, stopUsageMonitor } from "./monitors/usage-monitor.js";
import { startHealthMonitor, stopHealthMonitor } from "./monitors/health-monitor.js";

const AGENT_TOKEN = process.env.AGENT_TOKEN;

if (!AGENT_TOKEN) {
  console.error("Missing AGENT_TOKEN environment variable");
  process.exit(1);
}

async function register(): Promise<string> {
  // Look up server by agent_token
  const { data: server, error } = await supabase
    .from("servers")
    .select("id, name")
    .eq("agent_token", AGENT_TOKEN!)
    .single();

  if (error || !server) {
    console.error("Registration failed: invalid agent token");
    process.exit(1);
  }

  // Update last_seen_at to mark this agent as connected
  await supabase
    .from("servers")
    .update({
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", server.id);

  console.log(`Registered as "${server.name}" (${server.id})`);
  return server.id;
}

async function main() {
  console.log("MoaV Agent starting...");
  console.log("================================");

  const serverId = await register();

  console.log("\nStarting services:");
  console.log("- Heartbeat (15s interval)...");
  startHeartbeat(serverId);

  console.log("- Command runner (5s poll)...");
  startCommandRunner(serverId);

  console.log("- Health monitor (60s checks + auto-remediation)...");
  startHealthMonitor(serverId);

  console.log("- Expiration monitor (hourly check)...");
  startExpirationMonitor(serverId);

  console.log("- Usage monitor (15min updates)...");
  startUsageMonitor(serverId);

  console.log("\n================================");
  console.log("✓ Agent is running. Press Ctrl+C to stop.");
  console.log("================================\n");
}

// Graceful shutdown
function shutdown() {
  console.log("\n================================");
  console.log("Shutting down gracefully...");
  console.log("================================");
  stopHeartbeat();
  stopCommandRunner();
  stopHealthMonitor();
  stopExpirationMonitor();
  stopUsageMonitor();
  console.log("✓ All services stopped");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
