"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addServer(formData: FormData) {
  const name = formData.get("name") as string;
  const host = formData.get("host") as string;

  if (!name || !host) {
    return { error: "Name and host are required" };
  }

  const agentToken = randomBytes(32).toString("hex");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("servers")
    .insert({ name, host, agent_token: agentToken })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { data };
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
