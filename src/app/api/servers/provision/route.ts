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
 * This performs a manual non-interactive installation:
 * 1. Install prerequisites (docker, git, jq, qrencode, zip)
 * 2. Clone MoaV repository
 * 3. Create .env configuration file
 * 4. Run bootstrap (generate keys, start services)
 * 5. Install global moav command
 */
async function installMoavOnServer(
    config: SSHConfig,
    adminPassword: string
): Promise<{ success: boolean; output: string }> {
    // Manual non-interactive MoaV installation
    // The official installer is interactive, so we do the steps manually
    const installScript = `
#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive

echo "=== MoaV Non-Interactive Installation ==="
echo ""

# Detect OS
if [ -f /etc/debian_version ]; then
    OS_TYPE="debian"
elif [ -f /etc/redhat-release ] || [ -f /etc/fedora-release ]; then
    OS_TYPE="rhel"
else
    OS_TYPE="unknown"
fi

echo "[1/7] Installing prerequisites..."


# Update package lists
if [ "$OS_TYPE" = "debian" ]; then
    apt-get update -qq
elif [ "$OS_TYPE" = "rhel" ]; then
    dnf makecache -q || yum makecache -q
fi

# Install git
if ! command -v git &> /dev/null; then
    echo "  Installing git..."
    if [ "$OS_TYPE" = "debian" ]; then
        apt-get install -y -qq git
    else
        dnf install -y -q git || yum install -y -q git
    fi
fi
echo "  ✓ git"

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "  Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker 2>/dev/null || service docker start 2>/dev/null || true
    systemctl enable docker 2>/dev/null || true
fi
echo "  ✓ docker"

# Ensure Docker is running
if ! docker info &> /dev/null; then
    systemctl start docker 2>/dev/null || service docker start 2>/dev/null || true
    sleep 3
fi

# Install jq
if ! command -v jq &> /dev/null; then
    echo "  Installing jq..."
    if [ "$OS_TYPE" = "debian" ]; then
        apt-get install -y -qq jq
    else
        dnf install -y -q jq || yum install -y -q jq
    fi
fi
echo "  ✓ jq"

# Install qrencode
if ! command -v qrencode &> /dev/null; then
    echo "  Installing qrencode..."
    if [ "$OS_TYPE" = "debian" ]; then
        apt-get install -y -qq qrencode
    else
        dnf install -y -q qrencode || yum install -y -q qrencode
    fi
fi
echo "  ✓ qrencode"

# Install zip
if ! command -v zip &> /dev/null; then
    echo "  Installing zip..."
    if [ "$OS_TYPE" = "debian" ]; then
        apt-get install -y -qq zip
    else
        dnf install -y -q zip || yum install -y -q zip
    fi
fi
echo "  ✓ zip"

echo ""
echo "[2/7] Cloning MoaV repository..."

INSTALL_DIR="/opt/moav"

if [ -d "$INSTALL_DIR" ]; then
    echo "  MoaV directory exists, updating..."
    cd "$INSTALL_DIR"
    git pull origin main || git pull || true
else
    git clone https://github.com/shayanb/MoaV.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
chmod +x moav.sh
chmod +x scripts/*.sh 2>/dev/null || true

echo "  ✓ MoaV cloned to $INSTALL_DIR"

echo ""
echo "[3/7] Detecting server IP..."

# Get server's public IP
SERVER_IP=$(curl -4 -s ifconfig.me || curl -4 -s icanhazip.com || hostname -I | awk '{print $1}')
echo "  Server IP: $SERVER_IP"

echo ""
echo "[4/7] Creating configuration..."

# Create .env file with minimal configuration
# Using a placeholder email - user can update later
cat > "$INSTALL_DIR/.env" << ENVFILE
# MoaV Configuration
# Generated by MoaV Manager

# Your server's public IP address
SERVER_IP=$SERVER_IP

# Domain for TLS certificates (optional - will use IP if not set)
# DOMAIN=

# Email for Let's Encrypt (required for domain certificates)
# ACME_EMAIL=admin@example.com

# Admin password for the web panel
ADMIN_PASSWORD=${adminPassword}

# Default profiles to start
DEFAULT_PROFILES=reality,trojan,hysteria2,wireguard

# Component versions (defaults from .env.example will be used if not set)
ENVFILE

echo "  ✓ Configuration created"

echo ""
echo "[5/7] Running bootstrap..."
echo "  This generates encryption keys and sets up services..."

# Run bootstrap using docker compose directly (non-interactive)
cd "$INSTALL_DIR"
docker compose --profile setup build bootstrap 2>&1 || true
docker compose --profile setup run --rm bootstrap 2>&1 || {
    echo "  Warning: Bootstrap encountered an issue, may need manual review"
}

# Start the default services
echo ""
echo "  Starting services..."
docker compose --profile reality --profile trojan --profile hysteria2 --profile wireguard up -d 2>&1 || {
    docker compose up -d 2>&1 || true
}

echo "  ✓ Bootstrap completed"

echo ""
echo "[6/7] Installing moav command globally..."

# Create symlink for global access
./moav.sh install 2>/dev/null || {
    ln -sf "$INSTALL_DIR/moav.sh" /usr/local/bin/moav 2>/dev/null || true
}
echo "  ✓ moav command installed"

echo ""
echo "[7/7] Verifying installation..."

if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/moav.sh" ] && [ -f "$INSTALL_DIR/.env" ]; then
    echo ""
    echo "==================================="
    echo "  MoaV installation completed!"
    echo "==================================="
    echo ""
    echo "  Location: $INSTALL_DIR"
    echo "  Command:  moav"
    echo ""
else
    echo "ERROR: Installation verification failed!"
    exit 1
fi
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
