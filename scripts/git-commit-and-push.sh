#!/usr/bin/env bash
# Usage: ./scripts/git-commit-and-push.sh "commit message" [--run-tests]
MSG=${1:-"Update"}
RUN_TESTS=false
if [ "$2" == "--run-tests" ]; then
  RUN_TESTS=true
fi

if [ "$RUN_TESTS" = true ]; then
  echo "Running tests..."
  .venv/Scripts/python -m pytest -q
  if [ $? -ne 0 ]; then
    echo "Tests failed. Aborting commit."
    exit 1
  fi
fi

git add -A
if git commit -m "$MSG"; then
  echo "Committed: $MSG"
  git push origin HEAD
else
  echo "No changes to commit or commit failed."
fi
