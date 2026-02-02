"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function addVpnUser(
  serverId: string,
  username: string,
  note?: string
) {
  const supabase = await createClient();

  // Create the VPN user record
  const { data: user, error: userError } = await supabase
    .from("vpn_users")
    .insert({
      server_id: serverId,
      username,
      note: note || null,
    })
    .select()
    .single();

  if (userError) {
    return { error: userError.message };
  }

  // Queue a command for the agent to actually create the user on MoaV
  const { error: cmdError } = await supabase.from("commands").insert({
    server_id: serverId,
    type: "user:add",
    payload: { username, vpn_user_id: user.id } as Json,
  });

  if (cmdError) {
    return { error: cmdError.message };
  }

  revalidatePath(`/servers/${serverId}/users`);
  return { data: user };
}

export async function revokeVpnUser(serverId: string, vpnUserId: string) {
  const supabase = await createClient();

  // Get the user to know the username
  const { data: user } = await supabase
    .from("vpn_users")
    .select("username")
    .eq("id", vpnUserId)
    .single();

  if (!user) {
    return { error: "User not found" };
  }

  // Mark as revoked
  const { error: updateError } = await supabase
    .from("vpn_users")
    .update({ status: "revoked" })
    .eq("id", vpnUserId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Queue revocation command
  const { error: cmdError } = await supabase.from("commands").insert({
    server_id: serverId,
    type: "user:revoke",
    payload: { username: user.username, vpn_user_id: vpnUserId } as Json,
  });

  if (cmdError) {
    return { error: cmdError.message };
  }

  revalidatePath(`/servers/${serverId}/users`);
  return { success: true };
}
