"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  RefreshCw,
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServerStatusJson, LogEvent } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface HealthDialogProps {
  serverId: string;
  status: ServerStatusJson;
  trigger?: React.ReactNode;
}

interface ServiceIssue {
  service: string;
  state: string;
  issue: string;
}

export function HealthDialog({ serverId, status, trigger }: HealthDialogProps) {
  const [open, setOpen] = useState(false);
  const [remediationLogs, setRemediationLogs] = useState<LogEvent[]>([]);
  const [serviceLogs, setServiceLogs] = useState<LogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const supabase = createClient();

  // Fetch logs when dialog opens
  useEffect(() => {
    if (!open) return;

    async function fetchLogs() {
      setIsLoading(true);
      try {
        // Fetch remediation logs
        const { data: remLogs, error: remError } = await supabase
          .from("log_events")
          .select("*")
          .eq("server_id", serverId)
          .ilike("line", "%AUTO-REMEDIATION%")
          .order("ts", { ascending: false })
          .limit(20);

        if (remError) throw remError;
        setRemediationLogs((remLogs || []) as LogEvent[]);

        // Fetch service logs
        const { data: svcLogs, error: svcError } = await supabase
          .from("log_events")
          .select("*")
          .eq("server_id", serverId)
          .not("line", "ilike", "%AUTO-REMEDIATION%")
          .order("ts", { ascending: false })
          .limit(50);

        if (svcError) throw svcError;
        setServiceLogs((svcLogs || []) as LogEvent[]);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
        toast.error("Failed to load logs");
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, [open, serverId, supabase]);

  // Manual health check trigger
  const triggerHealthCheck = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("commands")
        .insert({
          server_id: serverId,
          type: "server:health-check",
          payload_json: {},
          status: "queued",
        });

      if (error) throw error;

      toast.success("Health check triggered", {
        description: "The agent will run a health check shortly.",
      });
      setOpen(false);
    } catch (error) {
      const err = error as Error;
      toast.error("Failed to trigger health check", {
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual service restart
  const restartService = async (serviceId: string) => {
    setIsRestarting(true);
    try {
      const { error } = await supabase
        .from("commands")
        .insert({
          server_id: serverId,
          type: "service:restart",
          payload_json: { service: serviceId },
          status: "queued",
        });

      if (error) throw error;

      toast.success(`Restarting ${serviceId}`, {
        description: "The service will restart shortly.",
      });
    } catch (error) {
      const err = error as Error;
      toast.error("Failed to restart service", {
        description: err.message,
      });
    } finally {
      setIsRestarting(false);
    }
  };

  // Refresh logs
  const refetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("log_events")
        .select("*")
        .eq("server_id", serverId)
        .ilike("line", "%AUTO-REMEDIATION%")
        .order("ts", { ascending: false })
        .limit(20);

      if (error) throw error;
      setRemediationLogs((data || []) as LogEvent[]);
      toast.success("Health data refreshed");
    } catch (error) {
      toast.error("Failed to refresh logs");
    } finally {
      setIsLoading(false);
    }
  };

  // Detect service issues
  const serviceIssues: ServiceIssue[] = [];
  const services = status.services ?? {};

  Object.entries(services).forEach(([serviceId, state]) => {
    if (state === "restarting") {
      serviceIssues.push({
        service: serviceId,
        state,
        issue: "Service is stuck restarting",
      });
    } else if (state === "stopped" && ["sing-box", "wireguard", "admin"].includes(serviceId)) {
      serviceIssues.push({
        service: serviceId,
        state,
        issue: "Critical service is stopped",
      });
    }
  });

  const healthColor =
    status.health === "ok"
      ? "text-green-600 dark:text-green-400"
      : status.health === "warn"
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-red-600 dark:text-red-400";

  const HealthIcon =
    status.health === "ok"
      ? CheckCircle
      : status.health === "warn"
      ? AlertCircle
      : XCircle;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="ghost">View Health</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Server Health & Diagnostics
          </DialogTitle>
          <DialogDescription>
            Health status, service issues, and auto-remediation history
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="remediation">
              Auto-Remediation
              {remediationLogs && remediationLogs.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {remediationLogs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs">Service Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Current Health Status */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    Current Health Status
                  </h3>
                  <div className={cn("text-2xl font-bold capitalize mt-1", healthColor)}>
                    <HealthIcon className="inline h-6 w-6 mr-2" />
                    {status.health ?? "Unknown"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetchLogs}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* System Metrics */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">CPU Usage</span>
                  <div className="text-lg font-semibold">
                    {status.cpu_percent != null ? `${status.cpu_percent.toFixed(1)}%` : "N/A"}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Memory Usage</span>
                  <div className="text-lg font-semibold">
                    {status.mem_percent != null ? `${status.mem_percent.toFixed(1)}%` : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Issues */}
            {serviceIssues.length > 0 ? (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Detected Issues ({serviceIssues.length})
                </h3>
                <div className="space-y-2">
                  {serviceIssues.map((issue) => (
                    <div
                      key={issue.service}
                      className="flex items-center justify-between bg-background rounded-md p-3 border"
                    >
                      <div>
                        <div className="font-medium">{issue.service}</div>
                        <div className="text-sm text-muted-foreground">{issue.issue}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restartService(issue.service)}
                        disabled={isRestarting}
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        Fix Now
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">No issues detected</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  All services are operating normally. The health monitor is running every 60
                  seconds.
                </p>
              </div>
            )}

            {/* Manual Actions */}
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold text-sm mb-3">Manual Diagnostics</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={triggerHealthCheck}
                  disabled={isLoading}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Run Health Check Now
                </Button>
                <p className="text-xs text-muted-foreground px-1">
                  Triggers an immediate health check and auto-remediation if issues are found.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="remediation">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              {remediationLogs && remediationLogs.length > 0 ? (
                <div className="space-y-3">
                  {remediationLogs.map((log) => {
                    const isSuccess = log.line.includes("SUCCESS");
                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "rounded-lg border p-3",
                          isSuccess
                            ? "border-green-500/20 bg-green-500/5"
                            : "border-red-500/20 bg-red-500/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isSuccess ? (
                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {log.service || "system"}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium">{log.line}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {new Date(log.ts).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Wrench className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm">No auto-remediation events yet</p>
                  <p className="text-xs mt-1">
                    The health monitor will automatically fix issues as they occur
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              {serviceLogs && serviceLogs.length > 0 ? (
                <div className="space-y-2 font-mono text-xs">
                  {serviceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-muted-foreground whitespace-nowrap">
                        {new Date(log.ts).toLocaleTimeString()}
                      </span>
                      <Badge
                        variant={
                          log.level === "error"
                            ? "destructive"
                            : log.level === "warn"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs shrink-0"
                      >
                        {log.level}
                      </Badge>
                      {log.service && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {log.service}
                        </Badge>
                      )}
                      <span className="flex-1">{log.line}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mb-2 opacity-20" />
                  <p className="text-sm">No service logs available</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
