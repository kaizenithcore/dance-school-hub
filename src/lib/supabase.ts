import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.error(
    "[Nexa] Supabase no está configurado.\n" +
    "Crea un fichero src/.env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.\n" +
    "Consulta el README o CLAUDE.md para más detalles."
  );
}

// In production without config, fail loudly rather than silently using fake credentials.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "https://unconfigured.supabase.co",
  supabaseAnonKey ?? "unconfigured",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
