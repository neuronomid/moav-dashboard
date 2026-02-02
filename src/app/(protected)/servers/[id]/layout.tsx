import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ServerStatusBadge } from "@/components/servers/server-status-badge";
import { ServerTabs } from "@/components/servers/server-tabs";
import { ServerProvider } from "@/contexts/server-context";
import type { Server } from "@/lib/types/database";

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: server } = await supabase
    .from("servers")
    .select("*")
    .eq("id", id)
    .single();

  if (!server) {
    notFound();
  }

  const s = server as Server;

  const tabs = [
    { label: "Overview", href: `/servers/${id}` },
    { label: "Services", href: `/servers/${id}/services` },
    { label: "Users", href: `/servers/${id}/users` },
    { label: "Settings", href: `/servers/${id}/settings` },
  ];

  return (
    <ServerProvider initialServer={s}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <PageHeader
            title={s.name}
            description={`${s.ip}${s.moav_version ? ` — MoaV v${s.moav_version}` : ""}`}
          />
          <ServerStatusBadge lastSeenAt={s.last_seen_at} />
        </div>

        <ServerTabs tabs={tabs} />

        {children}
      </div>
    </ServerProvider>
  );
}
