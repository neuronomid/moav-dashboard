import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOAV_SERVICES } from "@/lib/constants";
import { isServerOnline, timeAgo } from "@/lib/utils";
import type { Server, ServerStatusJson, ServiceState } from "@/lib/types/database";
import { Activity, Cpu, HardDrive } from "lucide-react";

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

export default async function ServerOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: server } = await supabase
    .from("servers")
    .select("*")
    .eq("id", id)
    .single();

  if (!server) notFound();

  const s = server as Server;
  const status: ServerStatusJson = s.status_json ?? {};
  const online = isServerOnline(s.last_seen_at);

  return (
    <div className="space-y-6">
      {/* Health summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {online ? "Online" : "Offline"}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeAgo(s.last_seen_at)}
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
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MOAV_SERVICES.map((svc) => {
              const state = status.services?.[svc.id];
              return (
                <div
                  key={svc.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-medium">{svc.label}</span>
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
            <span className="text-muted-foreground">Host</span>
            <span className="font-mono">{s.host}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">MoaV Version</span>
            <span>{s.moav_version ?? "Unknown"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agent ID</span>
            <span className="font-mono">{s.agent_id ?? "Not registered"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Registered</span>
            <span>{s.is_registered ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Added</span>
            <span>{new Date(s.created_at).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
