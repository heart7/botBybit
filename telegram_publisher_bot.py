#!/usr/bin/env python3
"""
A minimal Telegram bot that listens for callback queries with callback_data
in the form `publish:pending-release-<tag>` and dispatches the `publish_release.yml`
workflow via the GitHub Actions API.

Environment variables required:
- TELEGRAM_BOT_TOKEN: Telegram bot token
- TELEGRAM_ADMIN_ID: numeric chat id allowed to trigger publish (string or int)
- PUBLISH_GITHUB_PAT: GitHub PAT with repo+workflow scopes
- GITHUB_REPOSITORY: owner/repo

Run this in a container or as a long-running process.
"""
import os
import time
import json
import logging
import requests
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_ID = os.environ.get("TELEGRAM_ADMIN_ID")
PUBLISH_GITHUB_PAT = os.environ.get("PUBLISH_GITHUB_PAT")
GITHUB_REPOSITORY = os.environ.get("GITHUB_REPOSITORY")

if not TELEGRAM_BOT_TOKEN:
    logger.error("TELEGRAM_BOT_TOKEN is required")
    raise SystemExit(1)
if not TELEGRAM_ADMIN_ID:
    logger.error("TELEGRAM_ADMIN_ID is required")
    raise SystemExit(1)
if not PUBLISH_GITHUB_PAT:
    logger.error("PUBLISH_GITHUB_PAT is required")
    raise SystemExit(1)
if not GITHUB_REPOSITORY:
    logger.error("GITHUB_REPOSITORY is required")
    raise SystemExit(1)

TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
OFFSET_FILE = ".telegram_offset"


def save_update_offset(offset: int):
    try:
        with open(OFFSET_FILE, "w") as f:
            f.write(str(offset))
    except Exception:
        pass


def load_update_offset() -> Optional[int]:
    try:
        with open(OFFSET_FILE, "r") as f:
            return int(f.read().strip())
    except Exception:
        return None


def answer_callback(query_id: str, text: str = "", show_alert: bool = False):
    url = f"{TELEGRAM_API}/answerCallbackQuery"
    resp = requests.post(url, json={"callback_query_id": query_id, "text": text, "show_alert": show_alert})
    logger.debug("answerCallbackQuery: %s", resp.text)
    return resp


def send_message(chat_id: str, text: str):
    url = f"{TELEGRAM_API}/sendMessage"
    resp = requests.post(url, json={"chat_id": chat_id, "text": text})
    logger.debug("sendMessage: %s", resp.text)
    return resp


def dispatch_publish(artifact_name: str) -> bool:
    # Resolve default branch from GitHub API
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
    logger.info("Dispatched publish workflow for %s on ref=%s, status=%s, resp=%s", artifact_name, default_branch, r.status_code, r.text)
    return r.status_code in (200, 204)


def main_loop():
    offset = load_update_offset()
    logger.info("Starting telegram poll loop, repo=%s", GITHUB_REPOSITORY)
    while True:
        params = {"timeout": 60}
        if offset:
            params["offset"] = offset
        try:
            r = requests.get(f"{TELEGRAM_API}/getUpdates", params=params, timeout=70)
            data = r.json()
            for update in data.get("result", []):
                offset = update["update_id"] + 1
                save_update_offset(offset)
                # handle callback_query
                if "callback_query" in update:
                    cq = update["callback_query"]
                    query_id = cq.get("id")
                    from_id = str(cq.get("from", {}).get("id"))
                    data_field = cq.get("data")
                    chat_id = str(cq.get("from", {}).get("id"))
                    logger.info("Callback from %s: %s", from_id, data_field)
                    if not data_field:
                        answer_callback(query_id, "No callback data provided", show_alert=True)
                        continue
                    if not from_id == str(TELEGRAM_ADMIN_ID):
                        answer_callback(query_id, "Unauthorized", show_alert=True)
                        send_message(TELEGRAM_ADMIN_ID, f"Unauthorized publish attempt from {from_id}")
                        continue
                    # expected format: publish:pending-release-<tag>
                    if data_field.startswith("publish:"):
                        artifact = data_field.split("publish:", 1)[1]
                        answer_callback(query_id, f"Publishing {artifact}...", show_alert=False)
                        success = dispatch_publish(artifact)
                        if success:
                            send_message(TELEGRAM_ADMIN_ID, f"Publish dispatched for {artifact}")
                        else:
                            send_message(TELEGRAM_ADMIN_ID, f"Failed to dispatch publish for {artifact}")
                    else:
                        answer_callback(query_id, "Unknown callback", show_alert=True)
        except requests.exceptions.RequestException as e:
            logger.exception("Network error while polling Telegram: %s", e)
            time.sleep(5)
        except Exception:
            logger.exception("Unexpected error in poll loop")
            time.sleep(5)


if __name__ == "__main__":
    main_loop()
