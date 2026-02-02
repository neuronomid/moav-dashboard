"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { revokeVpnUser } from "@/lib/actions/vpn-users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserX } from "lucide-react";
import { toast } from "sonner";
import { UserConfigDialog } from "./user-config-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import type { VpnUser } from "@/lib/types/database";

interface UserListProps {
  users: VpnUser[];
  serverId: string;
}

function StatusBadge({ status }: { status: VpnUser["status"] }) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>;
    case "revoked":
      return <Badge variant="destructive">Revoked</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
  }
}

function ExpiryBadge({ date }: { date: string | null }) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (date) {
      setFormattedDate(new Date(date).toLocaleDateString());
    } else {
      setFormattedDate(null);
    }
  }, [date]);

  if (!date) {
    return <span className="text-muted-foreground">—</span>;
  }

  // Before hydration/on server, render a placeholder or the raw ISO date if needed to avoid mismatch
  // Or render nothing/skeleton. Here we'll render a skeleton-like span to minimize layout shift
  if (!formattedDate) {
    return <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-transparent text-transparent">Loading...</span>;
  }

  const now = new Date();
  const expiry = new Date(date);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let colorClass = "bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100";

  if (diffTime < 0) {
    colorClass = "bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100";
  } else if (diffDays <= 7) {
    colorClass = "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-100";
  }

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {formattedDate}
    </span>
  );
}

function VolumeCell({ user }: { user: VpnUser }) {
  if (!user.data_limit_gb) {
    return <span className="text-muted-foreground">—</span>;
  }

  // TODO: Replace with real usage data when available
  const usedGb = 0;
  const totalGb = user.data_limit_gb;
  const remainingGb = totalGb - usedGb;
  const percentageUsed = (usedGb / totalGb) * 100;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-[120px] cursor-help">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-muted-foreground">
                {usedGb} / {totalGb} GB
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-blue-600 dark:bg-blue-500"
                style={{ width: `${Math.min(percentageUsed, 100)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Usage: {usedGb} GB</p>
          <p>Limit: {totalGb} GB</p>
          <p>Remaining: {remainingGb.toFixed(1)} GB</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DateDisplay({ date }: { date: string }) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    setFormatted(new Date(date).toLocaleDateString());
  }, [date]);

  if (!formatted) return <span className="opacity-0">Loading...</span>;
  return <span>{formatted}</span>;
}

export function UserList({ users: initialUsers, serverId }: UserListProps) {
  const [users, setUsers] = useState(initialUsers);
  const supabase = createClient();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-users-${serverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vpn_users",
          filter: `server_id=eq.${serverId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setUsers((prev) => [payload.new as VpnUser, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === payload.new.id ? (payload.new as VpnUser) : u
              )
            );
          } else if (payload.eventType === "DELETE") {
            setUsers((prev) => prev.filter((u) => u.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, supabase]);

  async function handleRevoke(userId: string, username: string) {
    const result = await revokeVpnUser(serverId, userId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Revocation queued for "${username}"`);
    }
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No VPN users on this server yet.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Volume</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-mono font-medium">
              <div className="flex flex-col">
                <span>{user.username}</span>
                {user.note && (
                  <span className="text-xs text-muted-foreground">{user.note}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <StatusBadge status={user.status} />
            </TableCell>
            <TableCell>
              <VolumeCell user={user} />
            </TableCell>
            <TableCell>
              <ExpiryBadge date={user.expires_at} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              <DateDisplay date={user.created_at} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                {user.config_raw && (
                  <UserConfigDialog
                    username={user.username}
                    config={user.config_raw}
                  />
                )}
                <EditUserDialog user={user} serverId={serverId} />
                {user.status !== "revoked" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRevoke(user.id, user.username)}
                  >
                    <UserX className="mr-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
