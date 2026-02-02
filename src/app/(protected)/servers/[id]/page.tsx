"use client";

import { useServer } from "@/contexts/server-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOAV_SERVICES } from "@/lib/constants";
import { isServerOnline, timeAgo } from "@/lib/utils";
import type { ServerStatusJson, ServiceState } from "@/lib/types/database";
import { Activity, Cpu, HardDrive, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function ServiceStateBadge({ state }: { state: ServiceState | undefined }) {
  if (!state || state === "unknown") {
    return <Badge variant="outline">Unknown</Badge>;
  }
  if (state === "running") {
    return <Badge className="bg-green-600 hover:bg-green-600">Running</Badge>;
  }
  if (state === "stopped") {
    return <Badge variant="secondary">Stopped</Badge>;
  }
  return <Badge variant="outline">Restarting</Badge>;
}

export default function ServerOverviewPage() {
  const { server } = useServer();

  const status: ServerStatusJson = server.status_json ?? {};
  const online = isServerOnline(server.last_seen_at);

  // Count running services
  const services = status.services ?? {};
  const runningCount = Object.values(services).filter((s) => s === "running").length;
  const totalCount = MOAV_SERVICES.length;

  return (
    <div className="space-y-6">
      {/* Health summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={cn(
          "transition-colors duration-300",
          online ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className={cn(
              "h-4 w-4",
              online ? "text-green-500" : "text-red-500"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              online ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {online ? "Online" : "Offline"}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeAgo(server.last_seen_at)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {status.health ?? "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.cpu_percent != null
                ? `${status.cpu_percent.toFixed(1)}%`
                : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status.mem_percent != null
                ? `${status.mem_percent.toFixed(1)}%`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Services</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{runningCount}/{totalCount} running</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MOAV_SERVICES.map((svc) => {
              const state = services[svc.id];
              const isRunning = state === "running";
              return (
                <div
                  key={svc.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 transition-all duration-300",
                    isRunning
                      ? "bg-green-500/5 border-green-500/30"
                      : "bg-muted/30 border-muted-foreground/20"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isRunning ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "font-medium text-sm",
                      !isRunning && "text-muted-foreground"
                    )}>
                      {svc.label}
                    </span>
                  </div>
                  <ServiceStateBadge state={state} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Server info */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">IP / Host</span>
            <span className="font-mono">{server.ip}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">MoaV Version</span>
            <span>{server.moav_version ?? "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Added</span>
            <span>{new Date(server.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
