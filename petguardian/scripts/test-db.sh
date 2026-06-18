#!/usr/bin/env bash
# test-db.sh — apply the schema to a throwaway database and run the RLS suite.
#
# Local:  sudo -u postgres bash petguardian/scripts/test-db.sh
# CI:     PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres \
#           bash petguardian/scripts/test-db.sh
#
# Uses standard libpq env vars (PGHOST/PGPORT/PGUSER/PGPASSWORD). Requires a
# superuser connection because it creates a database and the auth-shim roles.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
TESTS_DIR="$ROOT/supabase/tests"
SEED="$ROOT/supabase/seed.sql"
TEST_DB="${TEST_DB:-petguardian_test}"

psql_admin() { psql -v ON_ERROR_STOP=1 -X -q "$@"; }
psql_db()    { psql -v ON_ERROR_STOP=1 -X -q -d "$TEST_DB" "$@"; }

echo "==> Recreating database '$TEST_DB'"
psql_admin -d postgres -c "drop database if exists $TEST_DB;"
psql_admin -d postgres -c "create database $TEST_DB;"

echo "==> Loading Supabase auth shim (local/CI only)"
psql_db -f "$TESTS_DIR/_auth_shim.sql"

echo "==> Applying migrations"
for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "    - $(basename "$f")"
  psql_db -f "$f"
done

echo "==> Seeding reference data"
psql_db -f "$SEED"

echo "==> Running test suites (*_test.sql)"
for t in "$TESTS_DIR"/*_test.sql; do
  echo "    - $(basename "$t")"
  psql_db -f "$t"
done

echo "==> Dropping database '$TEST_DB'"
psql_admin -d postgres -c "drop database if exists $TEST_DB;"

echo "==> OK"
