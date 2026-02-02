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

export const userAdd: CommandHandler = async (payload) => {
  await delay(2000);
  return {
    success: true,
    data: {
      username: payload.username,
      bundle_path: `/outputs/bundles/${payload.username}/`,
    },
  };
};

export const userRevoke: CommandHandler = async (payload) => {
  await delay(1500);
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
