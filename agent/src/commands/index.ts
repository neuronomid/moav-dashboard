import type { CommandHandler } from "../types.js";
import {
  serviceStart,
  serviceStop,
  serviceRestart,
  userAdd,
  userRevoke,
  userUpdateAccess,
  serverStatus,
  serverLogs,
  serverExport,
  serverTest,
} from "./stubs.js";

/**
 * Command allowlist: only these command types will be executed.
 * Anything not in this map is rejected with an error.
 */
export const commandRegistry = new Map<string, CommandHandler>([
  ["service:start", serviceStart],
  ["service:stop", serviceStop],
  ["service:restart", serviceRestart],
  ["user:add", userAdd],
  ["user:revoke", userRevoke],
  ["user:update-access", userUpdateAccess],
  ["server:status", serverStatus],
  ["server:logs", serverLogs],
  ["server:export", serverExport],
  ["server:test", serverTest],
]);
