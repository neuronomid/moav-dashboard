/**
 * Usage Monitor
 * Tracks data usage per user and updates the database
 */

import { supabase } from "../supabase.js";
import { runCommand } from "../lib/shell.js";

const MOAV_PATH = process.env.MOAV_PATH || "/opt/moav/moav.sh";

interface UserUsage {
  username: string;
  bytes_uploaded: number;
  bytes_downloaded: number;
  total_bytes: number;
}

/**
 * Get data usage from WireGuard
 * Uses `wg show wg0 transfer` to get transfer stats
 */
async function getWireGuardUsage(): Promise<Map<string, UserUsage>> {
  const usage = new Map<string, UserUsage>();

  try {
    // Get WireGuard transfer stats
    const { stdout } = await runCommand("wg show wg0 transfer 2>/dev/null || echo ''");

    if (!stdout.trim()) {
      return usage;
    }

    // Parse output: each line is "pubkey\tdownload\tupload"
    const lines = stdout.trim().split("\n");

    // We need to map public keys to usernames
    // This would require reading /opt/moav/configs/wireguard/wg0.conf
    // For now, we'll implement basic tracking

    // TODO: Parse wg0.conf to map public keys to usernames
    // For now, return empty usage data

  } catch (err) {
    console.error("[usage-monitor] Error getting WireGuard usage:", err);
  }

  return usage;
}

/**
 * Get data usage from sing-box logs
 * Parse sing-box logs for traffic statistics
 */
async function getSingBoxUsage(): Promise<Map<string, UserUsage>> {
  const usage = new Map<string, UserUsage>();

  try {
    // sing-box doesn't have built-in per-user traffic stats easily accessible
    // We would need to parse logs or use external tools

    // For now, return empty - this needs MoaV enhancement
  } catch (err) {
    console.error("[usage-monitor] Error getting sing-box usage:", err);
  }

  return usage;
}

/**
 * Check users against their data limits and revoke if exceeded
 */
async function checkDataLimits(serverId: string, usageMap: Map<string, UserUsage>) {
  try {
    const { data: users, error } = await supabase
      .from("vpn_users")
      .select("id, username, data_limit_gb, data_used_gb")
      .eq("server_id", serverId)
      .eq("status", "active")
      .not("data_limit_gb", "is", null);

    if (error || !users) return;

    for (const user of users) {
      const usage = usageMap.get(user.username);
      if (!usage) continue;

      const usedGB = usage.total_bytes / (1024 * 1024 * 1024);

      // Update usage in database
      await supabase
        .from("vpn_users")
        .update({ data_used_gb: usedGB })
        .eq("id", user.id);

      // Check if limit exceeded
      if (user.data_limit_gb && usedGB >= user.data_limit_gb) {
        console.log(`[usage-monitor] User ${user.username} exceeded data limit (${usedGB.toFixed(2)}GB / ${user.data_limit_gb}GB)`);

        try {
          // Revoke user
          await runCommand(`${MOAV_PATH} user revoke ${user.username}`);

          await supabase
            .from("vpn_users")
            .update({ status: "revoked" })
            .eq("id", user.id);

          console.log(`[usage-monitor] ✓ Revoked ${user.username} due to data limit`);
        } catch (err) {
          console.error(`[usage-monitor] Failed to revoke ${user.username}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("[usage-monitor] Error checking data limits:", err);
  }
}

export async function updateUsageStats(serverId: string) {
  console.log("[usage-monitor] Updating usage statistics...");

  try {
    // Combine usage from all sources
    const wgUsage = await getWireGuardUsage();
    const sbUsage = await getSingBoxUsage();

    // Merge usage data
    const allUsage = new Map<string, UserUsage>();

    for (const [username, usage] of wgUsage) {
      allUsage.set(username, usage);
    }

    for (const [username, usage] of sbUsage) {
      const existing = allUsage.get(username);
      if (existing) {
        existing.total_bytes += usage.total_bytes;
        existing.bytes_uploaded += usage.bytes_uploaded;
        existing.bytes_downloaded += usage.bytes_downloaded;
      } else {
        allUsage.set(username, usage);
      }
    }

    // Update database with usage stats
    for (const [username, usage] of allUsage) {
      const usedGB = usage.total_bytes / (1024 * 1024 * 1024);

      await supabase
        .from("vpn_users")
        .update({ data_used_gb: usedGB })
        .eq("username", username)
        .eq("server_id", serverId);
    }

    // Check and enforce data limits
    await checkDataLimits(serverId, allUsage);

    console.log(`[usage-monitor] Updated usage for ${allUsage.size} users`);
  } catch (err) {
    console.error("[usage-monitor] Error updating usage stats:", err);
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startUsageMonitor(serverId: string) {
  // Update immediately
  updateUsageStats(serverId);

  // Then update every 15 minutes
  interval = setInterval(() => updateUsageStats(serverId), 15 * 60 * 1000);
  console.log("[usage-monitor] Started (updating every 15 minutes)");
}

export function stopUsageMonitor() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
