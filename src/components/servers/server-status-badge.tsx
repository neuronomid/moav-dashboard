import { Badge } from "@/components/ui/badge";
import { isServerOnline, timeAgo } from "@/lib/utils";

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
      {online ? "Online" : `Last seen ${timeAgo(lastSeenAt)}`}
    </Badge>
  );
}
