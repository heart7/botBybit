/**
 * Client configuration. Only PUBLIC values live here.
 *
 * Expo inlines variables prefixed with EXPO_PUBLIC_ at build time. The anon key and
 * project URL are safe to ship; the service-role key and OpenAI key are NEVER read
 * here — they belong to server-side Edge Functions only (guardrail: Doc 09 §3, §5).
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and set EXPO_PUBLIC_* values.`,
    );
  }
  return value;
}

export const config = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;
