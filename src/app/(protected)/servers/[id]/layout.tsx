import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ServerStatusBadge } from "@/components/servers/server-status-badge";
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <PageHeader
          title={s.name}
          description={`${s.host}${s.moav_version ? ` — MoaV v${s.moav_version}` : ""}`}
        />
        <ServerStatusBadge lastSeenAt={s.last_seen_at} />
      </div>

      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active]:border-primary data-[active]:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
