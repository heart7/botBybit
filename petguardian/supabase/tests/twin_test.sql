-- twin_test.sql — Digital Twin weight-sync + cascade (Step 4, migration 0010).
-- Exercises the real owner path: a user creates a pet and logs weights, and
-- pets.current_weight_kg must always reflect the latest entry. Run with ON_ERROR_STOP.

\set u 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
\set p 'ffffffff-ffff-ffff-ffff-ffffffffffff'

reset role;
-- Inserting the auth user fires handle_new_user() -> profile + subscription.
insert into auth.users (id, email) values (:'u', 'twin@example.com');

-- Act as the owner so RLS + the sync trigger run on the real client path.
set request.jwt.claims = '{"sub":"eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"}';
set role authenticated;

insert into public.pets (id, user_id, name, species) values (:'p', :'u', 'Milo', 'dog');

insert into public.pet_weight_history (pet_id, weight_kg, recorded_at)
  values (:'p', 10.0, now() - interval '10 days');
insert into public.pet_weight_history (pet_id, weight_kg, recorded_at)
  values (:'p', 11.5, now() - interval '1 day');

-- 1. current weight tracks the latest entry
do $$
declare w numeric;
begin
  select current_weight_kg into w from public.pets
    where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  if w is null or w <> 11.5 then raise exception 'current_weight_kg = %, expected 11.5', w; end if;
  raise notice 'PASS T1: current_weight_kg syncs to the latest weight';
end $$;

-- 2. a backdated (older) entry must not override the current weight
insert into public.pet_weight_history (pet_id, weight_kg, recorded_at)
  values (:'p', 9.0, now() - interval '30 days');
do $$
declare w numeric;
begin
  select current_weight_kg into w from public.pets
    where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  if w <> 11.5 then raise exception 'backdated weight changed current to %', w; end if;
  raise notice 'PASS T2: backdated weight does not override current';
end $$;

-- 3. deleting the latest entry recomputes the current weight
delete from public.pet_weight_history
  where pet_id = :'p' and weight_kg = 11.5;
do $$
declare w numeric;
begin
  select current_weight_kg into w from public.pets
    where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  if w <> 10.0 then raise exception 'after delete current = %, expected 10.0', w; end if;
  raise notice 'PASS T3: deleting the latest weight recomputes current';
end $$;

-- 4. deleting the pet cascades its weight history (and does not error on sync)
delete from public.pets where id = :'p';
reset role;
do $$
declare n int;
begin
  select count(*) into n from public.pet_weight_history
    where pet_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  if n <> 0 then raise exception 'cascade delete left % weight rows', n; end if;
  raise notice 'PASS T4: deleting a pet cascades its weight history';
end $$;

\echo 'TWIN CHECKS PASSED'
