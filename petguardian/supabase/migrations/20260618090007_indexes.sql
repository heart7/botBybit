-- 20260618090007_indexes.sql
-- Step 2 — Indexing & Performance (Doc 03 §10).
--   * Index every foreign key (pet_id, user_id, scan_id).
--   * Composite (pet_id, <time>) on time-series tables for timeline queries.
--   * Partial index on reminders(due_at) where status = 'pending'.
--   * GIN index on queried jsonb columns.

-- Foreign-key / ownership indexes -----------------------------------------
create index if not exists idx_subscriptions_user_id      on public.subscriptions (user_id);
create index if not exists idx_pets_user_id               on public.pets (user_id);
create index if not exists idx_pets_avatar_media_id       on public.pets (avatar_media_id);
create index if not exists idx_pet_media_pet_id           on public.pet_media (pet_id);
create index if not exists idx_scans_user_id              on public.scans (user_id);
create index if not exists idx_scans_pet_id               on public.scans (pet_id);
create index if not exists idx_scans_input_media_id       on public.scans (input_media_id);
create index if not exists idx_ai_assessments_pet_id      on public.ai_assessments (pet_id);
create index if not exists idx_health_scores_pet_id       on public.health_scores (pet_id);
create index if not exists idx_reminders_user_id          on public.reminders (user_id);
create index if not exists idx_reminders_pet_id           on public.reminders (pet_id);
create index if not exists idx_health_records_user_id     on public.health_records (user_id);
create index if not exists idx_health_records_pet_id      on public.health_records (pet_id);
create index if not exists idx_ai_reports_user_id         on public.ai_reports (user_id);
create index if not exists idx_ai_reports_pet_id          on public.ai_reports (pet_id);
create index if not exists idx_ai_reports_scan_id         on public.ai_reports (scan_id);
create index if not exists idx_audit_logs_actor_id        on public.audit_logs (actor_id);
create index if not exists idx_consents_user_id           on public.consents (user_id);

-- Time-series composites (pet_id, <recorded time>) for Twin timeline queries --
create index if not exists idx_weight_pet_recorded   on public.pet_weight_history (pet_id, recorded_at desc);
create index if not exists idx_vacc_pet_admin        on public.pet_vaccinations  (pet_id, administered_at desc);
create index if not exists idx_meds_pet_start        on public.pet_medications   (pet_id, start_at desc);
create index if not exists idx_events_pet_occurred   on public.pet_health_events (pet_id, occurred_at desc);
create index if not exists idx_media_pet_captured    on public.pet_media         (pet_id, captured_at desc);
create index if not exists idx_behaviour_pet_obs     on public.pet_behaviour_logs(pet_id, observed_at desc);
create index if not exists idx_scores_pet_computed   on public.health_scores     (pet_id, computed_at desc);
create index if not exists idx_scans_pet_created     on public.scans             (pet_id, created_at desc);

-- Partial index: pending reminders due soon ------------------------------
create index if not exists idx_reminders_due_pending
  on public.reminders (due_at) where status = 'pending';

-- GIN indexes on queried jsonb columns -----------------------------------
create index if not exists idx_scans_symptom_payload_gin
  on public.scans using gin (symptom_payload);
create index if not exists idx_ai_assessments_factors_gin
  on public.ai_assessments using gin (factors);
create index if not exists idx_health_scores_factors_gin
  on public.health_scores using gin (factors);
