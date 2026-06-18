# Step 4 — Pet profiles + multi-pet + Digital Twin root — notes, decisions & flags

Status: **complete and tested.** Typecheck OK · 35 unit tests pass · 19 DB checks pass
(3 auth-trigger + 12 RLS + 4 Twin/weight-sync).

Working from **Doc 03** (pets + history tables, already migrated in Step 2), **Doc 08**
(Digital Twin: rooted in `pets`, grown by history, RLS-protected), and **Doc 05
§3/§4.3** (Pets tab and Pet Profile screen).

## What was built

- **Navigation** (the refactor promised in Step 3): React Navigation v6 — a bottom tab
  bar (Home · Pets · Scan · Records · Account) with a native stack inside the Pets tab.
  Opens on the **Pets** tab. Home/Scan/Records are honest placeholders.
- **Multi-pet CRUD** (`lib/pets.ts`): list, create, edit, soft-delete; RLS scopes all.
- **Pet form** (create/edit) with validated inputs and segmented species/sex controls.
- **Digital Twin root screen**: header (avatar placeholder, name, species·breed, age,
  current weight) + a unified, chronological **timeline** + actions (Log weight, Edit,
  Remove).
- **Weight tracking** (`lib/twin.ts` + migration `0010`): logging a weight inserts
  history; a DB trigger keeps `pets.current_weight_kg` synced to the latest entry.
- **Pure helpers + tests**: `petValidation.ts` (Twin input validation, Doc 08 §8) and
  `format.ts` (UTC-deterministic age) with 26 new unit tests.

## Decisions (review these)

1. **Delete is a SOFT delete** (sets `deleted_at`), not Doc 04 §3's hard cascade.
   Rationale: the Twin is a "defensible data asset" (Doc 08 §2) and Doc 09 §8 favours
   anonymise-over-erase. `listPets`/`getPet` filter out soft-deleted rows. Hard cascade
   stays available server-side for GDPR erasure. **Confirm this is the behaviour you want.**
2. **Weight is history-driven.** The pet form does not edit weight directly; you log it
   from the detail screen and the trigger updates the snapshot. Keeps the time series
   and `current_weight_kg` from ever disagreeing.
3. **React Navigation v6**, with `react-native-screens`/`react-native-safe-area-context`
   pinned to the Expo 51 versions. (v7 exists; v6 is the safe match for SDK 51.)
4. **Timeline aggregates client-side** from 5 history tables (weight, vaccinations,
   medications, events, assessments). Empty sources simply don't render — so later
   steps' data appears automatically with no timeline changes.
5. **DOB is a `YYYY-MM-DD` text field** (validated) — no date-picker dependency yet.

## Deferred (later steps / quick follow-ons)

- **Avatar image** + photo/video timeline → Step 5 (media upload to Storage). Today the
  avatar is a species emoji.
- **Vaccination / medication / health-event entry forms** — the timeline already *reads*
  them; only the "add" UIs are pending (natural fit alongside reminders in Step 9).
- **Health-score history chart** (Doc 05 §4.3) → Step 8 (health scores).
- A DB-level `pet_timeline` view (with `security_invoker`) could replace the client-side
  merge later if the timeline grows; client merge is fine at current scale.
