import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. NEVER import this into anything that ships to the
// browser — it bypasses Row Level Security entirely. Only use it in
// server-only route handlers that authenticate callers themselves (e.g.
// ingest-snapshot, which checks the x-ingest-secret header instead of a
// logged-in Supabase session).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
