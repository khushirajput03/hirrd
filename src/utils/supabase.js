import { createClient } from "@supabase/supabase-js";

// Vite requires env vars to be prefixed with VITE_
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Supabase URL and Key must be defined in .env");
}

// Memoize clients by mode (anon/auth) to avoid multiple GoTrue warnings
const clients = new Map();

/**
 * Get a Supabase client instance.
 * - If no token → anon client
 * - If token → authenticated client with Bearer header
 */
export const getSupabaseClient = (supabaseAccessToken) => {
  const mode = supabaseAccessToken ? "auth" : "anon";

  // ✅ Reuse client if already created
  if (clients.has(mode)) return clients.get(mode);

  // ✅ Create client
  const client = createClient(supabaseUrl, supabaseKey, {
    global: supabaseAccessToken
      ? { headers: { Authorization: `Bearer ${supabaseAccessToken}` } }
      : undefined,
    auth: {
      storageKey: `sb_${mode}`,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // ✅ Cache client
  clients.set(mode, client);

  return client;
};
