/**
 * Expiration Monitor
 * Checks for expired users and revokes them automatically
 */

import { supabase } from "../supabase.js";
import { runCommand } from "../lib/shell.js";

const MOAV_PATH = process.env.MOAV_PATH || "/opt/moav/moav.sh";

export async function checkExpiredUsers(serverId: string) {
  console.log("[expiration-monitor] Checking for expired users...");

  try {
    // Fetch users that are expired but still active
    const { data: expiredUsers, error } = await supabase
      .from("vpn_users")
      .select("id, username, expires_at")
      .eq("server_id", serverId)
      .eq("status", "active")
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString());

    if (error) {
      console.error("[expiration-monitor] Error fetching expired users:", error);
      return;
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log("[expiration-monitor] No expired users found");
      return;
    }

    console.log(`[expiration-monitor] Found ${expiredUsers.length} expired users`);

    // Revoke each expired user
    for (const user of expiredUsers) {
      console.log(`[expiration-monitor] Revoking expired user: ${user.username}`);

      try {
        // Revoke on MoaV
        await runCommand(`${MOAV_PATH} user revoke ${user.username}`);

        // Update database status
        await supabase
          .from("vpn_users")
          .update({ status: "revoked" })
          .eq("id", user.id);

        console.log(`[expiration-monitor] ✓ Revoked ${user.username}`);
      } catch (err) {
        console.error(`[expiration-monitor] Failed to revoke ${user.username}:`, err);

        // Still mark as revoked in DB even if MoaV command failed
        // (user might have been manually deleted)
        await supabase
          .from("vpn_users")
          .update({ status: "revoked" })
          .eq("id", user.id);
      }
    }
  } catch (err) {
    console.error("[expiration-monitor] Unexpected error:", err);
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startExpirationMonitor(serverId: string) {
  // Check immediately
  checkExpiredUsers(serverId);

  // Then check every hour
  interval = setInterval(() => checkExpiredUsers(serverId), 60 * 60 * 1000);
  console.log("[expiration-monitor] Started (checking every hour)");
}

export function stopExpirationMonitor() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
