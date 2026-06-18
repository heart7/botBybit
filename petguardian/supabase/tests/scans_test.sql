-- scans_test.sql — scan creation & RLS (Step 6). A user may create a pending scan
-- only for their own pet and cannot spoof the owner. Run with ON_ERROR_STOP.

\set ua '77777777-7777-7777-7777-777777777777'
\set ub '66666666-6666-6666-6666-666666666666'
\set pa '7a7a7a7a-7a7a-7a7a-7a7a-7a7a7a7a7a7a'
\set pb '6b6b6b6b-6b6b-6b6b-6b6b-6b6b6b6b6b6b'

reset role;
insert into auth.users (id, email) values
  (:'ua', 'scan-a@example.com'),
  (:'ub', 'scan-b@example.com');
insert into public.pets (id, user_id, name, species) values
  (:'pa', :'ua', 'Scout', 'dog'),
  (:'pb', :'ub', 'Mittens', 'cat');

set request.jwt.claims = '{"sub":"77777777-7777-7777-7777-777777777777"}';
set role authenticated;

-- 1. owner creates a scan for their own pet; status defaults to pending
do $$
declare st text;
begin
  insert into public.scans (pet_id, user_id, symptom_payload)
  values ('7a7a7a7a-7a7a-7a7a-7a7a-7a7a7a7a7a7a',
          '77777777-7777-7777-7777-777777777777',
          '{"primary_concern":"digestion","symptoms":["vomiting"]}'::jsonb);
  select status into st from public.scans
    where pet_id = '7a7a7a7a-7a7a-7a7a-7a7a-7a7a7a7a7a7a' limit 1;
  if st <> 'pending' then raise exception 'default status = %, expected pending', st; end if;
  raise notice 'PASS SC1: owner creates a pending scan';
end $$;

-- 2. cannot create a scan for another user's pet (WITH CHECK via pet ownership)
do $$
begin
  begin
    insert into public.scans (pet_id, user_id)
    values ('6b6b6b6b-6b6b-6b6b-6b6b-6b6b6b6b6b6b',
            '77777777-7777-7777-7777-777777777777');
    raise exception 'SECURITY FAIL: created a scan for another user''s pet';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS SC2: cannot scan another user''s pet';
end $$;

-- 3. cannot spoof user_id
do $$
begin
  begin
    insert into public.scans (pet_id, user_id)
    values ('7a7a7a7a-7a7a-7a7a-7a7a-7a7a7a7a7a7a',
            '66666666-6666-6666-6666-666666666666');
    raise exception 'SECURITY FAIL: spoofed user_id on scan';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS SC3: cannot spoof user_id';
end $$;

-- 4. symptom_payload jsonb persists and is queryable
do $$
declare v jsonb;
begin
  select symptom_payload into v from public.scans
    where pet_id = '7a7a7a7a-7a7a-7a7a-7a7a-7a7a7a7a7a7a' limit 1;
  if v ->> 'primary_concern' <> 'digestion' then
    raise exception 'symptom_payload not persisted: %', v;
  end if;
  raise notice 'PASS SC4: symptom_payload persists';
end $$;

reset role;
\echo 'SCAN CHECKS PASSED'
