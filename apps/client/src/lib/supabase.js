import { createClient } from "@supabase/supabase-js";

import { clientEnv } from "./env.js";

export const supabase = createClient(clientEnv.supabaseUrl, clientEnv.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

