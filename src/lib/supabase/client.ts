import { createBrowserClient } from "@supabase/ssr";

// Used in Client Components. Relies on the anon key + RLS, so it only ever
// sees data belonging to the logged-in bygherre.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
