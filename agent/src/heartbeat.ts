import { supabase } from "./supabase.js";
import type { ServerStatusJson } from "./types.js";

let interval: ReturnType<typeof setInterval> | null = null;

function generateFakeStatus(): ServerStatusJson {
  return {
    services: {
      wireguard: "running",
      hysteria2: "running",
      trojan: "stopped",
      "vless-reality": "running",
      dnstt: "stopped",
      "conduit-snowflake": "stopped",
    },
    health: "ok",
    uptime_seconds: Math.floor(process.uptime()),
    cpu_percent: Math.round(Math.random() * 30 * 10) / 10,
    mem_percent: Math.round((40 + Math.random() * 20) * 10) / 10,
  };
}

export function startHeartbeat(serverId: string) {
  async function beat() {
    const { error } = await supabase
      .from("servers")
      .update({
        last_seen_at: new Date().toISOString(),
        status_json: generateFakeStatus(),
      })
      .eq("id", serverId);

    if (error) {
      console.error("[heartbeat] Error:", error.message);
    } else {
      console.log("[heartbeat] OK");
    }
  }

  // Send first heartbeat immediately
  beat();

  // Then every 15 seconds
  interval = setInterval(beat, 15_000);
}

export function stopHeartbeat() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
