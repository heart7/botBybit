#!/usr/bin/env bash
# Usage: ./scripts/git-commit-and-push.sh "commit message" [--run-tests]
MSG=${1:-"Update"}
RUN_TESTS=false
FORCE=false
PYTHON=${PYTHON:-python}
if [ "$2" == "--run-tests" ] || [ "$3" == "--run-tests" ]; then
  RUN_TESTS=true
fi
if [ "$2" == "--force" ] || [ "$3" == "--force" ]; then
  FORCE=true
fi

if [ "$RUN_TESTS" = true ]; then
  echo "Running tests..."
  if [ ! -d .venv ]; then
    echo ".venv not found. Creating virtual environment with $PYTHON..."
    $PYTHON -m venv .venv
  fi
  if [ -f requirements-dev.txt ]; then
    echo "Installing dev requirements..."
    .venv/Scripts/pip install -r requirements-dev.txt
    if command -v .venv/Scripts/ruff >/dev/null 2>&1; then
      echo "Running ruff --fix..."
      .venv/Scripts/ruff --fix . || true
    fi
  else
    .venv/Scripts/pip install -U pytest
  fi
  .venv/Scripts/python -m pytest -q
  if [ $? -ne 0 ]; then
    echo "Tests failed."
    if [ "$FORCE" = true ]; then
      echo "--force passed; continuing to commit."
    else
      echo "Aborting commit due to failing tests."
      exit 1
    fi
  fi
fi

git add -A
if git commit -m "$MSG"; then
  echo "Committed: $MSG"
  git push origin HEAD
else
  echo "No changes to commit or commit failed."
fi
