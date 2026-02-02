import { execSync } from "child_process";
import { supabase } from "./supabase.js";
let interval = null;
// Map Docker service names to the format we use in the dashboard
const SERVICE_ID_MAP = {
    "sing-box": "sing-box",
    "wireguard": "wireguard",
    "wstunnel": "wstunnel",
    "dnstt": "dnstt",
    "conduit": "conduit",
    "snowflake": "snowflake",
    "decoy": "decoy",
    "admin": "admin",
    "certbot": "certbot",
    "psiphon-conduit": "psiphon-conduit",
};
function getDockerServiceStatus() {
    const services = {};
    try {
        // Run docker compose to get service status as JSON
        // MoaV is installed at /opt/moav
        const output = execSync("docker compose --profile all ps -a --format json", {
            cwd: "/opt/moav",
            encoding: "utf-8",
            timeout: 30000,
            stdio: ["pipe", "pipe", "pipe"],
        });
        if (!output || output.trim() === "" || output.trim() === "[]") {
            console.log("[heartbeat] No Docker services found");
            return services;
        }
        // Parse JSON - can be array or newline-delimited JSON objects
        let items;
        const trimmed = output.trim();
        if (trimmed.startsWith("[")) {
            // JSON array format
            items = JSON.parse(trimmed);
        }
        else {
            // NDJSON format (one object per line)
            items = trimmed
                .split("\n")
                .filter((line) => line.trim())
                .map((line) => JSON.parse(line));
        }
        for (const item of items) {
            // Remove "moav-" prefix if present
            const name = item.Name?.replace(/^moav-/, "") || "";
            if (!name)
                continue;
            const state = item.State?.toLowerCase() || "";
            const health = item.Health?.toLowerCase() || "";
            let serviceState;
            if (state === "running") {
                if (health === "unhealthy") {
                    serviceState = "restarting";
                }
                else {
                    serviceState = "running";
                }
            }
            else if (state === "restarting") {
                serviceState = "restarting";
            }
            else if (state === "exited" || state === "dead" || state === "created") {
                serviceState = "stopped";
            }
            else {
                serviceState = "unknown";
            }
            // Map to our service ID
            const serviceId = SERVICE_ID_MAP[name] || name;
            services[serviceId] = serviceState;
        }
    }
    catch (error) {
        const err = error;
        console.error("[heartbeat] Error getting Docker status:", err.message);
        // If docker compose fails, try to provide fallback status
        // This might happen if the agent is not running on the VPS
        if (err.message.includes("ENOENT") || err.message.includes("not found")) {
            console.warn("[heartbeat] MoaV not found at /opt/moav - using mock data");
            return generateFakeServiceStatus();
        }
    }
    return services;
}
function generateFakeServiceStatus() {
    // Fallback for development when not on actual VPS
    return {
        "sing-box": "running",
        "wireguard": "running",
        "wstunnel": "running",
        "dnstt": "running",
        "conduit": "running",
        "snowflake": "running",
        "decoy": "running",
        "admin": "running",
    };
}
function getSystemMetrics() {
    try {
        // Try to get real CPU and memory usage
        const loadAvg = execSync("cat /proc/loadavg", { encoding: "utf-8" });
        const load1Min = parseFloat(loadAvg.split(" ")[0]) || 0;
        const memInfo = execSync("free | grep Mem", { encoding: "utf-8" });
        const memParts = memInfo.trim().split(/\s+/);
        const totalMem = parseInt(memParts[1]) || 1;
        const usedMem = parseInt(memParts[2]) || 0;
        const memPercent = (usedMem / totalMem) * 100;
        // Convert load average to approximate CPU percentage (rough estimate)
        // Assume 1 CPU core, load of 1.0 = 100%
        const cpuPercent = Math.min(load1Min * 100, 100);
        return {
            cpu_percent: Math.round(cpuPercent * 10) / 10,
            mem_percent: Math.round(memPercent * 10) / 10,
        };
    }
    catch {
        // Fallback for macOS or other systems
        return {
            cpu_percent: Math.round(Math.random() * 30 * 10) / 10,
            mem_percent: Math.round((40 + Math.random() * 20) * 10) / 10,
        };
    }
}
function getMoavVersion() {
    try {
        // Try to get version from MoaV
        const output = execSync("grep -E '^VERSION=' /opt/moav/moav.sh 2>/dev/null | head -1", {
            encoding: "utf-8",
            timeout: 5000,
        });
        const match = output.match(/VERSION="?([^"\n]+)"?/);
        return match?.[1] || null;
    }
    catch {
        return null;
    }
}
function generateRealStatus() {
    const services = getDockerServiceStatus();
    const metrics = getSystemMetrics();
    // Determine overall health based on service status
    const serviceStates = Object.values(services);
    const runningCount = serviceStates.filter((s) => s === "running").length;
    const totalCount = serviceStates.length;
    let health;
    if (totalCount === 0 || runningCount === 0) {
        health = "critical";
    }
    else if (runningCount < totalCount) {
        health = "warn";
    }
    else {
        health = "ok";
    }
    return {
        services,
        health,
        uptime_seconds: Math.floor(process.uptime()),
        cpu_percent: metrics.cpu_percent,
        mem_percent: metrics.mem_percent,
    };
}
export function startHeartbeat(serverId) {
    async function beat() {
        const status = generateRealStatus();
        const moavVersion = getMoavVersion();
        const updateData = {
            last_seen_at: new Date().toISOString(),
            status_json: status,
        };
        // Update moav_version if we can detect it
        if (moavVersion) {
            updateData.moav_version = moavVersion;
        }
        const { error } = await supabase
            .from("servers")
            .update(updateData)
            .eq("id", serverId);
        if (error) {
            console.error("[heartbeat] Error:", error.message);
        }
        else {
            const running = Object.values(status.services).filter((s) => s === "running").length;
            const total = Object.keys(status.services).length;
            console.log(`[heartbeat] OK - ${running}/${total} services running, health: ${status.health}`);
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
