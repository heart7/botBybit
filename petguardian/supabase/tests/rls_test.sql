-- rls_test.sql — RLS & guardrail tests for the PetGuardian schema (Doc 03 §9, Doc 09).
-- Runs on vanilla PostgreSQL with _auth_shim.sql loaded first. Each check RAISEs on
-- failure; run with `psql -v ON_ERROR_STOP=1` so the first failure aborts non-zero.
--
-- Fixtures: two tenants (A, B) seeded as the superuser (RLS bypassed), then every
-- scenario re-enters as the `authenticated`/`anon`/`service_role` role to prove the
-- policies behave.

\set user_a '11111111-1111-1111-1111-111111111111'
\set user_b '22222222-2222-2222-2222-222222222222'
\set pet_a  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
\set pet_b  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
\set scan_a 'cccccccc-cccc-cccc-cccc-cccccccccccc'

-- ---------------------------------------------------------------------------
-- Setup (as superuser; bypasses RLS)
-- ---------------------------------------------------------------------------
-- Inserting into auth.users fires handle_new_user(), which creates the matching
-- profiles + free-tier subscriptions rows — so we do NOT insert those manually.
reset role;
insert into auth.users (id, email) values
  (:'user_a', 'a@example.com'),
  (:'user_b', 'b@example.com');

-- petA gets a deliberately old updated_at so the trigger test can prove it moves.
insert into public.pets (id, user_id, name, species, updated_at) values
  (:'pet_a', :'user_a', 'Rex',     'dog', timestamptz '2000-01-01'),
  (:'pet_b', :'user_b', 'Whiskers', 'cat', now());

insert into public.pet_weight_history (pet_id, weight_kg) values
  (:'pet_a', 12.5),
  (:'pet_b', 4.2);

insert into public.scans (id, pet_id, user_id, status) values
  (:'scan_a', :'pet_a', :'user_a', 'complete');

-- System-written rows, created via the service role (which bypasses RLS).
set role service_role;
insert into public.ai_assessments (scan_id, pet_id, triage_level, summary, factors)
  values (:'scan_a', :'pet_a', 'green', 'Keep monitoring; no action needed.', '["weight_trend"]'::jsonb);
insert into public.health_scores (pet_id, score, factors)
  values (:'pet_a', 90, '["recent_assessment"]'::jsonb);
insert into public.audit_logs (actor_id, action, entity, entity_id)
  values (:'user_a', 'scan.completed', 'scan', :'scan_a');
reset role;

-- ===========================================================================
-- 1. RLS is enabled on EVERY table in public (Doc 09 §4: "every tenant-owned table")
-- ===========================================================================
do $$
declare missing text;
begin
  select string_agg(c.relname, ', ') into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;
  if missing is not null then
    raise exception 'RLS not enabled on: %', missing;
  end if;
  raise notice 'PASS 1: RLS enabled on all public tables';
end $$;

-- ===========================================================================
-- 2. Tenant isolation on SELECT — A sees only A's pet
-- ===========================================================================
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
set role authenticated;
do $$
declare n int; n_b int;
begin
  select count(*) into n   from public.pets;
  select count(*) into n_b from public.pets where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if n <> 1   then raise exception 'A should see exactly 1 pet, saw %', n; end if;
  if n_b <> 0 then raise exception 'A must NOT see B''s pet'; end if;
  raise notice 'PASS 2: A sees only its own pet';
end $$;

-- ===========================================================================
-- 3. Child table isolation — A sees only A's weight history (via parent pet)
-- ===========================================================================
do $$
declare n int;
begin
  select count(*) into n from public.pet_weight_history;
  if n <> 1 then raise exception 'A should see 1 weight row, saw %', n; end if;
  raise notice 'PASS 3: weight history isolated via parent pet';
end $$;

-- ===========================================================================
-- 4. WITH CHECK — A cannot create a pet owned by B, but can create its own
-- ===========================================================================
do $$
begin
  begin
    insert into public.pets (user_id, name, species)
      values ('22222222-2222-2222-2222-222222222222', 'Sneaky', 'dog');
    raise exception 'SECURITY FAIL: A inserted a pet owned by B';
  exception when insufficient_privilege then
    null; -- expected: RLS WITH CHECK blocked it
  end;
  insert into public.pets (user_id, name, species)
    values ('11111111-1111-1111-1111-111111111111', 'Buddy', 'dog');
  raise notice 'PASS 4: WITH CHECK blocks cross-tenant insert, allows own insert';
end $$;

-- ===========================================================================
-- 5. Child WITH CHECK — A cannot append weight to B's pet
-- ===========================================================================
do $$
begin
  begin
    insert into public.pet_weight_history (pet_id, weight_kg)
      values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 9.9);
    raise exception 'SECURITY FAIL: A appended weight to B''s pet';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'PASS 5: child WITH CHECK blocks cross-tenant insert';
end $$;

-- ===========================================================================
-- 6. System-written tables — owner can READ, but cannot WRITE ai_assessments
-- ===========================================================================
do $$
declare n int;
begin
  select count(*) into n from public.ai_assessments;
  if n <> 1 then raise exception 'A should read its 1 assessment, saw %', n; end if;
  begin
    insert into public.ai_assessments (scan_id, pet_id, triage_level, summary)
      values ('cccccccc-cccc-cccc-cccc-cccccccccccc',
              'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'green', 'forged');
    raise exception 'SECURITY FAIL: client wrote an AI assessment';
  exception when insufficient_privilege then
    null; -- expected: no INSERT grant to authenticated
  end;
  raise notice 'PASS 6: AI assessments are read-only to the owner';
end $$;

-- ===========================================================================
-- 7. Admin tables — authenticated cannot read audit_logs or feature_flags
-- ===========================================================================
-- Denial is acceptable either as "permission denied" (no grant) or "0 rows" (RLS),
-- so the assertion holds whether or not the defensive REVOKE was applied.
do $$
declare n int;
begin
  begin
    select count(*) into n from public.audit_logs;
    if n <> 0 then raise exception 'SECURITY FAIL: client read % audit rows', n; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into n from public.feature_flags;
    if n <> 0 then raise exception 'SECURITY FAIL: client read % feature flags', n; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 7: admin tables are not client-readable';
end $$;

-- ===========================================================================
-- 8. updated_at trigger fired on UPDATE (petA started at 2000-01-01)
-- ===========================================================================
do $$
declare ts timestamptz;
begin
  update public.pets set name = 'Rex II'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  select updated_at into ts from public.pets
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  if ts <= timestamptz '2000-01-02' then
    raise exception 'updated_at trigger did not fire (still %)', ts;
  end if;
  raise notice 'PASS 8: updated_at trigger fires on UPDATE';
end $$;

-- ===========================================================================
-- 9. Symmetry — B sees only B's pet
-- ===========================================================================
reset role;
set request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
set role authenticated;
do $$
declare n int; only_b uuid;
begin
  select count(*) into n from public.pets;
  if n <> 1 then raise exception 'B should see exactly 1 pet, saw %', n; end if;
  select id into only_b from public.pets;
  if only_b <> 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' then
    raise exception 'B sees the wrong pet: %', only_b;
  end if;
  raise notice 'PASS 9: B sees only its own pet';
end $$;

-- ===========================================================================
-- 10. anon is denied (policies are scoped TO authenticated)
-- ===========================================================================
reset role;
set request.jwt.claims = '{"sub":""}';
set role anon;
do $$
declare n int;
begin
  begin
    select count(*) into n from public.pets;
    if n <> 0 then raise exception 'SECURITY FAIL: anon read % pets', n; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS 10: anon cannot read tenant tables';
end $$;

-- ===========================================================================
-- 11. service_role bypasses RLS (sees all tenants)
-- ===========================================================================
reset role;
set role service_role;
do $$
declare n int;
begin
  select count(*) into n from public.pets;
  if n < 2 then raise exception 'service_role should see all pets, saw %', n; end if;
  raise notice 'PASS 11: service_role bypasses RLS (sees % pets)', n;
end $$;

-- ===========================================================================
-- 12. Triage guardrail — triage_level CHECK rejects anything but green/yellow/orange
-- ===========================================================================
do $$
begin
  begin
    insert into public.ai_assessments (scan_id, pet_id, triage_level, summary)
      values ('cccccccc-cccc-cccc-cccc-cccccccccccc',
              'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'red', 'should fail');
    raise exception 'GUARDRAIL FAIL: triage_level=red was accepted';
  exception when check_violation then null; -- expected
  end;
  raise notice 'PASS 12: triage_level CHECK enforces green/yellow/orange only';
end $$;

reset role;
\echo '------------------------------------------------------------'
\echo 'ALL RLS / GUARDRAIL CHECKS PASSED'
\echo '------------------------------------------------------------'
