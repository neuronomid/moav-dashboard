import { createClient } from "@/lib/supabase/server";
import { UserList } from "@/components/users/user-list";
import { AddUserDialog } from "@/components/users/add-user-dialog";
import type { VpnUser } from "@/lib/types/database";

export default async function ServerUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("vpn_users")
    .select("*")
    .eq("server_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">VPN Users</h2>
        <AddUserDialog serverId={id} />
      </div>
      <UserList users={(users as VpnUser[]) ?? []} serverId={id} />
    </div>
  );
}
