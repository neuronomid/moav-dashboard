"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createCommand } from "@/lib/actions/commands";
import { useServer } from "@/contexts/server-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MOAV_SERVICES } from "@/lib/constants";
import type { ServiceState } from "@/lib/types/database";
import { Play, Square, RotateCw, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ServiceRowProps {
  id: string;
  label: string;
  profile: string;
  state: ServiceState | undefined;
  serverId: string;
  pendingAction: string | null;
  onAction: (service: string, action: "service:start" | "service:stop" | "service:restart") => void;
}

function ServiceRow({ id, label, profile, state, serverId, pendingAction, onAction }: ServiceRowProps) {
  const isRunning = state === "running";
  const isStopped = state === "stopped";
  const isRestarting = state === "restarting";
  const isUnknown = !state || state === "unknown";
  const isPending = pendingAction !== null;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border p-4 transition-all duration-300",
        isRunning && "bg-green-500/5 border-green-500/30 shadow-sm shadow-green-500/10",
        isStopped && "bg-muted/30 border-muted-foreground/20",
        isRestarting && "bg-yellow-500/5 border-yellow-500/30",
        isUnknown && "bg-muted/20 border-dashed"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full",
            isRunning && "bg-green-500/20",
            isStopped && "bg-muted",
            isRestarting && "bg-yellow-500/20",
            isUnknown && "bg-muted/50"
          )}
        >
          {isRunning && (
            <>
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              <CheckCircle2 className="h-4 w-4 text-green-500 relative z-10" />
            </>
          )}
          {isStopped && <XCircle className="h-4 w-4 text-muted-foreground" />}
          {isRestarting && <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />}
          {isUnknown && <AlertCircle className="h-4 w-4 text-muted-foreground/50" />}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{label}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                isRunning && "bg-green-500/10 text-green-600 dark:text-green-400",
                isStopped && "bg-muted text-muted-foreground",
                isRestarting && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                isUnknown && "bg-muted/50 text-muted-foreground/50"
              )}
            >
              {isRunning ? "Running" : isStopped ? "Stopped" : isRestarting ? "Restarting" : "Unknown"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Profile: {profile}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Show contextual buttons based on state */}
        {isStopped || isUnknown ? (
          <Button
            size="sm"
            onClick={() => onAction(id, "service:start")}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {pendingAction === "start" ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Play className="mr-1 h-3 w-3" />
            )}
            Start
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(id, "service:restart")}
              disabled={isPending}
              className="border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10 hover:text-yellow-600"
            >
              {pendingAction === "restart" ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RotateCw className="mr-1 h-3 w-3" />
              )}
              Restart
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(id, "service:stop")}
              disabled={isPending}
              className="border-red-500/50 text-red-600 hover:bg-red-500/10 hover:text-red-600"
            >
              {pendingAction === "stop" ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Square className="mr-1 h-3 w-3" />
              )}
              Stop
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const params = useParams<{ id: string }>();
  const serverId = params.id;
  const { server } = useServer();

  // Track pending actions per service
  const [pendingActions, setPendingActions] = useState<Record<string, string>>({});

  const services = server.status_json?.services ?? {};

  async function handleAction(
    service: string,
    action: "service:start" | "service:stop" | "service:restart"
  ) {
    const actionType = action.split(":")[1]; // start, stop, restart
    setPendingActions((prev) => ({ ...prev, [service]: actionType }));

    const result = await createCommand(serverId, action, { service });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Command queued: ${actionType} ${service}`);
    }

    // Clear pending after a short delay (the real update comes from realtime)
    setTimeout(() => {
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[service];
        return next;
      });
    }, 2000);
  }

  // Separate running and stopped services for better organization
  const runningServices = MOAV_SERVICES.filter((svc) => services[svc.id] === "running");
  const stoppedServices = MOAV_SERVICES.filter((svc) => services[svc.id] !== "running");

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0 space-y-3">
          {MOAV_SERVICES.map((svc) => (
            <ServiceRow
              key={svc.id}
              id={svc.id}
              label={svc.label}
              profile={svc.profile}
              state={services[svc.id]}
              serverId={serverId}
              pendingAction={pendingActions[svc.id] ?? null}
              onAction={handleAction}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
