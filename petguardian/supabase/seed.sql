-- seed.sql — idempotent reference/seed data (Doc 03 §11).
-- Safe to run repeatedly (local dev + CI). No tenant data here.

insert into public.feature_flags (key, enabled, rollout)
values
  ('ai_triage',            true,  '{"audience": "all"}'::jsonb),
  ('ai_vet_report',        true,  '{"audience": "all"}'::jsonb),
  ('video_analysis',       false, '{"phase": 2}'::jsonb),
  ('behaviour_analysis',   false, '{"phase": 2}'::jsonb),
  ('breed_intelligence',   false, '{"phase": 2}'::jsonb),
  ('risk_prediction',      false, '{"phase": 3}'::jsonb)
on conflict (key) do nothing;
