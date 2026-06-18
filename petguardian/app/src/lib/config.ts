/**
 * Client configuration. Only PUBLIC values live here.
 *
 * Expo inlines variables prefixed with EXPO_PUBLIC_ at build time. The anon key and
 * project URL are safe to ship; the service-role key and OpenAI key are NEVER read
 * here — they belong to server-side Edge Functions only (guardrail: Doc 09 §3, §5).
 *
 * We do NOT throw on missing values at import time (that would white-screen the app);
 * instead `hasSupabaseConfig` lets the UI show a clear "configure your env" message.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const hasSupabaseConfig = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const config = {
  // Fallbacks keep createClient() from throwing at import; they are never used
  // because the UI gates on hasSupabaseConfig before making any request.
  supabaseUrl: supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey: supabaseAnonKey || 'anon-placeholder',
} as const;
