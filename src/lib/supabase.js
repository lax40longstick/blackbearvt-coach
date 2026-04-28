import { getPublicConfig, missingConfigKeys } from "./config.js";

let supabaseClient = null;
let supabaseInitError = null;

export async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (supabaseInitError) throw supabaseInitError;

  const missing = missingConfigKeys();
  if (missing.length > 0) {
    supabaseInitError = new Error(`Missing config: ${missing.join(", ")}`);
    throw supabaseInitError;
  }

  const cfg = getPublicConfig();

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabaseClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabaseClient;
  } catch (error) {
    supabaseInitError = error;
    throw error;
  }
}

export function getSupabaseStatus() {
  const missing = missingConfigKeys();
  if (missing.length > 0) {
    return {
      ready: false,
      message: `Missing config: ${missing.join(", ")}`,
    };
  }

  return {
    ready: true,
    message: "Supabase config present",
  };
}
