# Steps 1–2 — Build notes, decisions & flags

Status: **Step 1 (project setup + CI) and Step 2 (schema + RLS + migrations) complete
and tested.** All 12 RLS/guardrail checks pass against PostgreSQL 16.

Working from:

- **Doc 12** — build order (Step 1 → Doc 11; Step 2 → Doc 03, 09).
- **Doc 11** — repo/CI skeleton.
- **Doc 03** — database schema.
- **Doc 09** — RLS and security rules.
- **Doc 07** — triage guardrails baked into the schema (`triage_level` CHECK).

---

## A. Decisions I made (review these — they change Doc 03's tables)

These are additive or clarifying changes to the placeholder schema. Each is easy to
revert if you'd prefer the literal spec.

1. **Enums as `text` + `CHECK`, not Postgres `enum` types.** Doc 03 §1.1 allows either.
   CHECK constraints are far easier to evolve (adding a species or tier is a one-line
   migration; altering a Postgres enum is painful). Affects `species`, `sex`, `tier`,
   `status`, `triage_level`, `kind`, etc.

2. **Circular FK broken deliberately.** `pets.avatar_media_id → pet_media.id` and
   `pet_media.pet_id → pets.id` form a cycle. `pets` is created without the avatar FK,
   `pet_media` is created next, then the FK is added (`ON DELETE SET NULL`). Without
   this, the tables can't be created in either order.

3. **`subscriptions` gained two columns:** `unique(user_id)` (PRD says one plan per
   user) and `scans_period_start timestamptz` (Doc 03 calls `scans_used` a "rolling
   monthly counter" but gives no reset anchor — Step 6/7's scan-limit logic needs to
   know when the window started).

4. **`ai_assessments` gained `factors jsonb`.** Doc 03's column list omits it, but the
   AI output contract (Doc 07 §6.1, Doc 12 §7) returns `factors`, and Doc 03 §10 asks
   for a GIN index on a `factors` column. Added so the contract output is persisted.

5. **`ai_assessments` gained `unique(scan_id)`.** Doc 03 §8 says "each scan has one
   ai_assessment" — enforced.

6. **CHECK ranges added:** `health_scores.score` ∈ [0,100] (Doc 04 returns scores like
   78); `scans_used >= 0`; weights `> 0`.

7. **`reminders.status` value set defined** as `pending | sent | completed | cancelled`.
   Doc 03 only names `pending` (used by the partial index). Adjust the set if you have
   a different lifecycle in mind.

8. **`consents` uses `unique(user_id, consent_type)`** = "current state per consent
   type". If you need a full grant/revoke **history** (audit trail over time), drop the
   unique and treat it as append-only. Flag — this is a compliance design choice.

9. **Soft-delete (`deleted_at`) added to `pets`, `health_records`, `ai_reports`** only —
   the artifacts where retention/anonymisation is implied (Doc 03 §1.1, §8.1). Other
   tables hard-delete via `ON DELETE CASCADE`. Tell me if more tables need soft delete.

10. **`audit_logs` is append-only** — it has `created_at` but no `updated_at`/trigger
    (the convention in §1.1 doesn't fit an immutable audit trail).

11. **RLS privilege model (defense in depth, Doc 09 §2).** Supabase grants broad table
    privileges to `anon`/`authenticated` by default and relies on RLS alone. We
    additionally **revoke** those and grant back only what each table needs:
    - Owner CRUD: `pets`, all Twin history tables, `reminders`, `health_records`,
      `consents`, `profiles` (no delete).
    - **Owner read-only** (system writes via service role): `ai_assessments`,
      `health_scores`, `ai_reports`, `subscriptions`. This enforces "AI/billing output
      is system-generated, not user-editable."
    - `scans`: owner read + insert (status transitions are server-side).
    - **Locked to service role**: `audit_logs`, `feature_flags` (RLS on, no client grant).
    - Policies are scoped `TO authenticated`, so `anon` is denied by default.
    - Reconciled Doc 03 §9.1 (split select/modify) with Doc 09 §4 (single `FOR ALL`):
      used the single `FOR ALL` form since both conditions are identical.

---

## B. Flags / ambiguities to confirm (placeholders in Docs 03 & 04)

- **No "red"/emergency triage level.** Docs 07/12 define exactly three levels and
  `orange` = "urgent attention" is the max. I enforced exactly `green|yellow|orange`.
  Confirm there is intentionally no emergency tier above orange.
- **British spelling in table/column names** (`pet_behaviour_logs`, `behaviour_type`).
  Kept to match the spec. Say the word if you want US spelling (`behavior`).
- **`user_id` FK target.** Doc 03 §1.1 says tenant tables reference `auth.users`, but the
  table listings say `→ profiles.id`. Since `profiles.id` *is* the `auth.users.id`,
  these are equivalent; I referenced `profiles(id)` (with `profiles.id → auth.users.id`)
  so a profile row must exist. RLS still keys on `auth.uid()`.
- **Endpoint paths (Doc 04).** Not used yet in Steps 1–2, but noting for Step 3+: the
  spec mixes PostgREST (`/rest/v1/*`) and Edge Functions (`/functions/v1/process_scan`,
  `recompute_score`, `generate_report`). The schema is built to support exactly these.
  Flag any path/name you want changed before I wire them up.
- **Three "health_*" tables** (`pet_health_events`, `health_records`, `health_scores`)
  are distinct concepts but similarly named — easy to confuse. Kept the spec names.

---

## C. Deferred to later steps (intentionally NOT in Steps 1–2)

- Storage buckets + signed-URL policies → Step 5 (Doc 02/09).
- `process_scan`, `recompute_score`, `generate_report` Edge Functions, OpenAI calls,
  and AI rate limiting → Steps 6–10 (Doc 07).
- Auth screens / profile bootstrap trigger (`handle_new_user`) → Step 3 (Doc 04/09).
- The `_auth_shim.sql` is **test-only**; never apply it to a real Supabase project.

---

## D. Migration reversibility

Each migration is self-contained and additive. Supabase CLI migrations are applied
forward; to roll a change back, add a new migration (the standard Supabase workflow).
The CI `database` job proves every migration applies cleanly on a fresh DB on each PR.
