"use client";

import { Badge } from "@/components/ui/badge";
import { isServerOnline } from "@/lib/utils";
import { TimeAgo } from "@/components/ui/time-ago";

interface ServerStatusBadgeProps {
  lastSeenAt: string | null;
}

export function ServerStatusBadge({ lastSeenAt }: ServerStatusBadgeProps) {
  if (!lastSeenAt) {
    return <Badge variant="outline">Never seen</Badge>;
  }

  const online = isServerOnline(lastSeenAt);

  return (
    <Badge variant={online ? "default" : "secondary"}>
      {online ? "Online" : <>Last seen <TimeAgo date={lastSeenAt} /></>}
    </Badge>
  );
}
