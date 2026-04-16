import "dotenv/config";

function readRequired(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function readPort(name, fallback) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${name} must be a valid port number.`);
  }

  return parsed;
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  port: readPort("PORT", 3001),
  clientUrl: process.env.CLIENT_URL?.trim() || "http://localhost:3000",
  redisUrl: readRequired("REDIS_URL"),
  supabaseUrl: readRequired("SUPABASE_URL"),
  supabaseAnonKey: readRequired("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readRequired("SUPABASE_SERVICE_ROLE_KEY")
});
