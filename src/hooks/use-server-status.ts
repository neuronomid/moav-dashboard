"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Server } from "@/lib/types/database";

export function useServerStatus(initialServer: Server) {
  const [server, setServer] = useState(initialServer);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`server-${initialServer.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "servers",
          filter: `id=eq.${initialServer.id}`,
        },
        (payload) => {
          setServer((prev) => ({ ...prev, ...payload.new } as Server));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialServer.id]);

  return server;
}
