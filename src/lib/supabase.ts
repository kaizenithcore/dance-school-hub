import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

declare global {
  var __dancehubSupabaseClient: SupabaseClient | undefined;
}

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

const createSupabaseClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

export const supabase: SupabaseClient =
  globalThis.__dancehubSupabaseClient ?? createSupabaseClient();

if (!globalThis.__dancehubSupabaseClient) {
  globalThis.__dancehubSupabaseClient = supabase;
}
