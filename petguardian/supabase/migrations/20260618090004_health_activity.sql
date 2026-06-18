-- 20260618090004_health_activity.sql
-- Step 2 — Health Activity (Doc 03 §5).
-- scans -> ai_assessments (triage output) -> health_scores (trend series).

-- 5.1 scans ----------------------------------------------------------------
-- One AI scan submission. Bundles owner inputs (photo and/or symptom payload).
-- user_id is denormalised (Doc 03 §5.1) so RLS does not have to join through pets.
create table if not exists public.scans (
  id              uuid primary key default gen_random_uuid(),
  pet_id          uuid not null references public.pets (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  input_media_id  uuid references public.pet_media (id) on delete set null,
  symptom_payload jsonb,
  status          text not null default 'pending'
                    check (status in ('pending', 'complete', 'failed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger scans_set_updated_at
  before update on public.scans
  for each row execute function public.set_updated_at();

-- 5.2 ai_assessments -------------------------------------------------------
-- AI triage output. ALWAYS guidance, never diagnosis (Doc 07 §2, PRD §8).
-- triage_level is constrained to exactly the three product levels — there is no
-- "red"/emergency tier by design (Doc 07 §3); orange is the highest.
-- DECISION: 'factors' is added here (not in Doc 03's column list) because the AI
--   output contract (Doc 07 §6.1 / Doc 12 §7) returns factors, and Doc 03 §10 asks
--   for a GIN index on a "factors" jsonb column. See STEP-01-02-NOTES.md.
create table if not exists public.ai_assessments (
  id           uuid primary key default gen_random_uuid(),
  scan_id      uuid not null references public.scans (id) on delete cascade,
  pet_id       uuid not null references public.pets (id) on delete cascade,
  triage_level text not null check (triage_level in ('green', 'yellow', 'orange')),
  summary      text not null,                          -- owner-facing guidance text
  factors      jsonb not null default '[]'::jsonb,     -- [ADDED] contract output
  model_meta   jsonb,                                  -- model version, tokens, latency
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (scan_id)                                     -- one assessment per scan (Doc 03 §8)
);

create trigger ai_assessments_set_updated_at
  before update on public.ai_assessments
  for each row execute function public.set_updated_at();

-- 5.3 health_scores --------------------------------------------------------
-- Time series of computed scores per pet (0–100). Recomputed after each scan.
create table if not exists public.health_scores (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references public.pets (id) on delete cascade,
  score       int not null check (score between 0 and 100),
  factors     jsonb,
  computed_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger health_scores_set_updated_at
  before update on public.health_scores
  for each row execute function public.set_updated_at();
