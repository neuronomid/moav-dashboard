"use client";

import { useParams } from "next/navigation";
import { createCommand } from "@/lib/actions/commands";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOAV_SERVICES } from "@/lib/constants";
import { Play, Square, RotateCw } from "lucide-react";
import { toast } from "sonner";

export default function ServicesPage() {
  const params = useParams<{ id: string }>();
  const serverId = params.id;

  async function handleAction(
    service: string,
    action: "service:start" | "service:stop" | "service:restart"
  ) {
    const result = await createCommand(serverId, action, { service });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Command queued: ${action} ${service}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Control</CardTitle>
        <CardDescription>
          Start, stop, or restart individual MoaV services. Commands are queued
          and executed by the agent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {MOAV_SERVICES.map((svc) => (
            <div
              key={svc.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <span className="font-medium">{svc.label}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {svc.profile}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(svc.id, "service:start")}
                >
                  <Play className="mr-1 h-3 w-3" />
                  Start
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(svc.id, "service:stop")}
                >
                  <Square className="mr-1 h-3 w-3" />
                  Stop
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(svc.id, "service:restart")}
                >
                  <RotateCw className="mr-1 h-3 w-3" />
                  Restart
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
