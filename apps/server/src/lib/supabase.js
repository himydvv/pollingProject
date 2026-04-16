import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env.js";

const baseOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
};

export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  baseOptions
);

const supabaseAuthClient = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  baseOptions
);

export async function getUserFromAccessToken(accessToken) {
  const { data, error } = await supabaseAuthClient.auth.getUser(accessToken);

  if (error) {
    throw error;
  }

  return data.user;
}

