import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { JobList } from "@/components/jobs/job-list";
import type { Command, Server } from "@/lib/types/database";

export default async function JobsPage() {
  const supabase = await createClient();

  const [{ data: commandsRaw }, { data: servers }] = await Promise.all([
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

  // Transform database columns to match Command type
  const commands: Command[] = (commandsRaw ?? []).map((cmd: any) => ({
    id: cmd.id,
    server_id: cmd.server_id,
    type: cmd.type,
    payload_json: cmd.payload_json ?? cmd.payload ?? null,
    status: cmd.status,
    result_json: cmd.result_json ?? cmd.result ?? null,
    created_at: cmd.created_at,
    started_at: cmd.started_at,
    completed_at: cmd.completed_at,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Command queue — commands are executed by agents on each server"
      />
      <JobList
        initialCommands={commands}
        serverNames={serverNames}
      />
    </div>
  );
}
