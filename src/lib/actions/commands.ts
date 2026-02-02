"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMMAND_TYPE_SET, type CommandType } from "@/lib/constants";
import type { Json } from "@/types/supabase";

export async function createCommand(
  serverId: string,
  type: CommandType,
  payload: Record<string, unknown> = {}
) {
  if (!COMMAND_TYPE_SET.has(type)) {
    return { error: `Invalid command type: ${type}` };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("commands")
    .insert({
      server_id: serverId,
      type,
      payload: payload as Json,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/servers/${serverId}`);
  revalidatePath("/jobs");
  return { data };
}
