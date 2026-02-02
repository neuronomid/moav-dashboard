import { runCommand } from "../lib/shell.js";
import { supabase } from "../supabase.js";
import { triggerHealthCheck } from "../monitors/health-monitor.js";
import fs from "fs/promises";
import path from "path";
// MoaV installation path - adjust if installed elsewhere
const MOAV_PATH = process.env.MOAV_PATH || "/opt/moav/moav.sh";
// Helper to run moav commands with proper path
const moav = (args) => runCommand(`${MOAV_PATH} ${args}`);
export const serviceStart = async (payload) => {
    await moav(`start ${payload.service}`);
    return {
        success: true,
        data: { service: payload.service, action: "started" },
    };
};
export const serviceStop = async (payload) => {
    await moav(`stop ${payload.service}`);
    return {
        success: true,
        data: { service: payload.service, action: "stopped" },
    };
};
export const serviceRestart = async (payload) => {
    await moav(`restart ${payload.service}`);
    return {
        success: true,
        data: { service: payload.service, action: "restarted" },
    };
};
export const userAdd = async (payload) => {
    const username = payload.username;
    const vpnUserId = payload.vpn_user_id;
    const serverId = payload.server_id;
    if (!username)
        throw new Error("Username is required");
    if (!vpnUserId)
        throw new Error("VPN user ID is required");
    if (!serverId)
        throw new Error("Server ID is required");
    // Create user with --package flag to generate bundle
    await moav(`user add ${username} --package`);
    // Read the generated config bundle
    const bundlePath = `/opt/moav/outputs/bundles/${username}`;
    const configRaw = {};
    console.log(`[user:add] Looking for config files in: ${bundlePath}`);
    try {
        // List directory contents for debugging
        try {
            const dirContents = await fs.readdir(bundlePath);
            console.log(`[user:add] Bundle directory contents:`, dirContents);
        }
        catch (e) {
            console.error(`[user:add] Could not list bundle directory:`, e);
        }
        // Read each protocol config file
        // Note: MoaV generates hysteria2.yaml (not .txt)
        const files = [
            { key: 'reality', file: 'reality.txt' },
            { key: 'trojan', file: 'trojan.txt' },
            { key: 'hysteria2', file: 'hysteria2.yaml' },
            { key: 'wireguard', file: 'wireguard.conf' },
            { key: 'wireguard_wstunnel', file: 'wireguard-wstunnel.conf' },
            { key: 'dnstt', file: 'dnstt-instructions.txt' },
        ];
        for (const { key, file } of files) {
            try {
                const filePath = path.join(bundlePath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                configRaw[key] = content.trim();
                console.log(`[user:add] Successfully read ${file} (${content.length} bytes)`);
            }
            catch (err) {
                // File might not exist if protocol is disabled
                console.warn(`[user:add] Could not read ${file} for ${username}:`, err.message);
            }
        }
        // Update database with config and mark as active
        await supabase
            .from("vpn_users")
            .update({
            status: 'active',
            config_raw: configRaw
        })
            .eq("id", vpnUserId);
    }
    catch (e) {
        console.error("Failed to get config or update DB:", e);
        // Still mark as active even if config read failed
        await supabase
            .from("vpn_users")
            .update({ status: 'active' })
            .eq("id", vpnUserId);
    }
    return {
        success: true,
        data: {
            username,
            action: "created",
            config_raw: configRaw
        },
    };
};
export const userUpdate = async (payload) => {
    const username = payload.username;
    if (!username)
        throw new Error("Username is required");
    // Handle specific updates if 'moav' supports them
    // e.g. moav user limit <username> <limit>
    // e.g. moav user expire <username> <date>
    if (payload.data_limit_gb) {
        await moav(`user limit ${username} ${payload.data_limit_gb}GB`);
    }
    if (payload.expires_at) {
        // Format date?
        await moav(`user expire ${username} "${payload.expires_at}"`);
    }
    // Also update DB (though action already did it, agent might want to confirm)
    // The stub updated the DB, so we should too to be safe/consistent.
    if (payload.vpn_user_id) {
        const updates = {};
        if (payload.note !== undefined)
            updates.note = payload.note;
        // ... other fields are less "config" related usually.
        await supabase
            .from("vpn_users")
            .update(updates)
            .eq("id", payload.vpn_user_id);
    }
    return {
        success: true,
        data: { username, ...payload },
    };
};
export const userRevoke = async (payload) => {
    const username = payload.username;
    if (!username)
        throw new Error("Username is required");
    // Revoke user from MoaV (removes from all protocols)
    await moav(`user revoke ${username}`);
    return {
        success: true,
        data: { username, action: "revoked" },
    };
};
export const userUpdateAccess = async (payload) => {
    // Assuming moav has command for this
    // moav user access ...
    await moav(`user update-access ${payload.username} '${JSON.stringify(payload.access_policy)}'`);
    return {
        success: true,
        data: { username: payload.username, access_policy: payload.access_policy },
    };
};
export const serverStatus = async () => {
    // Real implementation would parse `systemctl status` or `moav status`
    const { stdout } = await moav(`status --json`);
    // Assuming JSON output
    let data;
    try {
        data = JSON.parse(stdout);
    }
    catch {
        // Fallback or parsing logic
        data = { raw_output: stdout };
    }
    return {
        success: true,
        data
    };
};
export const serverLogs = async (payload) => {
    const service = payload.service;
    const lines = payload.lines || 50;
    const { stdout } = await moav(`logs ${service} -n ${lines}`);
    return {
        success: true,
        data: {
            service,
            lines: stdout.split('\n').filter(line => line.trim())
        }
    };
};
export const serverExport = async () => {
    const backupPath = "/tmp/moav-backup.tar.gz";
    await moav(`export ${backupPath}`);
    return {
        success: true,
        data: { backup_path: backupPath }
    };
};
export const serverTest = async (payload) => {
    const { stdout } = await moav(`test ${payload.username} --json`);
    // parse stdout
    let data;
    try {
        data = JSON.parse(stdout);
    }
    catch {
        data = { raw_output: stdout };
    }
    return {
        success: true,
        data
    };
};
export const serverHealthCheck = async () => {
    await triggerHealthCheck();
    return {
        success: true,
        data: { message: "Health check completed and auto-remediation applied if needed" }
    };
};
