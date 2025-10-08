# Deploying Autoflow Bot with Docker

This document shows how to build and run the repo in Docker using the provided `Dockerfile` (multi-stage) and `docker-compose.yml`.

IMPORTANT: `config.json` defaults to `dry_run: true` for safety. Do not enable live trading until you have validated the strategy.

## Files added
- `Dockerfile` - multi-stage build: installs dependencies in a builder image and copies a venv into a slim runtime image.
- `docker-compose.yml` - mounts repo and `user_data`, reads `.env`, runs freqtrade in the container.
- `.env.example` - example environment variables. Copy to `.env` and fill secrets (do NOT commit `.env`).

## Quick start (local)
1. Copy `.env.example` to `.env` and fill tokens and API keys as needed (leave empty for dry run):

```bash
cp .env.example .env
# Edit .env to add keys
```

2. Build and run with Docker Compose:

```bash
docker compose build --pull
docker compose up -d
# Follow logs
docker compose logs -f
```

3. To run a one-off backtest (example):

```bash
docker compose run --rm autoflow bash -lc "/opt/venv/bin/python -m freqtrade backtesting --config /opt/autoflow_Bot/config.json --datadir /opt/autoflow_Bot/user_data/data/bybit --strategy MLGridStrategy"
```

## Notes & tips
- The container uses a copied venv. If you change Python package requirements, rebuild the image.
- `user_data` is bind-mounted so backtests, downloaded data and models persist on the host.
- Keep `dry_run: true` in `config.json` until you test on Bybit testnet and monitor behavior.
- For production, consider running the container on a managed host or VPS behind a firewall, with backups of `user_data`.

## Debugging
- View container logs:

```bash
docker compose logs -f autoflow
# or inspect container
docker compose exec autoflow bash
```

## Alternative: use docker image from CI
- You can build images in CI and push to a registry, then deploy using `docker-compose` or your orchestrator.

## Security
- Do not commit `.env` or real API keys.
- Use restricted API keys when possible (testnet first, then restricted permissions for live).

---
If you'd like, I can also:
- Add a `docker-compose.override.yml` for a development workflow with live code mounts.
- Add a GitHub Actions workflow to build and push the image to a registry.
