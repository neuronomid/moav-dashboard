import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent_token, status_json } = body;

    if (!agent_token) {
      return NextResponse.json(
        { error: "agent_token is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("servers")
      .update({
        last_seen_at: new Date().toISOString(),
        ...(status_json ? { status_json } : {}),
      })
      .eq("agent_token", agent_token)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Invalid agent token" },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
