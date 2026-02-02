"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Command } from "@/lib/types/database";

export function useRealtimeCommands(initialCommands: Command[]) {
  const [commands, setCommands] = useState(initialCommands);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("commands-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "commands",
        },
        (payload) => {
          setCommands((prev) => [payload.new as Command, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "commands",
        },
        (payload) => {
          setCommands((prev) =>
            prev.map((cmd) =>
              cmd.id === (payload.new as Command).id
                ? (payload.new as Command)
                : cmd
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return commands;
}
