"use client";

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
import { UserX } from "lucide-react";
import { toast } from "sonner";
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

export function UserList({ users, serverId }: UserListProps) {
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
          <TableHead>Note</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-mono font-medium">
              {user.username}
            </TableCell>
            <TableCell>
              <StatusBadge status={user.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {user.note || "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(user.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              {user.status !== "revoked" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRevoke(user.id, user.username)}
                >
                  <UserX className="mr-1 h-3 w-3" />
                  Revoke
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
