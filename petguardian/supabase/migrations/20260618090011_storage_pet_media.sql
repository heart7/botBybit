-- 20260618090011_storage_pet_media.sql
-- Step 5 — Media storage (Doc 02 §6, Doc 09 §5).
-- A PRIVATE bucket for pet photos/videos, partitioned by pet within each owner's
-- folder, with type/size limits (Doc 04 §9). Access is owner-only via RLS on
-- storage.objects; the app serves files through short-lived signed URLs only.
--
-- Path convention:  {user_id}/{pet_id}/{object}.{ext}
--   -> (storage.foldername(name))[1] is the owner's uid, which the policies check.
--   This is the canonical Supabase owner-folder pattern and still partitions by pet.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-media',
  'pet-media',
  false,                                   -- PRIVATE: never publicly exposed
  52428800,                                -- 50 MiB hard cap at the storage layer
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime'
  ]
)
on conflict (id) do nothing;

-- Owner-only access, scoped to this bucket. Drop-if-exists keeps the migration
-- safely re-runnable.
drop policy if exists "pet_media_select_own" on storage.objects;
create policy "pet_media_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'pet-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pet_media_insert_own" on storage.objects;
create policy "pet_media_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pet-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pet_media_update_own" on storage.objects;
create policy "pet_media_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'pet-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'pet-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pet_media_delete_own" on storage.objects;
create policy "pet_media_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pet-media' and (storage.foldername(name))[1] = auth.uid()::text);
