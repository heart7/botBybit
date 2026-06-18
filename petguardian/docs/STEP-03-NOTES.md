# Step 3 — Auth & user profiles — build notes, decisions & flags

Status: **complete and tested.** Typecheck OK · 9 unit tests pass · 15 DB checks pass
(3 auth-trigger + 12 RLS).

Working from: **Doc 04** (auth endpoints, error shape, rate limiting/validation),
**Doc 09** (JWT sessions, input validation, auth rate limits, consent), and **Doc 05
§4.1/§4.7** (onboarding/auth and account screens).

## What was built

- **DB:** `handle_new_user()` trigger (migration `0009`) — on `auth.users` insert it
  creates the `profiles` row (from signup metadata) and a free-tier `active`
  `subscriptions` row. `SECURITY DEFINER` with a pinned `search_path`.
- **App auth layer:** `AuthProvider` (session via `onAuthStateChange`), validated
  `signUp`/`signIn`/`signOut`, friendly error mapping to Doc 04's `{code,message}`.
- **Screens:** `AuthScreen` (sign in / sign up with inline validation) and
  `AccountScreen` (edit profile, plan + scan usage, Layer 3 consent toggle, data
  deletion request, sign out).
- **Data access:** `profile.ts`, `subscription.ts` (read-only), `consent.ts` (upsert).
- **Config:** `[auth]` settings + `[auth.rate_limit]` in `config.toml` (Doc 09 §6).
- **Tests:** jest + ts-jest for pure logic (`validation.test.ts`); `auth_trigger_test.sql`
  for the bootstrap trigger; CI now runs typecheck + unit tests + the DB suite.

## Decisions (review these)

1. **Navigation deferred.** Routing is `session ? AccountScreen : AuthScreen`. The
   tab bar (Home/Pets/Scan/Records/Account, Doc 05 §3) and a nav library arrive in
   Step 4 when there are multiple authenticated screens. App.tsx will be refactored then.
2. **Email confirmations OFF in local `config.toml`** for dev. **Must be enabled in
   staging/production** — flagged here so it isn't forgotten.
3. **Password policy** (client-side): ≥8 chars, must include a letter and a number,
   ≤72 (bcrypt). Supabase's default server minimum is 6; set a matching server-side
   policy in the hosted project for defense in depth.
4. **`[auth.rate_limit]`** keys require a reasonably recent Supabase CLI. If `supabase
   start` rejects them, upgrade the CLI or trim that block.
5. **Profile is created at signup, pre-confirmation.** Supabase inserts `auth.users`
   immediately, so the trigger runs even when email confirmation is pending. That's
   intended — the profile exists by first sign-in.

## Flags / deferred (need a later step or your input)

- **Account deletion is a UI placeholder.** Real GDPR deletion (cascade/anonymise,
  Doc 09 §8) must run server-side via an Edge Function — deferred. Confirm whether you
  want hard-delete vs. anonymise as the default.
- **Audit logging of auth/profile actions** is intentionally NOT done client-side —
  `audit_logs` is service-role-only by design (Step 2). It will be written from
  Edge Functions (Doc 09 §7).
- **Tier scan limits**: still only `free = 3` is specified; other tiers are `null`
  (uncapped/TBD) in `subscription.ts`. Same open question as Step 2.
- **Test harness coupling:** `rls_test.sql` now relies on the trigger (inserting
  `auth.users` auto-creates profiles/subscriptions), so it no longer inserts those
  manually.
