-- 20260618090003_pets_and_twin.sql
-- Step 2 — Pets & the Digital Twin (Doc 03 §4).
-- pets is the Twin root; the history tables form the longitudinal record.

-- 4.1 pets (Digital Twin root) --------------------------------------------
-- avatar_media_id references pet_media, but pet_media references pets. To break that
-- circular dependency (flagged in STEP-01-02-NOTES.md) the column is created here
-- WITHOUT the FK, and the constraint is added after pet_media exists, below.
create table if not exists public.pets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  name              text not null,
  species           text not null check (species in ('dog', 'cat')),
  breed             text,
  sex               text check (sex in ('male', 'female', 'unknown')),
  date_of_birth     date,
  current_weight_kg numeric(6, 2) check (current_weight_kg is null or current_weight_kg > 0),
  avatar_media_id   uuid,                              -- FK added after pet_media (below)
  deleted_at        timestamptz,                       -- [ADDED] soft delete (Doc 03 §1.1, §8.1)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger pets_set_updated_at
  before update on public.pets
  for each row execute function public.set_updated_at();

-- 4.2 Digital Twin history tables -----------------------------------------
-- pet_media first, so the pets.avatar_media_id FK can reference it.
create table if not exists public.pet_media (
  id           uuid primary key default gen_random_uuid(),
  pet_id       uuid not null references public.pets (id) on delete cascade,
  kind         text not null check (kind in ('photo', 'video')),
  storage_path text not null,                          -- path in a private Storage bucket (Step 5)
  captured_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger pet_media_set_updated_at
  before update on public.pet_media
  for each row execute function public.set_updated_at();

-- Resolve the circular reference now that both tables exist.
alter table public.pets
  add constraint pets_avatar_media_id_fkey
  foreign key (avatar_media_id) references public.pet_media (id) on delete set null;

create table if not exists public.pet_weight_history (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references public.pets (id) on delete cascade,
  weight_kg   numeric(6, 2) not null check (weight_kg > 0),
  recorded_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger pet_weight_history_set_updated_at
  before update on public.pet_weight_history
  for each row execute function public.set_updated_at();

create table if not exists public.pet_vaccinations (
  id              uuid primary key default gen_random_uuid(),
  pet_id          uuid not null references public.pets (id) on delete cascade,
  vaccine         text not null,
  administered_at date,
  next_due_at     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger pet_vaccinations_set_updated_at
  before update on public.pet_vaccinations
  for each row execute function public.set_updated_at();

create table if not exists public.pet_medications (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references public.pets (id) on delete cascade,
  name       text not null,
  dosage     text,
  schedule   text,
  start_at   date,
  end_at     date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pet_medications_set_updated_at
  before update on public.pet_medications
  for each row execute function public.set_updated_at();

create table if not exists public.pet_health_events (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references public.pets (id) on delete cascade,
  event_type  text not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger pet_health_events_set_updated_at
  before update on public.pet_health_events
  for each row execute function public.set_updated_at();

-- Phase 2 table (created now so the schema is complete; no client surface yet).
create table if not exists public.pet_behaviour_logs (
  id             uuid primary key default gen_random_uuid(),
  pet_id         uuid not null references public.pets (id) on delete cascade,
  behaviour_type text not null,
  notes          text,
  observed_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger pet_behaviour_logs_set_updated_at
  before update on public.pet_behaviour_logs
  for each row execute function public.set_updated_at();
