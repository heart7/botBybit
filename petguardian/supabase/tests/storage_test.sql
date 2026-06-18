-- storage_test.sql — storage.objects RLS for the pet-media bucket (Step 5, mig 0011).
-- A user may only read/write objects under their own {uid}/... folder. ON_ERROR_STOP.

\set ua '99999999-9999-9999-9999-999999999999'
\set ub '88888888-8888-8888-8888-888888888888'

reset role;
insert into auth.users (id, email) values
  (:'ua', 'storage-a@example.com'),
  (:'ub', 'storage-b@example.com');

set request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
set role authenticated;

-- 1. owner can upload under their own folder
do $$
begin
  insert into storage.objects (bucket_id, name, owner)
  values ('pet-media', '99999999-9999-9999-9999-999999999999/pet1/a.jpg',
          '99999999-9999-9999-9999-999999999999');
  raise notice 'PASS S1: owner can upload under their own folder';
end $$;

-- 2. cannot upload under another user's folder (WITH CHECK)
do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('pet-media', '88888888-8888-8888-8888-888888888888/pet1/x.jpg',
            '99999999-9999-9999-9999-999999999999');
    raise exception 'SECURITY FAIL: uploaded under another user folder';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS S2: cannot upload under another user''s folder';
end $$;

-- seed an object owned by B (as superuser)
reset role;
insert into storage.objects (bucket_id, name, owner)
values ('pet-media', '88888888-8888-8888-8888-888888888888/pet1/b.jpg',
        '88888888-8888-8888-8888-888888888888');

-- 3. A sees only its own object
set request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999"}';
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from storage.objects where bucket_id = 'pet-media';
  if n <> 1 then raise exception 'A should see exactly 1 object, saw %', n; end if;
  raise notice 'PASS S3: storage listing is tenant-isolated';
end $$;

-- 4. the bucket is private
reset role;
do $$
declare is_public boolean;
begin
  select public into is_public from storage.buckets where id = 'pet-media';
  if is_public is distinct from false then raise exception 'pet-media bucket must be private'; end if;
  raise notice 'PASS S4: pet-media bucket is private';
end $$;

\echo 'STORAGE CHECKS PASSED'
