#!/usr/bin/env bash
# Setup development environment (bash)
PYTHON=${PYTHON:-python}

if [ ! -d .venv ]; then
  echo ".venv not found. Creating virtual environment with $PYTHON..."
  $PYTHON -m venv .venv
fi

.venv/Scripts/pip install --upgrade pip
if [ -f requirements-dev.txt ]; then
  echo "Installing dev requirements..."
  .venv/Scripts/pip install -r requirements-dev.txt
else
  echo "requirements-dev.txt not found; installing pytest and pre-commit"
  .venv/Scripts/pip install -U pytest pre-commit
fi

echo "Installing pre-commit hooks..."
if command -v .venv/Scripts/pre-commit >/dev/null 2>&1; then
  .venv/Scripts/pre-commit install || true
  echo "pre-commit installed successfully."
else
  echo "pre-commit not available in venv; try installing it manually or rerun the script."
fi

echo "Development setup complete."
