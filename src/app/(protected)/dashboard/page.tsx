import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ServerCard } from "@/components/servers/server-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Server } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: servers } = await supabase
    .from("servers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servers"
        description="Manage your MoaV VPS installs"
        action={
          <Button asChild>
            <Link href="/servers/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Server
            </Link>
          </Button>
        }
      />

      {!servers || servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No servers yet. Add your first VPS to get started.
          </p>
          <Button asChild className="mt-4">
            <Link href="/servers/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Server
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(servers as Server[]).map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}
