"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addServer(formData: FormData) {
  const name = formData.get("name") as string;
  const ip = formData.get("host") as string; // form field still called "host" for UX

  if (!name || !ip) {
    return { error: "Name and IP/host are required" };
  }

  const agentToken = randomBytes(32).toString("hex");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("servers")
    .insert({ name, ip, agent_token: agentToken })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateServer(
  serverId: string,
  data: { name?: string; ip?: string }
) {
  const supabase = await createClient();

  const updateData: Record<string, string> = {};
  if (data.name) updateData.name = data.name;
  if (data.ip) updateData.ip = data.ip;

  if (Object.keys(updateData).length === 0) {
    return { error: "No data to update" };
  }

  const { data: server, error } = await supabase
    .from("servers")
    .update(updateData)
    .eq("id", serverId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/servers/${serverId}`);
  revalidatePath("/dashboard");
  return { data: server };
}

export async function deleteServer(serverId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("servers")
    .delete()
    .eq("id", serverId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
