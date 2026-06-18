-- _auth_shim.sql — LOCAL/CI TEST ONLY. Do NOT apply to a real Supabase project.
--
-- A real Supabase database already provides the `auth` schema, `auth.users`,
-- `auth.uid()`, and the anon/authenticated/service_role roles. When we test the
-- migrations against a vanilla PostgreSQL (locally or in CI) those do not exist,
-- so this shim recreates just enough of them for the RLS suite to run.

create schema if not exists auth;

-- Columns mirror the subset of Supabase's auth.users that our triggers read.
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

-- Mirrors Supabase's auth.uid(): the JWT 'sub' claim injected per request.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

-- Roles PostgREST uses. service_role bypasses RLS, exactly as in Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- Mirror Supabase's bootstrap: it grants broad table privileges to all three roles
-- by default and relies ENTIRELY on RLS to protect rows. Replicating that here means
-- the tests prove RLS is the real gate (and that the migration's defensive REVOKE
-- actually tightens things), exactly as in production. Applies to tables created by
-- the migrations, which run as this same superuser after this statement.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;

-- --------------------------------------------------------------------------
-- storage schema shim. Supabase provides storage.buckets, storage.objects, and
-- helpers like storage.foldername(); recreate the minimal subset our storage
-- policies (migration 0011) need so they can be tested on vanilla PostgreSQL.
-- --------------------------------------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id                text primary key,
  name              text not null,
  public            boolean not null default false,
  file_size_limit   bigint,
  allowed_mime_types text[],
  created_at        timestamptz not null default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text not null,
  owner      uuid,
  created_at timestamptz not null default now()
);

-- Returns the folder segments of an object path (everything except the filename),
-- matching Supabase's helper. For 'uid/pet/file.jpg' -> {uid, pet}.
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
immutable
as $$
declare
  parts text[] := string_to_array(name, '/');
begin
  return parts[1:greatest(array_length(parts, 1) - 1, 0)];
end;
$$;

alter table storage.objects enable row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.buckets, storage.objects to service_role;
grant select on storage.buckets to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
