#!/usr/bin/env bash
set -euo pipefail

# Default config path (can be overridden via env)
: "${FREQTRADE_CONFIG_PATH:=/opt/autoflow_Bot/config.json}"

# Default strategy (can be overridden via env)
: "${FREQTRADE_STRATEGY:=MLGridStrategy}"

DEFAULT_CMD=(/opt/venv/bin/python -m freqtrade trade --config "$FREQTRADE_CONFIG_PATH" --strategy "$FREQTRADE_STRATEGY")

if [ "$#" -eq 0 ]; then
  echo "Starting default command: ${DEFAULT_CMD[*]}"
  exec "${DEFAULT_CMD[@]}"
else
  echo "Running override command: $@"
  exec "$@"
fi
