#!/usr/bin/env python3
"""
discourse-reset.py  —  wipe all non-admin Discourse data

Deletes:
  - All non-admin users (and their posts/topics)
  - All chat channels
  - All non-automatic groups
  - All categories (except Uncategorized) via SSH → Docker Rails runner

Keeps: system, discobot, any user with admin=True, automatic groups.

Usage:
  python3 discourse-reset.py

Reads credentials from .env.local in the current directory.
"""

import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

# Force UTF-8 output so non-ASCII characters (→, ⚠, ⏳, ❌) in log lines don't
# crash on Windows consoles using the legacy cp1252 code page.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

# ---------------------------------------------------------------------------
# Load .env.local
# ---------------------------------------------------------------------------

def load_env(path=".env.local"):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                m = re.match(r'^([A-Z0-9_]+)\s*=\s*"?([^"]*)"?$', line)
                if m:
                    env[m.group(1)] = m.group(2)
    except FileNotFoundError:
        print(f"ERROR: {path} not found. Run from project root.")
        sys.exit(1)
    return env

env = load_env()

BASE    = env.get("NEXT_PUBLIC_DISCOURSE_URL", "").rstrip("/")
API_KEY = env.get("DISCOURSE_API_KEY", "")
API_USR = env.get("DISCOURSE_API_USERNAME", "system")
SSH_HOST = env.get("DISCOURSE_SSH_HOST", "")
SSH_PORT = int(env.get("DISCOURSE_SSH_PORT", "22"))
SSH_USER = env.get("DISCOURSE_SSH_USERNAME", "")
SSH_PASS = env.get("DISCOURSE_SSH_PASSWORD", "")

if not BASE or not API_KEY:
    print("ERROR: NEXT_PUBLIC_DISCOURSE_URL and DISCOURSE_API_KEY are required.")
    sys.exit(1)

# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def api(method, path, data=None, max_retries=5):
    """Make API request with automatic rate limit detection and retry.

    Returns JSON response on success, or dict with '_http_error' and '_body' on failure.
    Automatically retries on 429 (Too Many Requests) with exponential backoff.
    """
    url = BASE + path
    body = urllib.parse.urlencode(data).encode() if data else None

    for attempt in range(max_retries + 1):
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Api-Key", API_KEY)
        req.add_header("Api-Username", API_USR)
        if data:
            req.add_header("Content-Type", "application/x-www-form-urlencoded")

        try:
            with urllib.request.urlopen(req) as resp:
                resp_data = json.loads(resp.read())

                # Check for rate limit warnings in headers
                remaining = resp.headers.get("X-RateLimit-Remaining")
                if remaining is not None and int(remaining) < 10:
                    print(f"  ⚠️  Rate limit warning: {remaining} requests remaining")

                return resp_data

        except urllib.error.HTTPError as e:
            # Handle 429 (Too Many Requests)
            if e.code == 429:
                if attempt < max_retries:
                    # Check for Retry-After header, default to exponential backoff
                    retry_after = e.headers.get("Retry-After")
                    if retry_after:
                        wait_time = float(retry_after)
                    else:
                        wait_time = min(2 ** attempt, 60)  # Exponential backoff, max 60s

                    print(f"  ⏳ Rate limited (429). Retrying in {wait_time:.1f}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                else:
                    error_body = e.read().decode(errors="replace")
                    print(f"  ❌ Rate limited after {max_retries} retries. Aborting.")
                    return {"_http_error": 429, "_body": error_body[:200]}

            # Handle other HTTP errors
            error_body = e.read().decode(errors="replace")
            try:
                return json.loads(error_body)
            except Exception:
                return {"_http_error": e.code, "_body": error_body[:200]}

        except Exception as e:
            # Network or other errors
            return {"_error": str(e)}

def throttle(delay=0.1):
    """Sleep for a short delay to rate-limit API requests."""
    time.sleep(delay)

def paginated_users():
    """Yield all non-admin, non-system users."""
    page = 0
    while True:
        users = api("GET", f"/admin/users/list/active.json?page={page}")
        if not isinstance(users, list) or not users:
            break
        found = False
        for u in users:
            if not u.get("admin") and u["id"] > 0:
                yield u
                found = True
        if not found:
            break
        page += 1

def all_channels():
    resp = api("GET", "/chat/api/channels?page=0&page_size=100")
    return resp.get("channels", [])

def all_custom_groups():
    groups = []
    page = 0
    while True:
        resp = api("GET", f"/groups.json?page={page}")
        batch = resp.get("groups", [])
        if not batch:
            break
        for g in batch:
            if not g.get("automatic"):
                groups.append(g)
        page += 1
    return groups

# ---------------------------------------------------------------------------
# SSH helper (paramiko)
# ---------------------------------------------------------------------------

def ssh_rails_delete_categories():
    try:
        import paramiko
    except ImportError:
        print("  paramiko not installed — skipping SSH category deletion")
        print("  Install with: pip install paramiko")
        return

    import base64

    ruby_script = (
        'cats = Category.where.not(id: SiteSetting.uncategorized_category_id).order(parent_category_id: :desc); '
        'cats.each do |c|; '
        'Topic.where(category_id: c.id).find_each { |t| t.destroy! rescue nil }; '
        'begin; c.destroy!; puts "Deleted: " + c.name; '
        'rescue => e; puts "Error: " + c.name + " -> " + e.message; end; end; '
        'puts "Done"'
    )
    encoded = base64.b64encode(ruby_script.encode()).decode()
    # Base64 contains no shell-special characters, so quoting is unambiguous.
    # `rails runner -` reads the script from stdin (Rails 5.1+).
    cmd = (
        f"echo '{SSH_PASS}' | sudo -S docker exec -u discourse app bash -c "
        f"'cd /var/www/discourse && echo {encoded} | base64 -d | RAILS_ENV=production bundle exec rails runner -'"
        f" 2>&1"
    )

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS)
    _, stdout, _ = client.exec_command(cmd, timeout=120)
    for line in stdout:
        print(f"  {line.rstrip()}")
    client.close()

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def section(title):
    print(f"\n=== {title} ===")

def delete_users():
    section("Deleting non-admin users")
    users = list(paginated_users())
    if not users:
        print("  No non-admin users found.")
        return
    for u in users:
        throttle(0.2)  # 200ms between user deletions
        resp = api("DELETE", f"/admin/users/{u['id']}.json",
                   {"delete_posts": "true", "block_email": "false", "block_ip": "false"})
        ok = resp.get("deleted") or resp.get("success")
        print(f"  [{u['id']}] {u['username']} → {'OK' if ok else resp}")

def delete_channels():
    section("Deleting chat channels")
    channels = all_channels()
    if not channels:
        print("  No channels found.")
        return
    for ch in channels:
        throttle(0.15)  # 150ms between channel deletions
        resp = api("DELETE", f"/chat/api/channels/{ch['id']}")
        ok = resp.get("success") == "OK"
        print(f"  [{ch['id']}] {ch.get('title','?')} → {'OK' if ok else resp}")

def delete_groups():
    section("Deleting custom groups")
    groups = all_custom_groups()
    if not groups:
        print("  No custom groups found.")
        return
    for g in groups:
        throttle(0.15)  # 150ms between group deletions
        resp = api("DELETE", f"/admin/groups/{g['id']}.json")
        ok = resp.get("success") == "OK"
        print(f"  [{g['id']}] {g['name']} → {'OK' if ok else resp}")

def delete_categories():
    section("Deleting categories via SSH → Rails runner")
    if not SSH_HOST or not SSH_USER:
        print("  SSH credentials missing — skipping.")
        return
    ssh_rails_delete_categories()

if __name__ == "__main__":
    print(f"Target: {BASE}")
    delete_users()
    delete_channels()
    delete_groups()
    delete_categories()
    print("\nDone.")
