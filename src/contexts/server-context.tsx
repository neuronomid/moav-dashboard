"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Server } from "@/lib/types/database";

interface ServerContextValue {
    server: Server;
    isLoading: boolean;
}

const ServerContext = createContext<ServerContextValue | null>(null);

export function useServer() {
    const context = useContext(ServerContext);
    if (!context) {
        throw new Error("useServer must be used within a ServerProvider");
    }
    return context;
}

interface ServerProviderProps {
    initialServer: Server;
    children: ReactNode;
}

export function ServerProvider({ initialServer, children }: ServerProviderProps) {
    const [server, setServer] = useState<Server>(initialServer);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Update local state if initialServer changes (e.g., from router refresh)
        setServer(initialServer);
    }, [initialServer]);

    useEffect(() => {
        const supabase = createClient();

        // Subscribe to real-time updates for this server
        const channel = supabase
            .channel(`server-realtime-${initialServer.id}`)
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

    return (
        <ServerContext.Provider value={{ server, isLoading }}>
            {children}
        </ServerContext.Provider>
    );
}
