export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            commands: {
                Row: {
                    completed_at: string | null
                    created_at: string
                    error: string | null
                    id: string
                    payload: Json | null
                    result: Json | null
                    server_id: string
                    started_at: string | null
                    status: string
                    type: string
                }
                Insert: {
                    completed_at?: string | null
                    created_at?: string
                    error?: string | null
                    id?: string
                    payload?: Json | null
                    result?: Json | null
                    server_id: string
                    started_at?: string | null
                    status?: string
                    type: string
                }
                Update: {
                    completed_at?: string | null
                    created_at?: string
                    error?: string | null
                    id?: string
                    payload?: Json | null
                    result?: Json | null
                    server_id?: string
                    started_at?: string | null
                    status?: string
                    type?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "commands_server_id_fkey"
                        columns: ["server_id"]
                        isOneToOne: false
                        referencedRelation: "servers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            log_events: {
                Row: {
                    id: string
                    level: string | null
                    line: string
                    server_id: string
                    service: string
                    ts: string
                }
                Insert: {
                    id?: string
                    level?: string | null
                    line: string
                    server_id: string
                    service: string
                    ts?: string
                }
                Update: {
                    id?: string
                    level?: string | null
                    line?: string
                    server_id?: string
                    service?: string
                    ts?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "log_events_server_id_fkey"
                        columns: ["server_id"]
                        isOneToOne: false
                        referencedRelation: "servers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            servers: {
                Row: {
                    agent_token: string
                    created_at: string
                    id: string
                    ip: string
                    last_seen_at: string | null
                    moav_version: string | null
                    name: string
                    status_json: Json | null
                    updated_at: string
                }
                Insert: {
                    agent_token: string
                    created_at?: string
                    id?: string
                    ip: string
                    last_seen_at?: string | null
                    moav_version?: string | null
                    name: string
                    status_json?: Json | null
                    updated_at?: string
                }
                Update: {
                    agent_token?: string
                    created_at?: string
                    id?: string
                    ip?: string
                    last_seen_at?: string | null
                    moav_version?: string | null
                    name?: string
                    status_json?: Json | null
                    updated_at?: string
                }
                Relationships: []
            }
            vpn_user_access_effective: {
                Row: {
                    enabled_services_json: Json | null
                    id: string
                    server_id: string
                    updated_at: string
                    username: string
                }
                Insert: {
                    enabled_services_json?: Json | null
                    id?: string
                    server_id: string
                    updated_at?: string
                    username: string
                }
                Update: {
                    enabled_services_json?: Json | null
                    id?: string
                    server_id?: string
                    updated_at?: string
                    username?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "vpn_user_access_effective_server_id_fkey"
                        columns: ["server_id"]
                        isOneToOne: false
                        referencedRelation: "servers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            vpn_users: {
                Row: {
                    access_policy: Json | null
                    created_at: string
                    id: string
                    note: string | null
                    server_id: string
                    status: string
                    updated_at: string
                    username: string
                }
                Insert: {
                    access_policy?: Json | null
                    created_at?: string
                    id?: string
                    note?: string | null
                    server_id: string
                    status?: string
                    updated_at?: string
                    username: string
                }
                Update: {
                    access_policy?: Json | null
                    created_at?: string
                    id?: string
                    note?: string | null
                    server_id?: string
                    status?: string
                    updated_at?: string
                    username?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "vpn_users_server_id_fkey"
                        columns: ["server_id"]
                        isOneToOne: false
                        referencedRelation: "servers"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Convenience type aliases for table rows
export type Tables<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
    Database["public"]["Tables"][T]["Update"]
