-- 20260618090002_identity.sql
-- Step 2 — Identity & Accounts (Doc 03 §3).
-- profiles extends auth.users 1:1; subscriptions tracks the active plan per user.

-- 3.1 profiles -------------------------------------------------------------
-- One row per user. id IS the auth.users id (Doc 03 §3.1: "PK; references auth.users.id").
-- This makes auth.uid() == profiles.id == every tenant table's user_id, which is what
-- the RLS policies in Doc 09 rely on.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  country      text,                                  -- for localisation / compliance
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3.2 subscriptions --------------------------------------------------------
-- Active plan per user; tier drives feature gating and scan limits.
-- DECISIONS (flagged for review, see docs/STEP-01-02-NOTES.md):
--   * unique(user_id): the PRD says a profile has exactly one subscription.
--   * scans_period_start: Doc 03 calls scans_used a "rolling monthly counter" but
--     gives no reset anchor. process_scan (Step 6/7) needs to know when the current
--     window started to reset the free-tier cap; this column is that anchor.
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  tier               text not null default 'free'
                       check (tier in ('free', 'basic', 'premium', 'family', 'breeder')),
  status             text not null default 'active'
                       check (status in ('active', 'past_due', 'cancelled')),
  scans_used         int  not null default 0 check (scans_used >= 0),
  scans_period_start timestamptz not null default now(),   -- [ADDED] reset anchor
  renews_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id)                                          -- [ADDED] one plan per user
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
