import { execSync } from "child_process";
import { supabase } from "../supabase.js";

let interval: ReturnType<typeof setInterval> | null = null;
let serverId: string | null = null;

// Track service state history to detect prolonged issues
interface ServiceHistory {
  state: string;
  firstSeen: Date;
  lastChecked: Date;
  remediationAttempts: number;
  lastRemediationAt?: Date;
}

const serviceHistory = new Map<string, ServiceHistory>();

// Configuration
const HEALTH_CHECK_INTERVAL = 60_000; // 60 seconds
const RESTARTING_TIMEOUT = 180_000; // 3 minutes - if stuck in "restarting" for this long, remediate
const REMEDIATION_COOLDOWN = 300_000; // 5 minutes - wait this long between remediation attempts
const MAX_REMEDIATION_ATTEMPTS = 3; // Maximum auto-remediation attempts before giving up

// Critical services that should always be running
const CRITICAL_SERVICES = ["sing-box", "wireguard", "admin"];

interface DockerServiceInfo {
  Name: string;
  State: string;
  Health?: string;
  Status?: string;
}

/**
 * Get current Docker service status
 * Note: Service names come from Docker itself, not user input
 */
function getDockerServiceStatus(): Map<string, DockerServiceInfo> {
  const services = new Map<string, DockerServiceInfo>();

  try {
    const output = execSync("docker compose --profile all ps -a --format json", {
      cwd: "/opt/moav",
      encoding: "utf-8",
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!output || output.trim() === "" || output.trim() === "[]") {
      return services;
    }

    let items: DockerServiceInfo[];
    const trimmed = output.trim();

    if (trimmed.startsWith("[")) {
      items = JSON.parse(trimmed);
    } else {
      items = trimmed
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    }

    for (const item of items) {
      const name = item.Name?.replace(/^moav-/, "") || "";
      if (name) {
        services.set(name, item);
      }
    }
  } catch (error) {
    const err = error as Error;
    console.error("[health-monitor] Error getting Docker status:", err.message);
  }

  return services;
}

/**
 * Get logs for a specific service
 * Note: Service name validated against Docker services only
 */
function getServiceLogs(serviceName: string, lines = 50): string {
  try {
    // Service name comes from Docker's own output, not user input
    const output = execSync(
      `docker compose logs --tail ${lines} ${serviceName}`,
      {
        cwd: "/opt/moav",
        encoding: "utf-8",
        timeout: 10000,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    return output;
  } catch (error) {
    const err = error as Error;
    return `Error getting logs: ${err.message}`;
  }
}

/**
 * Attempt to restart a service
 * Note: Service name validated against Docker services only
 */
async function restartService(serviceName: string): Promise<boolean> {
  try {
    console.log(`[health-monitor] Attempting to restart ${serviceName}...`);

    // Service name comes from Docker's own output, not user input
    execSync(`docker compose restart ${serviceName}`, {
      cwd: "/opt/moav",
      encoding: "utf-8",
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    console.log(`[health-monitor] Successfully restarted ${serviceName}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error(`[health-monitor] Failed to restart ${serviceName}:`, err.message);
    return false;
  }
}

/**
 * Attempt to forcefully recreate a service (down + up)
 * Note: Service name validated against Docker services only
 */
async function recreateService(serviceName: string): Promise<boolean> {
  try {
    console.log(`[health-monitor] Attempting to recreate ${serviceName}...`);

    // Service name comes from Docker's own output, not user input
    // Stop the service
    execSync(`docker compose down ${serviceName}`, {
      cwd: "/opt/moav",
      encoding: "utf-8",
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start it again
    execSync(`docker compose up -d ${serviceName}`, {
      cwd: "/opt/moav",
      encoding: "utf-8",
      timeout: 60000,
      stdio: ["pipe", "pipe", "pipe"],
    });

    console.log(`[health-monitor] Successfully recreated ${serviceName}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error(`[health-monitor] Failed to recreate ${serviceName}:`, err.message);
    return false;
  }
}

/**
 * Log a remediation event to the database
 */
async function logRemediationEvent(
  serviceName: string,
  issue: string,
  action: string,
  success: boolean,
  details?: string
) {
  if (!serverId) return;

  try {
    const logLine = details
      ? `[AUTO-REMEDIATION] ${issue} - ${action}: ${success ? "SUCCESS" : "FAILED"} - ${details}`
      : `[AUTO-REMEDIATION] ${issue} - ${action}: ${success ? "SUCCESS" : "FAILED"}`;

    await supabase.from("log_events").insert({
      server_id: serverId,
      service: serviceName,
      level: success ? "info" : "error",
      line: logLine,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health-monitor] Failed to log remediation event:", error);
  }
}

/**
 * Check if a service needs remediation and attempt to fix it
 */
async function checkAndRemediateService(
  serviceName: string,
  serviceInfo: DockerServiceInfo
): Promise<void> {
  const state = serviceInfo.State?.toLowerCase() || "";
  const health = serviceInfo.Health?.toLowerCase() || "";
  const now = new Date();

  // Get or create history entry
  let history = serviceHistory.get(serviceName);
  if (!history || history.state !== state) {
    // State changed, reset history
    history = {
      state,
      firstSeen: now,
      lastChecked: now,
      remediationAttempts: 0,
    };
    serviceHistory.set(serviceName, history);
    return; // Don't remediate on state change, give it time
  }

  history.lastChecked = now;

  // Check if we've hit max remediation attempts
  if (history.remediationAttempts >= MAX_REMEDIATION_ATTEMPTS) {
    if (!history.lastRemediationAt ||
        now.getTime() - history.lastRemediationAt.getTime() > 3600_000) {
      // Reset after 1 hour
      history.remediationAttempts = 0;
    } else {
      // Already tried max times, don't spam
      return;
    }
  }

  // Check if we're in cooldown period
  if (history.lastRemediationAt) {
    const timeSinceLastRemediation = now.getTime() - history.lastRemediationAt.getTime();
    if (timeSinceLastRemediation < REMEDIATION_COOLDOWN) {
      // Still in cooldown, don't remediate yet
      return;
    }
  }

  // Detect issues that need remediation
  let needsRemediation = false;
  let issue = "";

  // Issue 1: Stuck in restarting state
  if (state === "restarting") {
    const timeInState = now.getTime() - history.firstSeen.getTime();
    if (timeInState > RESTARTING_TIMEOUT) {
      needsRemediation = true;
      issue = `Service stuck in restarting state for ${Math.round(timeInState / 1000)}s`;
    }
  }

  // Issue 2: Critical service is stopped
  if (CRITICAL_SERVICES.includes(serviceName) &&
      (state === "exited" || state === "dead" || state === "created")) {
    needsRemediation = true;
    issue = `Critical service is stopped (state: ${state})`;
  }

  // Issue 3: Running but unhealthy
  if (state === "running" && health === "unhealthy") {
    const timeInState = now.getTime() - history.firstSeen.getTime();
    if (timeInState > RESTARTING_TIMEOUT) {
      needsRemediation = true;
      issue = `Service is unhealthy for ${Math.round(timeInState / 1000)}s`;
    }
  }

  if (!needsRemediation) {
    return;
  }

  // Attempt remediation
  console.log(`[health-monitor] 🔧 Detected issue with ${serviceName}: ${issue}`);

  // Get logs before remediation for debugging
  const logs = getServiceLogs(serviceName, 30);

  history.remediationAttempts++;
  history.lastRemediationAt = now;

  let success = false;
  let action = "";

  // Try progressively more aggressive remediation
  if (history.remediationAttempts === 1) {
    // First attempt: gentle restart
    action = "docker compose restart";
    success = await restartService(serviceName);
  } else {
    // Subsequent attempts: full recreate
    action = "docker compose down + up";
    success = await recreateService(serviceName);
  }

  // Log the remediation attempt
  await logRemediationEvent(
    serviceName,
    issue,
    action,
    success,
    success ? undefined : `Recent logs:\n${logs}`
  );

  if (success) {
    console.log(
      `[health-monitor] ✓ Successfully remediated ${serviceName} (attempt ${history.remediationAttempts})`
    );
    // Reset history on success
    serviceHistory.delete(serviceName);
  } else {
    console.error(
      `[health-monitor] ✗ Failed to remediate ${serviceName} (attempt ${history.remediationAttempts}/${MAX_REMEDIATION_ATTEMPTS})`
    );
  }
}

/**
 * Main health check function
 */
async function performHealthCheck() {
  console.log("[health-monitor] Running health check...");

  const services = getDockerServiceStatus();

  if (services.size === 0) {
    console.log("[health-monitor] No services found, skipping health check");
    return;
  }

  // Check each service for issues
  for (const [serviceName, serviceInfo] of services.entries()) {
    await checkAndRemediateService(serviceName, serviceInfo);
  }

  // Clean up old history entries (services that no longer exist)
  const currentServiceNames = new Set(services.keys());
  for (const [name] of serviceHistory.entries()) {
    if (!currentServiceNames.has(name)) {
      serviceHistory.delete(name);
    }
  }

  console.log("[health-monitor] Health check complete");
}

/**
 * Manually trigger an immediate health check
 * Used by the server:health-check command
 */
export async function triggerHealthCheck() {
  return performHealthCheck();
}

/**
 * Start the health monitor
 */
export function startHealthMonitor(serverIdParam: string) {
  serverId = serverIdParam;
  console.log("[health-monitor] Starting health monitor...");

  // Run first check after 30 seconds (give services time to stabilize on startup)
  setTimeout(() => performHealthCheck(), 30_000);

  // Then run every HEALTH_CHECK_INTERVAL
  interval = setInterval(() => performHealthCheck(), HEALTH_CHECK_INTERVAL);
}

/**
 * Stop the health monitor
 */
export function stopHealthMonitor() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  serviceHistory.clear();
  serverId = null;
  console.log("[health-monitor] Health monitor stopped");
}
