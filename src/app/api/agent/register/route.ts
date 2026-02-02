import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent_token, agent_id } = body;

    if (!agent_token) {
      return NextResponse.json(
        { error: "agent_token is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Look up server by token
    const { data: server, error: findError } = await supabase
      .from("servers")
      .select("id, name, is_registered")
      .eq("agent_token", agent_token)
      .single();

    if (findError || !server) {
      return NextResponse.json(
        { error: "Invalid agent token" },
        { status: 401 }
      );
    }

    if (server.is_registered) {
      // Already registered — return the server info anyway (idempotent)
      return NextResponse.json({
        server_id: server.id,
        server_name: server.name,
        already_registered: true,
      });
    }

    // Mark as registered
    const { error: updateError } = await supabase
      .from("servers")
      .update({
        is_registered: true,
        agent_id: agent_id || null,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", server.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Registration failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      server_id: server.id,
      server_name: server.name,
      already_registered: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
