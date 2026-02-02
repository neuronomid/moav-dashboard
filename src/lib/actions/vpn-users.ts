"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function addVpnUser(
  serverId: string,
  username: string,
  note?: string,
  dataLimit?: number,
  expiry?: string
) {
  const supabase = await createClient();

  // Create the VPN user record
  const { data: user, error: userError } = await supabase
    .from("vpn_users")
    .insert({
      server_id: serverId,
      username,
      note: note || null,
      data_limit_gb: dataLimit || null,
      expires_at: expiry || null,
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

export async function updateVpnUser(
  serverId: string,
  vpnUserId: string,
  updates: {
    username?: string;
    note?: string;
    data_limit_gb?: number | null;
    expires_at?: string | null;
    access_policy?: Record<string, boolean>;
  }
) {
  const supabase = await createClient();

  // 1. Update the database directly for immediate feedback
  const { error: updateError } = await supabase
    .from("vpn_users")
    .update({
      username: updates.username,
      note: updates.note,
      data_limit_gb: updates.data_limit_gb,
      expires_at: updates.expires_at,
      access_policy: updates.access_policy,
    })
    .eq("id", vpnUserId)
    .eq("server_id", serverId); // Safety check

  if (updateError) {
    return { error: updateError.message };
  }

  // 2. Queue command for agent (to apply config changes on the VPS)
  const { error: cmdError } = await supabase.from("commands").insert({
    server_id: serverId,
    type: "user:update",
    payload: { vpn_user_id: vpnUserId, ...updates } as Json,
  });

  if (cmdError) {
    return { error: cmdError.message };
  }

  revalidatePath(`/servers/${serverId}/users`);
  return { success: true };
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

  // Queue revocation command first
  const { error: cmdError } = await supabase.from("commands").insert({
    server_id: serverId,
    type: "user:revoke",
    payload: { username: user.username, vpn_user_id: vpnUserId } as Json,
  });

  if (cmdError) {
    return { error: cmdError.message };
  }

  // Delete the user record
  const { error: deleteError } = await supabase
    .from("vpn_users")
    .delete()
    .eq("id", vpnUserId);

  if (deleteError) {
    // If delete fails, we might want to log it or warn, but the command is already queued.
    // Ideally we should transaction this, but for now we return the error.
    return { error: deleteError.message };
  }



  revalidatePath(`/servers/${serverId}/users`);
  return { success: true };
}
