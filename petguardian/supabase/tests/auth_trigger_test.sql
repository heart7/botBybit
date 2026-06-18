-- auth_trigger_test.sql — verifies handle_new_user() (Step 3, migration 0009).
-- Inserting an auth.users row must auto-create a profile and a free-tier subscription.
-- Run with `psql -v ON_ERROR_STOP=1` so a failed assertion aborts non-zero.

\set new_user 'dddddddd-dddd-dddd-dddd-dddddddddddd'

reset role;
insert into auth.users (id, email, raw_user_meta_data)
values (:'new_user', 'newbie@example.com', '{"display_name":"Newbie","country":"GB"}'::jsonb);

-- 1. profile created from the signup metadata
do $$
declare r record;
begin
  select * into r from public.profiles
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if not found then raise exception 'handle_new_user did not create a profile'; end if;
  if r.display_name <> 'Newbie' then
    raise exception 'profile display_name = %, expected Newbie', r.display_name;
  end if;
  if r.country <> 'GB' then
    raise exception 'profile country = %, expected GB', r.country;
  end if;
  raise notice 'PASS A1: profile bootstrapped from signup metadata';
end $$;

-- 2. free-tier active subscription created
do $$
declare r record;
begin
  select * into r from public.subscriptions
    where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if not found then raise exception 'handle_new_user did not create a subscription'; end if;
  if r.tier <> 'free'     then raise exception 'subscription tier = %, expected free', r.tier; end if;
  if r.status <> 'active'  then raise exception 'subscription status = %, expected active', r.status; end if;
  if r.scans_used <> 0     then raise exception 'subscription scans_used = %, expected 0', r.scans_used; end if;
  raise notice 'PASS A2: free-tier active subscription bootstrapped';
end $$;

-- 3. exactly one of each (no duplicates / idempotent inserts)
do $$
declare np int; ns int;
begin
  select count(*) into np from public.profiles      where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  select count(*) into ns from public.subscriptions where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if np <> 1 then raise exception 'expected 1 profile, got %', np; end if;
  if ns <> 1 then raise exception 'expected 1 subscription, got %', ns; end if;
  raise notice 'PASS A3: exactly one profile and one subscription';
end $$;

\echo 'AUTH TRIGGER CHECKS PASSED'
