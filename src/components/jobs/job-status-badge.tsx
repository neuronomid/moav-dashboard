import { Badge } from "@/components/ui/badge";
import type { CommandStatus } from "@/lib/types/database";
import { Loader2 } from "lucide-react";

export function JobStatusBadge({ status }: { status: CommandStatus }) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "running":
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case "completed":
      return <Badge className="bg-green-600 hover:bg-green-600">Completed</Badge>;
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
