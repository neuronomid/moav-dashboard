// Database types for the agent - matches the Supabase schema
// These are simplified versions focused on what the agent needs

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
                    id: string
                    payload_json: Json | null
                    result_json: Json | null
                    server_id: string
                    started_at: string | null
                    status: string
                    type: string
                }
                Insert: {
                    completed_at?: string | null
                    created_at?: string
                    id?: string
                    payload_json?: Json | null
                    result_json?: Json | null
                    server_id: string
                    started_at?: string | null
                    status?: string
                    type: string
                }
                Update: {
                    completed_at?: string | null
                    created_at?: string
                    id?: string
                    payload_json?: Json | null
                    result_json?: Json | null
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
                    config_raw: Json | null
                    created_at: string
                    data_limit_gb: number | null
                    data_used_gb: number | null
                    expires_at: string | null
                    id: string
                    note: string | null
                    server_id: string
                    status: string
                    updated_at: string
                    username: string
                }
                Insert: {
                    access_policy?: Json | null
                    config_raw?: Json | null
                    created_at?: string
                    data_limit_gb?: number | null
                    data_used_gb?: number | null
                    expires_at?: string | null
                    id?: string
                    note?: string | null
                    server_id: string
                    status?: string
                    updated_at?: string
                    username: string
                }
                Update: {
                    access_policy?: Json | null
                    config_raw?: Json | null
                    created_at?: string
                    data_limit_gb?: number | null
                    data_used_gb?: number | null
                    expires_at?: string | null
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

// Command types that the agent can handle
export type CommandType =
    | "service:start"
    | "service:stop"
    | "service:restart"
    | "server:status"
    | "server:logs"
    | "server:export"
    | "server:test"
    | "user:add"
    | "user:revoke"
    | "user:update-access"

// Convenience type aliases
export type Command = Database["public"]["Tables"]["commands"]["Row"]
export type CommandInsert = Database["public"]["Tables"]["commands"]["Insert"]
export type CommandUpdate = Database["public"]["Tables"]["commands"]["Update"]

export type Server = Database["public"]["Tables"]["servers"]["Row"]
export type ServerUpdate = Database["public"]["Tables"]["servers"]["Update"]

export type LogEvent = Database["public"]["Tables"]["log_events"]["Row"]
export type LogEventInsert = Database["public"]["Tables"]["log_events"]["Insert"]

export type VpnUser = Database["public"]["Tables"]["vpn_users"]["Row"]
export type VpnUserAccessEffective = Database["public"]["Tables"]["vpn_user_access_effective"]["Row"]
