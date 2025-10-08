Webhook mode (recommended for production)
- You can run the webhook-based bot (`telegram_publisher_webhook.py`) instead of the polling bot. Webhook mode receives callback queries directly from Telegram and has lower latency.
- Example using ngrok (local dev):

  # start ngrok forwarding to port 8080
  ngrok http 8080

  # assume ngrok reports https://abcd1234.ngrok.io
  # set webhook (use TELEGRAM_BOT_TOKEN)
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" -d "url=https://abcd1234.ngrok.io/webhook${WEBHOOK_SECRET:+/${WEBHOOK_SECRET}}"
- Run the webhook container (or locally):

  docker compose up -d telegram-bot-webhook

- The webhook path can include `WEBHOOK_SECRET` for simple hardening. Set the same `WEBHOOK_SECRET` env var in your container and include it in the setWebhook URL.

Deploying as a service (systemd)

- Copy `.env` to `/opt/autoflow_Bot/.env` on your server and update values.
- Copy the `deploy/systemd/telegram-webhook.service` to `/etc/systemd/system/` and enable it:

  sudo cp deploy/systemd/telegram-webhook.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now telegram-webhook.service

- To run all compose services, use `deploy/systemd/docker-compose-app.service` similarly.
Approval workflow and Docker development notes

Overview

This repository implements a two-step release flow:

1. Release job (creates a pending release)
   - `.github/workflows/release.yml` uploads an artifact named `pending-release-<tag>`
   - Sends a Telegram notification (if `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID` secrets present) with an Approve button
   - The Approve button opens the GitHub Actions "Run workflow" UI for the `publish_release.yml` workflow with `artifact_name` prefilled

2. Publish job (manual approval)
   - `.github/workflows/publish_release.yml` is run manually (or via the UI) and expects an `artifact_name` input
   - The job downloads the artifact, reads the tag, creates & pushes the annotated git tag, then creates the GitHub Release

Approver quick steps

- When you receive the Telegram notification, click the "Approve publish: pending-release-<tag>" button.
- That will open the "Run workflow" UI for the `publish_release.yml` workflow with the `artifact_name` field prefilled.
- Confirm the branch (`ref`) is correct (the UI should show the repo default branch). Click "Run workflow" to start the publish job.
- The publish job will post a completion message to Telegram with a link to the created Release.

Tips and troubleshooting

- If you don't have Telegram configured (secrets missing), the release job will still create the artifact. Use the Actions UI to run `publish_release.yml` manually and provide `artifact_name` (e.g., `pending-release-v1.2.3`).
- If the Approve button opens the UI but the `artifact_name` is not filled, copy the artifact name from the release run (or the release notification) into the inputs field.
- The publish workflow requires `GITHUB_TOKEN` (the default token is used for creating the release). Make sure the workflow has permission to create tags/releases.

Docker development notes

- The image installs a venv at `/opt/venv` and copies the app to `/opt/autoflow_Bot`.
- The container entrypoint runs freqtrade by default using `/opt/venv/bin/python`. You can override the command when running the container.
- For local development, use `docker-compose.override.yml` (example provided) to mount your code without overwriting the container venv.

Example: run the release workflow locally (quick smoke)

- Build the image locally:

  docker build -t autoflow:local .

- Run the container mapping your `user_data` and config:

  docker run --rm -v ${PWD}/user_data:/opt/autoflow_Bot/user_data -e FREQTRADE_CONFIG_PATH=/opt/autoflow_Bot/config.json autoflow:local

Contact

If you want me to add a programmatic one-click publish (via Actions API) I can implement that next — it requires a PAT with repo/workflow scope stored as a secret.

Auto-publish option

- The `release.yml` workflow now accepts an optional `auto_publish` input. If you set `auto_publish` to `true` and add a `PUBLISH_GITHUB_PAT` repository secret (a Personal Access Token with `repo` and `workflow` scopes), the release job will programmatically dispatch the `publish_release.yml` workflow on your default branch and pass the `artifact_name` input.
- When using auto-publish, the release job will also send a Telegram note pointing to the publish workflow runs page.

Telegram one-click publisher bot

- This repository includes a small bot (`telegram_publisher_bot.py`) that can perform a one-click publish when an approver taps the "One-click publish" inline button.
- Required repository secrets / env vars for the bot to run:
  - `TELEGRAM_BOT_TOKEN` - token for your Telegram Bot
  - `TELEGRAM_ADMIN_ID` - numeric Telegram user id allowed to approve
  - `PUBLISH_GITHUB_PAT` - Personal Access Token with `repo` and `workflow` scopes
  - `GITHUB_REPOSITORY` - owner/repo (e.g., `owner/repo`)

How it works:
- The `release.yml` job includes a callback button with `callback_data` set to `publish:pending-release-<tag>`.
- The bot long-polls Telegram for callback queries, validates the caller is `TELEGRAM_ADMIN_ID`, and then calls the Actions API to dispatch `publish_release.yml` with `artifact_name` set.

Run the bot with docker-compose:

  # ensure .env contains the required secrets
  docker compose up -d telegram-bot

Or run locally:

  TELEGRAM_BOT_TOKEN=... TELEGRAM_ADMIN_ID=... PUBLISH_GITHUB_PAT=... GITHUB_REPOSITORY=owner/repo python telegram_publisher_bot.py

Security note: Keep `PUBLISH_GITHUB_PAT` secret. The bot will only accept callbacks from the configured `TELEGRAM_ADMIN_ID`.
