# PetGuardian

An AI Health Operating System for Pets. The Pet **Digital Twin** is the central
intelligence engine; the AI provides **triage and guidance, never a diagnosis**.

This subproject is built incrementally following the 13-step build order in the
engineering package (Doc 12). See [`docs/STEP-01-02-NOTES.md`](docs/STEP-01-02-NOTES.md)
for build status and the decisions/flags raised so far.

## Stack (fixed — Doc 12 §3)

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | React Native + Expo                                     |
| Backend  | Supabase (Auth, Postgres, Storage, Edge Functions)     |
| Database | PostgreSQL                                              |
| AI       | OpenAI API (server-side only)                           |

## Layout

```
petguardian/
├── app/                       # Expo React Native app
│   └── src/lib/               # supabase client, config, triage guardrail
├── supabase/
│   ├── migrations/            # schema (Doc 03) + RLS (Doc 09), applied in order
│   ├── seed.sql               # idempotent reference data (feature flags)
│   ├── config.toml            # Supabase CLI config
│   └── tests/                 # _auth_shim.sql + rls_test.sql
├── scripts/test-db.sh         # apply migrations to a throwaway DB and run RLS tests
└── docs/                      # build notes, decisions, flags
```

## Getting started

```bash
cd petguardian
cp .env.example .env          # fill in EXPO_PUBLIC_* (anon key + URL only)

# App
npm install
npm run typecheck
npm run app                   # expo start

# Database (requires the Supabase CLI + Docker)
supabase start
supabase db reset             # applies migrations + seed
```

## Testing the database (no Supabase CLI needed)

`scripts/test-db.sh` applies every migration to a throwaway database and runs the
RLS / guardrail suite against a plain PostgreSQL. A local `auth` shim stands in for
the `auth` schema and roles that Supabase provides in production.

```bash
# Local (peer auth as the postgres superuser)
sudo -u postgres bash scripts/test-db.sh

# Against any superuser connection (e.g. CI)
PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash scripts/test-db.sh
```

## Non-negotiable guardrails (Docs 07 / 09 / 12)

- AI output is **triage and guidance, never a diagnosis** (`app/src/lib/triage.ts`).
- Every assessment returns a triage level: **green, yellow, or orange**.
- **Row-level security** on every tenant-owned table.
- Encrypt in transit and at rest; **service keys never reach the client**.
- Validate all inputs; rate-limit AI and auth endpoints.
