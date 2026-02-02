import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ServerSettingsForm } from "@/components/servers/server-settings-form";
import type { Server } from "@/lib/types/database";

export default async function ServerSettingsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: server } = await supabase
        .from("servers")
        .select("*")
        .eq("id", id)
        .single();

    if (!server) notFound();

    const s = server as Server;

    return <ServerSettingsForm server={s} />;
}
