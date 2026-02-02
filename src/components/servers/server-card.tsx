import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServerStatusBadge } from "./server-status-badge";
import type { Server, ServerStatusJson } from "@/lib/types/database";
import { MOAV_SERVICES } from "@/lib/constants";
import { Server as ServerIcon, ChevronRight } from "lucide-react";

interface ServerCardProps {
  server: Server;
}

function serviceCountSummary(statusJson: ServerStatusJson) {
  const services = statusJson.services ?? {};
  const running = Object.values(services).filter((s) => s === "running").length;
  const total = MOAV_SERVICES.length;
  return `${running}/${total} services running`;
}

export function ServerCard({ server }: ServerCardProps) {
  return (
    <Link href={`/servers/${server.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ServerIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{server.name}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {server.ip}
              </CardDescription>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <ServerStatusBadge lastSeenAt={server.last_seen_at} />
            <span className="text-xs text-muted-foreground">
              {serviceCountSummary(server.status_json ?? {})}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
