#!/usr/bin/env python3
"""
Utility: fetch recent Telegram updates and print unique user ids and chat ids.
Usage:
  TELEGRAM_BOT_TOKEN=<token> python get_telegram_ids.py

This helps you discover your numeric Telegram id and chat ids for use in env/secrets.
"""
import os
import requests
import sys

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
if not TOKEN:
    print("TELEGRAM_BOT_TOKEN env var is required")
    sys.exit(1)

API = f"https://api.telegram.org/bot{TOKEN}"
try:
    r = requests.get(f"{API}/getUpdates")
    r.raise_for_status()
    data = r.json()
except Exception as e:
    print("Failed to fetch updates:", e)
    sys.exit(1)

users = set()
chats = set()
for update in data.get("result", []):
    # message
    if "message" in update:
        msg = update["message"]
        frm = msg.get("from")
        if frm:
            users.add((frm.get("id"), frm.get("username")))
        chat = msg.get("chat")
        if chat:
            chats.add((chat.get("id"), chat.get("title") or chat.get("username")))
    # callback_query
    if "callback_query" in update:
        cq = update["callback_query"]
        frm = cq.get("from")
        if frm:
            users.add((frm.get("id"), frm.get("username")))
        msg = cq.get("message")
        if msg and msg.get("chat"):
            ch = msg.get("chat")
            chats.add((ch.get("id"), ch.get("title") or ch.get("username")))

print("Users found (id, username):")
for u in sorted(users):
    print(u)
print()
print("Chats found (id, title_or_username):")
for c in sorted(chats):
    print(c)

print("\nIf you don't see expected updates, send a message to your bot or interact with the bot's message in Telegram, then run this script again.")
