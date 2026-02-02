import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

/** Service-role client that bypasses RLS. Use only in API routes / server actions. */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
