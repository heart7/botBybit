-- 20260618090008_rls.sql
-- Step 2 — Row-Level Security & grants (Doc 03 §9, Doc 09 §3–4).
--
-- Model (least privilege; see docs/STEP-01-02-NOTES.md for the full matrix):
--   * RLS is ENABLED on every table in public. A user can only touch rows they own.
--   * Owner-written tables  -> owner gets CRUD, gated by auth.uid().
--   * Child (Twin) tables    -> ownership enforced through the parent pet.
--   * System-written tables  -> owner gets SELECT only; writes happen via the
--     service role (Edge Functions), which BYPASSes RLS. Covers ai_assessments,
--     health_scores, ai_reports, subscriptions.
--   * Admin tables           -> no client grants at all (audit_logs, feature_flags);
--     only the service role can read/write them.
--
-- Doc 09 §4 shows a single `owner_all FOR ALL` policy; Doc 03 §9.1 splits select vs
-- modify with identical conditions. We use the single FOR ALL form (less redundant)
-- and scope policies TO authenticated so the anon role is denied by default.

-- Supabase already grants schema usage to these roles; included for fresh/local DBs.
grant usage on schema public to anon, authenticated, service_role;

-- DEFENSE IN DEPTH (Doc 09 §2): Supabase grants broad table privileges to anon and
-- authenticated by default, leaving RLS as the only gate. For health data we tighten
-- this: revoke everything from the client roles, then grant back exactly the
-- operations each table needs below. service_role keeps its privileges (it is the
-- trusted backend and bypasses RLS). RLS policies remain the row-level gate on top.
revoke all on all tables in schema public from anon, authenticated;

-- =========================================================================
-- Identity
-- =========================================================================
alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;
create policy profiles_owner on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

alter table public.subscriptions enable row level security;
grant select on public.subscriptions to authenticated;          -- read-only to client
create policy subscriptions_owner_read on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- =========================================================================
-- Pets (Digital Twin root) — full owner CRUD
-- =========================================================================
alter table public.pets enable row level security;
grant select, insert, update, delete on public.pets to authenticated;
create policy pets_owner on public.pets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================================
-- Twin history tables — ownership enforced via the parent pet (Doc 03 §9.2)
-- =========================================================================
-- pet_media
alter table public.pet_media enable row level security;
grant select, insert, update, delete on public.pet_media to authenticated;
create policy pet_media_owner_via_pet on public.pet_media
  for all to authenticated
  using     (exists (select 1 from public.pets p where p.id = pet_media.pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_media.pet_id and p.user_id = auth.uid()));

-- pet_weight_history
alter table public.pet_weight_history enable row level security;
grant select, insert, update, delete on public.pet_weight_history to authenticated;
create policy pet_weight_history_owner_via_pet on public.pet_weight_history
  for all to authenticated
  using     (exists (select 1 from public.pets p where p.id = pet_weight_history.pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_weight_history.pet_id and p.user_id = auth.uid()));

-- pet_vaccinations
alter table public.pet_vaccinations enable row level security;
grant select, insert, update, delete on public.pet_vaccinations to authenticated;
create policy pet_vaccinations_owner_via_pet on public.pet_vaccinations
  for all to authenticated
  using     (exists (select 1 from public.pets p where p.id = pet_vaccinations.pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_vaccinations.pet_id and p.user_id = auth.uid()));

-- pet_medications
alter table public.pet_medications enable row level security;
grant select, insert, update, delete on public.pet_medications to authenticated;
create policy pet_medications_owner_via_pet on public.pet_medications
  for all to authenticated
  using     (exists (select 1 from public.pets p where p.id = pet_medications.pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_medications.pet_id and p.user_id = auth.uid()));

-- pet_health_events
alter table public.pet_health_events enable row level security;
grant select, insert, update, delete on public.pet_health_events to authenticated;
create policy pet_health_events_owner_via_pet on public.pet_health_events
  for all to authenticated
  using     (exists (select 1 from public.pets p where p.id = pet_health_events.pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_health_events.pet_id and p.user_id = auth.uid()));

-- pet_behaviour_logs (Phase 2)
alter table public.pet_behaviour_logs enable row level security;
grant select, insert, update, delete on public.pet_behaviour_logs to authenticated;
create policy pet_behaviour_logs_owner_via_pet on public.pet_behaviour_logs
  for all to authenticated
  using     (exists (select 1 from public.pets p where p.id = pet_behaviour_logs.pet_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_behaviour_logs.pet_id and p.user_id = auth.uid()));

-- =========================================================================
-- Health activity
-- =========================================================================
-- scans: owner may read and create their own; status transitions are server-side.
alter table public.scans enable row level security;
grant select, insert on public.scans to authenticated;
create policy scans_owner_read on public.scans
  for select to authenticated
  using (user_id = auth.uid());
create policy scans_owner_insert on public.scans
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.pets p where p.id = scans.pet_id and p.user_id = auth.uid())
  );

-- ai_assessments: system-written. Owner read-only via pet.
alter table public.ai_assessments enable row level security;
grant select on public.ai_assessments to authenticated;
create policy ai_assessments_owner_read on public.ai_assessments
  for select to authenticated
  using (exists (select 1 from public.pets p where p.id = ai_assessments.pet_id and p.user_id = auth.uid()));

-- health_scores: system-written. Owner read-only via pet.
alter table public.health_scores enable row level security;
grant select on public.health_scores to authenticated;
create policy health_scores_owner_read on public.health_scores
  for select to authenticated
  using (exists (select 1 from public.pets p where p.id = health_scores.pet_id and p.user_id = auth.uid()));

-- =========================================================================
-- Records & scheduling
-- =========================================================================
alter table public.reminders enable row level security;
grant select, insert, update, delete on public.reminders to authenticated;
create policy reminders_owner on public.reminders
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.health_records enable row level security;
grant select, insert, update, delete on public.health_records to authenticated;
create policy health_records_owner on public.health_records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ai_reports: system-written. Owner read-only.
alter table public.ai_reports enable row level security;
grant select on public.ai_reports to authenticated;
create policy ai_reports_owner_read on public.ai_reports
  for select to authenticated
  using (user_id = auth.uid());

-- =========================================================================
-- Platform / compliance
-- =========================================================================
-- consents: owner can read, create, and update (revoke). No hard delete.
alter table public.consents enable row level security;
grant select, insert, update on public.consents to authenticated;
create policy consents_owner on public.consents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- audit_logs & feature_flags: admin/global. RLS on, NO client grants ->
-- only the service role (BYPASSRLS) can touch them.
alter table public.audit_logs enable row level security;
alter table public.feature_flags enable row level security;
