import { createClient } from "@supabase/supabase-js";

/** Service-role client that bypasses RLS. Use only in API routes / server actions. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
