# Step 6 — Symptom questionnaire + scans — notes, decisions & flags

Status: **complete and tested.** Typecheck OK · 51 unit tests pass · 27 DB checks pass
(3 auth + 12 RLS + 4 scans + 4 storage + 4 Twin).

Working from **Doc 04 §4** (scan inputs/endpoints, error shape, scan-limit note) and
**Doc 05 §4.4/§4.5** (scan flow + triage result). The AI engine that turns a scan into
triage (process_scan + OpenAI) is **Step 7** — this step only collects inputs and
creates the scan.

## What was built

- **Scan tab flow** (new `ScanStack`): pick pet → symptom questionnaire (+ optional
  photo) → result screen.
- **Questionnaire** (`questionnaire.ts`, pure, 7 unit tests): main concern, symptom
  checklist, duration, notes → a structured `symptom_payload`.
- **Scan creation** (`scans.ts`): inserts a `pending` scan with `pet_id`, `user_id`,
  optional `input_media_id`, and `symptom_payload`. RLS lets you scan only your own pets.
- **Photo capture** reuses Step 5's upload (the photo becomes `pet_media` and the
  scan's `input_media_id`, and shows up in the Twin timeline).
- **Result screen** already renders triage (green/yellow/orange + next step + factors)
  when an assessment exists — forward-compatible with Step 7 — and otherwise shows a
  pending state. It ALWAYS shows the "guidance, not a diagnosis" disclaimer.
- **DB test** (`scans_test.sql`): owner can create a pending scan; cannot scan another
  user's pet; cannot spoof `user_id`; `symptom_payload` persists.
- New reusable `Chips` multi-select component; `Field` now merges a passed `style`.

## Decisions (review these)

1. **The app creates the pending scan directly** (Doc 02 data flow), using the owner
   insert policy from Step 2. The AI quota (`subscriptions.scans_used`) is consumed
   server-side when `process_scan` runs (Step 7); this screen only shows a **soft**
   usage check. Authoritative limit enforcement is Step 7 (Doc 04 §7).
2. **Questionnaire content is a placeholder** — the package doesn't define the question
   set. Concerns/symptoms/durations here are my reasonable defaults (British spelling to
   match the spec). Tell me the real clinical question set and I'll swap it in;
   `symptom_payload` shape is `{ primary_concern, symptoms[], duration, notes }`.
3. **Single scrollable form**, not a multi-step wizard. Doc 05 says "progressive
   disclosure"; sections approximate it. A stepper is a later polish.
4. **Result `Done`** returns to the pet picker (`popToTop`), and the result screen
   replaces the form in history so Back doesn't reopen a filled form.

## Flags / deferred

- **process_scan + OpenAI + triage + health score + quota increment** → Step 7. Until
  then a submitted scan stays `pending` and the result screen says so.
- **Scan history list** (Doc 04 `GET /scans`): assessments already surface in the pet
  timeline; a dedicated per-pet scan history screen is a small follow-on.
- **Multi-step wizard** and richer per-concern follow-up questions.
