function readRequiredEnv(name) {
  const value = import.meta.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required client environment variable: ${name}`);
  }

  return value.trim();
}

export const clientEnv = Object.freeze({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:3001/api",
  supabaseUrl: readRequiredEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: readRequiredEnv("VITE_SUPABASE_ANON_KEY")
});
