-- 20260618090005_records_and_scheduling.sql
-- Step 2 — Records & Scheduling (Doc 03 §6).

-- reminders ----------------------------------------------------------------
-- DECISION: Doc 03 only names the 'pending' status (used by the partial index).
--   The full lifecycle is defined here; adjust the CHECK set if the product needs
--   different states. See STEP-01-02-NOTES.md.
create table if not exists public.reminders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  pet_id     uuid not null references public.pets (id) on delete cascade,
  kind       text not null check (kind in ('medication', 'vaccination')),
  due_at     timestamptz not null,
  status     text not null default 'pending'
               check (status in ('pending', 'sent', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- health_records -----------------------------------------------------------
-- Stored digital health documents (path in a private Storage bucket).
create table if not exists public.health_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  pet_id        uuid not null references public.pets (id) on delete cascade,
  title         text not null,
  document_path text not null,
  record_date   date,
  deleted_at    timestamptz,                           -- [ADDED] soft delete for retention
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger health_records_set_updated_at
  before update on public.health_records
  for each row execute function public.set_updated_at();

-- ai_reports ---------------------------------------------------------------
-- Generated AI veterinary reports. scan_id is nullable (Doc 03 §6): a report can
-- summarise the whole Twin rather than a single scan.
create table if not exists public.ai_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  pet_id       uuid not null references public.pets (id) on delete cascade,
  scan_id      uuid references public.scans (id) on delete set null,
  generated_at timestamptz not null default now(),
  storage_path text not null,                          -- delivered via short-lived signed URL
  deleted_at   timestamptz,                            -- [ADDED] soft delete for retention
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger ai_reports_set_updated_at
  before update on public.ai_reports
  for each row execute function public.set_updated_at();
