import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    sshExec,
    testSSHConnection,
    isMoavInstalled,
    installAgent,
    type SSHConfig
} from "@/lib/ssh";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, ip, username, password, installMoav, adminPassword } = body;

        // Validate required fields
        if (!name || !ip || !username || !password) {
            return NextResponse.json(
                { error: "Name, IP, username, and password are required" },
                { status: 400 }
            );
        }

        if (installMoav && !adminPassword) {
            return NextResponse.json(
                { error: "Admin password is required for fresh MoaV installation" },
                { status: 400 }
            );
        }

        const sshConfig: SSHConfig = {
            host: ip,
            username,
            password,
        };

        // Step 1: Test SSH connection
        console.log(`[provision] Testing SSH connection to ${ip}...`);
        const canConnect = await testSSHConnection(sshConfig);
        if (!canConnect) {
            return NextResponse.json(
                { error: "Could not connect to server. Please check IP, username, and password." },
                { status: 400 }
            );
        }
        console.log(`[provision] SSH connection successful`);

        // Step 2: Check if MoaV is installed
        console.log(`[provision] Checking if MoaV is installed...`);
        let moavInstalled = await isMoavInstalled(sshConfig);

        if (!moavInstalled) {
            if (!installMoav) {
                // MoaV is not installed and user didn't request installation
                return NextResponse.json(
                    {
                        error: "MoaV is not installed on this server. Select 'Fresh VPS' to install it automatically.",
                        moav_installed: false
                    },
                    { status: 400 }
                );
            }

            // Install MoaV
            console.log(`[provision] Installing MoaV...`);
            const moavInstallResult = await installMoavOnServer(sshConfig, adminPassword);

            if (!moavInstallResult.success) {
                return NextResponse.json(
                    {
                        error: "Failed to install MoaV",
                        details: moavInstallResult.output
                    },
                    { status: 500 }
                );
            }
            console.log(`[provision] MoaV installed successfully`);
            moavInstalled = true;
        } else {
            console.log(`[provision] MoaV is already installed`);
        }

        // Step 3: Create server record in database
        const agentToken = randomBytes(32).toString("hex");
        const supabase = createAdminClient();

        const { data: server, error: dbError } = await supabase
            .from("servers")
            .insert({
                name,
                ip,
                agent_token: agentToken,
            })
            .select()
            .single();

        if (dbError) {
            return NextResponse.json(
                { error: `Database error: ${dbError.message}` },
                { status: 500 }
            );
        }
        console.log(`[provision] Server record created: ${server.id}`);

        // Step 4: Install and configure the agent on the VPS
        console.log(`[provision] Installing agent...`);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const installResult = await installAgent(sshConfig, {
            supabaseUrl,
            supabaseServiceKey,
            agentToken,
        });

        if (!installResult.success) {
            // Agent installation failed - delete the server record
            await supabase.from("servers").delete().eq("id", server.id);

            return NextResponse.json(
                {
                    error: "Failed to install agent on server",
                    details: installResult.output
                },
                { status: 500 }
            );
        }
        console.log(`[provision] Agent installed successfully`);

        // Step 5: Wait a moment for the agent to start and send first heartbeat
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check if server came online
        const { data: updatedServer } = await supabase
            .from("servers")
            .select("last_seen_at")
            .eq("id", server.id)
            .single();

        const isOnline = updatedServer?.last_seen_at !== null;

        return NextResponse.json({
            success: true,
            server: {
                id: server.id,
                name: server.name,
                ip: server.ip,
                online: isOnline,
            },
            message: isOnline
                ? "Server provisioned and agent is running!"
                : "Server provisioned. Agent is starting...",
        });

    } catch (error) {
        console.error("[provision] Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Provisioning failed: ${message}` },
            { status: 500 }
        );
    }
}

/**
 * Install MoaV on a fresh server
 */
async function installMoavOnServer(
    config: SSHConfig,
    adminPassword: string
): Promise<{ success: boolean; output: string }> {
    // The MoaV installer script with non-interactive options
    // We set environment variables to skip prompts
    const installScript = `
#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive

# Set MoaV configuration via environment
export ADMIN_PASSWORD="${adminPassword}"
export NON_INTERACTIVE=1

# Download and run MoaV installer
curl -fsSL moav.sh/install.sh -o /tmp/moav-install.sh
chmod +x /tmp/moav-install.sh

# Run installer - it will detect NON_INTERACTIVE and use defaults
cd /tmp && bash moav-install.sh

echo "MoaV installation completed!"
`;

    try {
        const result = await sshExec(
            config,
            installScript,
            { timeout: 600000 } // 10 minute timeout for MoaV install
        );
        return {
            success: result.exitCode === 0 || result.output.includes("installation completed"),
            output: result.output,
        };
    } catch (error) {
        return {
            success: false,
            output: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
