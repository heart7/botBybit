#!/usr/bin/env python3
"""
A webhook-based Telegram bot using Flask.
- Expects POST updates from Telegram to /webhook
- Verifies callback queries come from TELEGRAM_ADMIN_ID
- Dispatches publish_release.yml using PUBLISH_GITHUB_PAT and repo default branch

Env vars required:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_ADMIN_ID
- PUBLISH_GITHUB_PAT
- GITHUB_REPOSITORY
- WEBHOOK_SECRET (optional secret path segment to harden webhook)
"""
import os
import logging
from flask import Flask, request, abort
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_ID = os.environ.get("TELEGRAM_ADMIN_ID")
PUBLISH_GITHUB_PAT = os.environ.get("PUBLISH_GITHUB_PAT")
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY")
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")

if not TELEGRAM_BOT_TOKEN or not TELEGRAM_ADMIN_ID or not PUBLISH_GITHUB_PAT or not GITHUB_REPOSITORY:
    logger.error("Required env vars missing")
    raise SystemExit(1)

TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
app = Flask(__name__)


def dispatch_publish(artifact_name: str) -> bool:
    # Resolve default branch
    repo_api = f"https://api.github.com/repos/{GITHUB_REPOSITORY}"
    headers = {"Authorization": f"token {PUBLISH_GITHUB_PAT}", "Accept": "application/vnd.github+json"}
    try:
        resp = requests.get(repo_api, headers=headers, timeout=10)
        default_branch = resp.json().get("default_branch") if resp.ok else None
    except Exception:
        default_branch = None
    if not default_branch:
        default_branch = "main"
    api = f"https://api.github.com/repos/{GITHUB_REPOSITORY}/actions/workflows/publish_release.yml/dispatches"
    payload = {"ref": default_branch, "inputs": {"artifact_name": artifact_name}}
    r = requests.post(api, json=payload, headers=headers)
    logger.info("Dispatched publish workflow for %s on ref=%s, status=%s", artifact_name, default_branch, r.status_code)
    return r.status_code in (200, 204)


@app.route(f"/webhook{('/' + WEBHOOK_SECRET) if WEBHOOK_SECRET else ''}", methods=["POST"])
def webhook():
    data = request.get_json(force=True)
    if not data:
        abort(400)
    # Handle callback_query
    if "callback_query" in data:
        cq = data["callback_query"]
        from_id = str(cq.get("from", {}).get("id"))
        query_id = cq.get("id")
        data_field = cq.get("data")
        if from_id != str(TELEGRAM_ADMIN_ID):
            # answer callback
            requests.post(f"{TELEGRAM_API}/answerCallbackQuery", json={"callback_query_id": query_id, "text": "Unauthorized", "show_alert": True})
            requests.post(f"{TELEGRAM_API}/sendMessage", json={"chat_id": TELEGRAM_ADMIN_ID, "text": f"Unauthorized publish attempt from {from_id}"})
            return ("", 200)
        if data_field and data_field.startswith("publish:"):
            artifact = data_field.split("publish:", 1)[1]
            requests.post(f"{TELEGRAM_API}/answerCallbackQuery", json={"callback_query_id": query_id, "text": f"Publishing {artifact}..."})
            success = dispatch_publish(artifact)
            if success:
                requests.post(f"{TELEGRAM_API}/sendMessage", json={"chat_id": TELEGRAM_ADMIN_ID, "text": f"Publish dispatched for {artifact}"})
            else:
                requests.post(f"{TELEGRAM_API}/sendMessage", json={"chat_id": TELEGRAM_ADMIN_ID, "text": f"Failed to dispatch publish for {artifact}"})
            return ("", 200)
    return ("", 200)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
