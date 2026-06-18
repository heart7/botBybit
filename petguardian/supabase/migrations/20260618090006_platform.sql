-- 20260618090006_platform.sql
-- Step 2 — Platform tables (Doc 03 §7).
-- audit_logs and feature_flags are admin/global (NOT tenant-owned).
-- consents IS tenant-owned and is the compliance backbone (Layer 3 / GDPR).

-- audit_logs ---------------------------------------------------------------
-- Append-only trail of sensitive actions. EXCEPTION to the updated_at convention:
-- audit rows are never updated, so only created_at is kept (flagged in NOTES).
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- feature_flags ------------------------------------------------------------
-- Admin-controlled toggles. Server-side only for now (see RLS migration).
create table if not exists public.feature_flags (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  enabled    boolean not null default false,
  rollout    jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

-- consents -----------------------------------------------------------------
-- Records explicit, revocable consent (incl. Layer 3 anonymised learning).
-- DECISION: unique(user_id, consent_type) models "current state per consent type".
--   If a full consent *history* (audit trail of grant/revoke over time) is required,
--   drop the unique constraint and treat the table as append-only. See NOTES.
create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null,
  granted      boolean not null default false,
  granted_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, consent_type)
);

create trigger consents_set_updated_at
  before update on public.consents
  for each row execute function public.set_updated_at();
