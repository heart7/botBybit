# Step 5 — Media upload to Storage — notes, decisions & flags

Status: **complete and tested.** Typecheck OK · 44 unit tests pass · 23 DB checks pass
(3 auth + 12 RLS + 4 storage + 4 Twin).

Working from **Doc 02 §6** (private buckets partitioned by pet, signed URLs, paths in
`pet_media`, encrypted at rest), **Doc 09 §5** (private buckets; short-lived signed
URLs only; secrets off-client), and **Doc 04 §9** (type/size limits).

## What was built

- **Private `pet-media` bucket** (migration `0011`) with a 50 MiB cap and an allowed
  MIME-type list; **owner-only RLS** on `storage.objects` scoped to the bucket.
- **Storage RLS tests** (`storage_test.sql`): upload allowed only under your own
  folder, cross-tenant upload blocked, listing is tenant-isolated, bucket is private.
- **App media layer** (`lib/media.ts`): pick → validate → upload → record in
  `pet_media`; list; **signed-URL** read (1 h TTL); set avatar.
- **Pure validation** (`mediaValidation.ts`, 9 unit tests): MIME allow-list + size caps.
- **Pet detail UI**: avatar image, an "Add photo" action (expo-image-picker), a photo
  strip (tap to set as profile photo), and media now appears in the Twin timeline.
- Storage shim added to the test harness so storage policies run on vanilla PostgreSQL.

## Decisions (review these)

1. **Path convention `{user_id}/{pet_id}/{object}.{ext}`** — the canonical Supabase
   owner-folder pattern (RLS checks the first folder == `auth.uid()`), which still
   "partitions by pet" (Doc 02 §6) via the second segment. Simpler and more robust than
   checking ownership through the pets table inside a storage policy.
2. **Size/type limits in two places**: the bucket (50 MiB + MIME list, enforced
   server-side) and the client (`mediaValidation.ts`: 10 MB images / 50 MB video) for a
   fast, friendly pre-check. Adjust the image cap if you expect larger photos.
3. **Upload via base64** (`expo-file-system` + `base64-arraybuffer`) — the reliable RN
   path for getting a local file's bytes into Supabase Storage.
4. **Avatar**: the first uploaded photo auto-becomes the avatar; tap any thumbnail to
   change it. Avatar is rendered from a signed URL.

## Flags / deferred

- **Orphaned objects**: upload happens before the `pet_media` insert; if the insert
  fails, the uploaded object is left behind (no cleanup job yet). A storage-cleanup
  Edge Function (or a DB→storage reconcile) should be added later.
- **Storage cleanup on deletion**: soft-deleting a pet does NOT remove its storage
  objects (they stay, still RLS-protected). Hard GDPR erasure (Doc 02 §6 "lifecycle
  aligned to data-deletion policy") needs a server-side cleanup — deferred with the
  account-deletion flow.
- **Video playback**: videos appear in the timeline but there's no inline player yet;
  only photos render as thumbnails.
- **Upload progress/retry** (Doc 02 client responsibility): basic upload now; a
  progress indicator + retry is a later polish.
- **Scan media (`input_media_id`)**: the scan capture flow that links media to a scan
  is Step 6.
