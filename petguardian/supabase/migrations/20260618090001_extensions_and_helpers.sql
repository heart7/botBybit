-- 20260618090001_extensions_and_helpers.sql
-- Step 2 — Database foundation (Doc 03 §1.1, §11).
-- Base extensions and shared helpers used by every later migration.

-- gen_random_uuid() is in core since PG13, but pgcrypto is enabled for parity
-- with Supabase and any future crypto needs. Idempotent.
create extension if not exists pgcrypto;

-- Shared trigger function that maintains the updated_at column on every UPDATE
-- (Doc 03 §1.1: "All tables carry created_at and updated_at timestamptz columns").
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: refreshes updated_at to now(). Shared by all tenant tables.';
