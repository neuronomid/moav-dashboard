import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { JobList } from "@/components/jobs/job-list";
import type { Command, Server } from "@/lib/types/database";

export default async function JobsPage() {
  const supabase = await createClient();

  const [{ data: commands }, { data: servers }] = await Promise.all([
    supabase
      .from("commands")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("servers").select("id, name"),
  ]);

  const serverNames: Record<string, string> = {};
  ((servers as Pick<Server, "id" | "name">[]) ?? []).forEach((s) => {
    serverNames[s.id] = s.name;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Command queue — commands are executed by agents on each server"
      />
      <JobList
        initialCommands={(commands as Command[]) ?? []}
        serverNames={serverNames}
      />
    </div>
  );
}
