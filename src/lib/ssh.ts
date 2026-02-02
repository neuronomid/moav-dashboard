import { Client } from "ssh2";

export interface SSHConfig {
    host: string;
    port?: number;
    username: string;
    password: string;
}

export interface SSHResult {
    success: boolean;
    output: string;
    exitCode: number;
}

/**
 * Execute a command on a remote server via SSH
 */
export function sshExec(
    config: SSHConfig,
    command: string,
    options: { timeout?: number } = {}
): Promise<SSHResult> {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        const timeout = options.timeout || 120000; // 2 minutes default
        let output = "";
        let stderr = "";
        let timeoutId: NodeJS.Timeout;

        conn.on("ready", () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    reject(err);
                    return;
                }

                stream.on("close", (code: number) => {
                    clearTimeout(timeoutId);
                    conn.end();
                    resolve({
                        success: code === 0,
                        output: output + stderr,
                        exitCode: code,
                    });
                });

                stream.on("data", (data: Buffer) => {
                    output += data.toString();
                });

                stream.stderr.on("data", (data: Buffer) => {
                    stderr += data.toString();
                });
            });
        });

        conn.on("error", (err) => {
            clearTimeout(timeoutId);
            reject(err);
        });

        // Set connection timeout
        timeoutId = setTimeout(() => {
            conn.end();
            reject(new Error("SSH connection timeout"));
        }, timeout);

        conn.connect({
            host: config.host,
            port: config.port || 22,
            username: config.username,
            password: config.password,
            readyTimeout: 30000,
            // Disable strict host key checking for ease of use
            // In production, you might want to handle this differently
        });
    });
}

/**
 * Test SSH connection to a server
 */
export async function testSSHConnection(config: SSHConfig): Promise<boolean> {
    try {
        const result = await sshExec(config, "echo 'connected'", { timeout: 15000 });
        return result.success && result.output.includes("connected");
    } catch {
        return false;
    }
}

/**
 * Check if MoaV is installed on the server
 */
export async function isMoavInstalled(config: SSHConfig): Promise<boolean> {
    try {
        const result = await sshExec(config, "test -d /opt/moav && echo 'yes' || echo 'no'");
        return result.output.trim() === "yes";
    } catch {
        return false;
    }
}

/**
 * Install MoaV on the server
 * This runs the official MoaV installer
 */
export async function installMoav(
    config: SSHConfig,
    onProgress?: (message: string) => void
): Promise<SSHResult> {
    onProgress?.("Installing MoaV prerequisites...");

    // The MoaV installer is interactive, so we need to run it in non-interactive mode
    // We'll use environment variables to pre-configure it
    const installCommand = `
    export DEBIAN_FRONTEND=noninteractive
    curl -fsSL moav.sh/install.sh | bash -s -- --non-interactive 2>&1 || true
  `;

    return sshExec(config, installCommand, { timeout: 300000 }); // 5 minute timeout
}

/**
 * Install and configure the MoaV agent on the server
 */
export async function installAgent(
    config: SSHConfig,
    agentConfig: {
        supabaseUrl: string;
        supabaseServiceKey: string;
        agentToken: string;
    },
    onProgress?: (message: string) => void
): Promise<SSHResult> {
    onProgress?.("Installing Node.js if needed...");

    // Install script that sets up the agent
    const installScript = `
#!/bin/bash
set -e

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Create agent directory
AGENT_DIR="/opt/moav-agent"
mkdir -p "$AGENT_DIR"
cd "$AGENT_DIR"

# Create package.json
cat > package.json << 'PKGJSON'
{
  "name": "moav-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
PKGJSON

# Create the agent code (simplified inline version)
mkdir -p dist

cat > dist/index.js << 'AGENTJS'
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AGENT_TOKEN = process.env.AGENT_TOKEN;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !AGENT_TOKEN) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Get server ID from token
async function register() {
  const { data: server, error } = await supabase
    .from("servers")
    .select("id, name")
    .eq("agent_token", AGENT_TOKEN)
    .single();

  if (error || !server) {
    console.error("Registration failed:", error?.message || "Invalid token");
    process.exit(1);
  }

  console.log(\`Registered as "\${server.name}" (\${server.id})\`);
  return server.id;
}

// Get service status from Docker
function getServiceStatus() {
  const services = {};
  try {
    const output = execSync(
      "docker compose --profile all ps -a --format json",
      { cwd: "/opt/moav", encoding: "utf-8", timeout: 30000 }
    );
    
    if (!output.trim() || output.trim() === "[]") return services;
    
    const items = output.trim().startsWith("[") 
      ? JSON.parse(output) 
      : output.trim().split("\\n").filter(l => l).map(l => JSON.parse(l));
    
    for (const item of items) {
      const name = (item.Name || "").replace(/^moav-/, "");
      if (!name) continue;
      
      const state = (item.State || "").toLowerCase();
      services[name] = state === "running" ? "running" : 
                       state === "restarting" ? "restarting" : "stopped";
    }
  } catch (e) {
    console.error("Error getting Docker status:", e.message);
  }
  return services;
}

// Get system metrics
function getMetrics() {
  try {
    const loadAvg = execSync("cat /proc/loadavg", { encoding: "utf-8" });
    const load1 = parseFloat(loadAvg.split(" ")[0]) || 0;
    
    const memInfo = execSync("free | grep Mem", { encoding: "utf-8" });
    const parts = memInfo.trim().split(/\\s+/);
    const total = parseInt(parts[1]) || 1;
    const used = parseInt(parts[2]) || 0;
    
    return {
      cpu_percent: Math.round(Math.min(load1 * 100, 100) * 10) / 10,
      mem_percent: Math.round((used / total) * 1000) / 10,
    };
  } catch {
    return { cpu_percent: 0, mem_percent: 0 };
  }
}

// Heartbeat
async function heartbeat(serverId) {
  const services = getServiceStatus();
  const metrics = getMetrics();
  
  const running = Object.values(services).filter(s => s === "running").length;
  const total = Object.keys(services).length;
  const health = total === 0 || running === 0 ? "critical" : 
                 running < total ? "warn" : "ok";

  const { error } = await supabase
    .from("servers")
    .update({
      last_seen_at: new Date().toISOString(),
      status_json: {
        services,
        health,
        uptime_seconds: Math.floor(process.uptime()),
        cpu_percent: metrics.cpu_percent,
        mem_percent: metrics.mem_percent,
      },
    })
    .eq("id", serverId);

  if (error) {
    console.error("[heartbeat] Error:", error.message);
  } else {
    console.log(\`[heartbeat] OK - \${running}/\${total} services, health: \${health}\`);
  }
}

// Command runner
async function pollCommands(serverId) {
  const { data: commands } = await supabase
    .from("commands")
    .select("*")
    .eq("server_id", serverId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (!commands || commands.length === 0) return;
  
  const cmd = commands[0];
  console.log(\`[command] Processing: \${cmd.type}\`);
  
  // Update to running
  await supabase.from("commands").update({ 
    status: "running", 
    started_at: new Date().toISOString() 
  }).eq("id", cmd.id);
  
  let result = { success: false, error: "Unknown command" };
  
  try {
    const payload = cmd.payload || {};
    
    switch (cmd.type) {
      case "service:start":
        execSync(\`cd /opt/moav && ./moav.sh start \${payload.service || ""}\`, { encoding: "utf-8" });
        result = { success: true, data: { message: "Service started" } };
        break;
      case "service:stop":
        execSync(\`cd /opt/moav && ./moav.sh stop \${payload.service || ""}\`, { encoding: "utf-8" });
        result = { success: true, data: { message: "Service stopped" } };
        break;
      case "service:restart":
        execSync(\`cd /opt/moav && ./moav.sh restart \${payload.service || ""}\`, { encoding: "utf-8" });
        result = { success: true, data: { message: "Service restarted" } };
        break;
      case "user:add":
        execSync(\`cd /opt/moav && ./moav.sh user add \${payload.username}\`, { encoding: "utf-8" });
        result = { success: true, data: { message: "User added" } };
        break;
      case "user:revoke":
        execSync(\`cd /opt/moav && echo y | ./moav.sh user revoke \${payload.username}\`, { encoding: "utf-8" });
        result = { success: true, data: { message: "User revoked" } };
        break;
      default:
        result = { success: false, error: \`Unknown command: \${cmd.type}\` };
    }
  } catch (e) {
    result = { success: false, error: e.message };
  }
  
  // Update completion
  await supabase.from("commands").update({
    status: result.success ? "completed" : "failed",
    result: result.success ? { data: result.data } : { error: result.error },
    error: result.success ? null : result.error,
    completed_at: new Date().toISOString(),
  }).eq("id", cmd.id);
  
  console.log(\`[command] \${result.success ? "Completed" : "Failed"}: \${cmd.type}\`);
}

// Main
async function main() {
  console.log("MoaV Agent starting...");
  
  const serverId = await register();
  
  // Start heartbeat
  heartbeat(serverId);
  setInterval(() => heartbeat(serverId), 15000);
  
  // Start command polling
  setInterval(() => pollCommands(serverId), 5000);
  
  console.log("Agent is running. Press Ctrl+C to stop.");
}

main().catch(console.error);
AGENTJS

# Create .env file
cat > .env << ENVFILE
SUPABASE_URL=${agentConfig.supabaseUrl}
SUPABASE_SERVICE_ROLE_KEY=${agentConfig.supabaseServiceKey}
AGENT_TOKEN=${agentConfig.agentToken}
ENVFILE

# Install dependencies
npm install --production

# Create systemd service
cat > /etc/systemd/system/moav-agent.service << 'SYSTEMD'
[Unit]
Description=MoaV Agent
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/moav-agent
EnvironmentFile=/opt/moav-agent/.env
ExecStart=/usr/bin/node /opt/moav-agent/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD

# Reload systemd and start agent
systemctl daemon-reload
systemctl enable moav-agent
systemctl restart moav-agent

echo "Agent installed and started successfully!"
`;

    // Write and execute the install script
    const result = await sshExec(
        config,
        `cat > /tmp/install-agent.sh << 'SCRIPT'\n${installScript}\nSCRIPT\nchmod +x /tmp/install-agent.sh && /tmp/install-agent.sh`,
        { timeout: 300000 } // 5 minute timeout
    );

    return result;
}
