"use client";

import { useRealtimeCommands } from "@/hooks/use-realtime-commands";
import { JobStatusBadge } from "./job-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Command } from "@/lib/types/database";
import { timeAgo } from "@/lib/utils";

interface JobListProps {
  initialCommands: Command[];
  serverNames: Record<string, string>;
}

export function JobList({ initialCommands, serverNames }: JobListProps) {
  const commands = useRealtimeCommands(initialCommands);

  if (commands.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No commands have been executed yet.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Server</TableHead>
          <TableHead>Command</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {commands.map((cmd) => (
          <TableRow key={cmd.id}>
            <TableCell className="font-medium">
              {serverNames[cmd.server_id] ?? cmd.server_id.slice(0, 8)}
            </TableCell>
            <TableCell>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {cmd.type}
              </code>
            </TableCell>
            <TableCell>
              <JobStatusBadge status={cmd.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {timeAgo(cmd.created_at)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {cmd.completed_at ? timeAgo(cmd.completed_at) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
