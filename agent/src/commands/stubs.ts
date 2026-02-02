import type { CommandHandler } from "../types.js";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const serviceStart: CommandHandler = async (payload) => {
  await delay(1000);
  return {
    success: true,
    data: { service: payload.service, action: "started" },
  };
};

export const serviceStop: CommandHandler = async (payload) => {
  await delay(1000);
  return {
    success: true,
    data: { service: payload.service, action: "stopped" },
  };
};

export const serviceRestart: CommandHandler = async (payload) => {
  await delay(1500);
  return {
    success: true,
    data: { service: payload.service, action: "restarted" },
  };
};

import { supabase } from "../supabase.js";

export const userAdd: CommandHandler = async (payload) => {
  await delay(2000);

  const mockConfig = {
    wireguard: `[Interface]
PrivateKey = (hidden)
Address = 10.8.0.2/24
DNS = 1.1.1.1

[Peer]
PublicKey = (server_public_key)
Endpoint = ${payload.server_ip || "203.0.113.10"}:51820
AllowedIPs = 0.0.0.0/0
`,
    vless: "vless://uuid@domain:443?security=reality&type=tcp&flow=xtls-rprx-vision#user",
    hysteria2: "hysteria2://password@domain:443?insecure=1&sni=domain#user"
  };

  // Update table directly
  if (payload.server_id && payload.username) {
    await supabase
      .from("vpn_users")
      .update({ config_raw: mockConfig, status: 'active' } as any) // Cast to any because generated types might not be up to date in agent
      .eq("server_id", payload.server_id as string)
      .eq("username", payload.username as string);
  }

  return {
    success: true,
    data: {
      username: payload.username,
      bundle_path: `/outputs/bundles/${payload.username}/`,
      config: mockConfig
    },
  };
};

export const userUpdate: CommandHandler = async (payload) => {
  await delay(1500);

  // Update table directly
  if (payload.vpn_user_id) {
    const updates: Record<string, any> = {};
    if (payload.username !== undefined) updates.username = payload.username;
    if (payload.note !== undefined) updates.note = payload.note;
    if (payload.data_limit_gb !== undefined) updates.data_limit_gb = payload.data_limit_gb;
    if (payload.expires_at !== undefined) updates.expires_at = payload.expires_at;
    if (payload.access_policy !== undefined) updates.access_policy = payload.access_policy;

    await supabase
      .from("vpn_users")
      .update(updates)
      .eq("id", payload.vpn_user_id as string);
  }

  return {
    success: true,
    data: {
      username: payload.username,
      ...payload
    },
  };
};

export const userRevoke: CommandHandler = async (payload) => {
  await delay(1500);
  console.log(`[STUB] Executing: moav user remove ${payload.username}`);
  return {
    success: true,
    data: { username: payload.username, action: "revoked" },
  };
};

export const userUpdateAccess: CommandHandler = async (payload) => {
  await delay(2000);
  return {
    success: true,
    data: {
      username: payload.username,
      access_policy: payload.access_policy,
    },
  };
};

export const serverStatus: CommandHandler = async () => {
  await delay(500);
  return {
    success: true,
    data: {
      services: {
        wireguard: "running",
        hysteria2: "running",
        trojan: "stopped",
        "vless-reality": "running",
        dnstt: "stopped",
        "conduit-snowflake": "stopped",
      },
      health: "ok",
    },
  };
};

export const serverLogs: CommandHandler = async (payload) => {
  await delay(500);
  return {
    success: true,
    data: {
      service: payload.service,
      lines: [
        `[stub] ${new Date().toISOString()} ${payload.service}: service is running normally`,
        `[stub] ${new Date().toISOString()} ${payload.service}: 0 errors in last 60s`,
      ],
    },
  };
};

export const serverExport: CommandHandler = async () => {
  await delay(3000);
  return {
    success: true,
    data: { backup_path: "/tmp/moav-backup.tar.gz" },
  };
};

export const serverTest: CommandHandler = async (payload) => {
  await delay(2000);
  return {
    success: true,
    data: {
      username: payload.username,
      results: {
        wireguard: "pass",
        hysteria2: "pass",
        trojan: "pass",
        "vless-reality": "pass",
        dnstt: "skip",
        "conduit-snowflake": "skip",
      },
    },
  };
};
