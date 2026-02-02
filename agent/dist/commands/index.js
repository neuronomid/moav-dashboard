import { serviceStart, serviceStop, serviceRestart, userAdd, userUpdate, userRevoke, userUpdateAccess, serverStatus, serverLogs, serverExport, serverTest, serverHealthCheck, } from "./real.js";
/**
 * Command allowlist: only these command types will be executed.
 * Anything not in this map is rejected with an error.
 */
export const commandRegistry = new Map([
    ["service:start", serviceStart],
    ["service:stop", serviceStop],
    ["service:restart", serviceRestart],
    ["user:add", userAdd],
    ["user:update", userUpdate],
    ["user:revoke", userRevoke],
    ["user:update-access", userUpdateAccess],
    ["server:status", serverStatus],
    ["server:logs", serverLogs],
    ["server:export", serverExport],
    ["server:test", serverTest],
    ["server:health-check", serverHealthCheck],
]);
