#!/usr/bin/env python3
"""
discourse-colors.py  -  apply the Regarded Games palette to Discourse

Creates (or updates, if they already exist) two user-selectable color
schemes via the admin API:

  - "Regarded - Light"
  - "Regarded - Dark"

Colors ONLY. This does not touch layout, typography, components, or any
other site setting. Each scheme maps the front-end design blueprint tokens
onto Discourse's semantic color slots.

Usage:
  python3 discourse-colors.py

Reads credentials from .env.local in the current directory.
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

# Force UTF-8 output so the console doesn't crash on legacy code pages.
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

if not BASE or not API_KEY:
    print("ERROR: NEXT_PUBLIC_DISCOURSE_URL and DISCOURSE_API_KEY are required.")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
# Maps the Regarded Games blueprint tokens onto Discourse color-scheme slots.
# Hex values carry no leading '#': that is what the admin API expects.
#
# Discourse slot meanings:
#   secondary         main page background
#   primary           main body text
#   tertiary          links, primary buttons, active accents
#   quaternary        secondary accent
#   header_background  site header background
#   header_primary    site header text/icons
#   highlight         highlighted / selected rows
#   danger            destructive actions, errors
#   success           positive / confirmation states
#   love              likes

SCHEMES = {
    "Regarded - Light": {
        "base_scheme_id": "Light",
        "colors": {
            "secondary":         "F8F9FC",  # --color-bg
            "primary":           "161224",  # --color-text (deep midnight charcoal)
            "tertiary":          "6A1B9A",  # --color-purple
            "quaternary":        "D35400",  # --color-orange
            "header_background": "FFFFFF",  # --color-card
            "header_primary":    "161224",
            "highlight":         "D4AF37",  # --color-gold
            "danger":            "D32F2F",  # --color-red
            "success":           "00875A",  # --color-green
            "love":              "B8004F",  # --color-magenta
        },
    },
    "Regarded - Dark": {
        "base_scheme_id": "Dark",
        "colors": {
            "secondary":         "0D0B14",  # --color-bg (dark)
            "primary":           "FFFFFF",  # --color-text (dark): high-priority white
            "tertiary":          "9D4EDD",  # --color-purple (dark)
            "quaternary":        "FF8C00",  # --color-orange (dark)
            "header_background": "161322",  # --color-card (dark)
            "header_primary":    "FFFFFF",
            "highlight":         "FFC300",  # --color-gold (dark)
            "danger":            "FF3B69",  # --color-red (dark)
            "success":           "00F5A0",  # --color-green (dark)
            "love":              "D81B60",  # --color-magenta (dark)
        },
    },
}

# ---------------------------------------------------------------------------
# API helper (JSON body, rate-limit aware)
# ---------------------------------------------------------------------------

def api(method, path, payload=None, max_retries=5):
    url = BASE + path
    body = json.dumps(payload).encode() if payload is not None else None

    for attempt in range(max_retries + 1):
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Api-Key", API_KEY)
        req.add_header("Api-Username", API_USR)
        if payload is not None:
            req.add_header("Content-Type", "application/json")

        try:
            with urllib.request.urlopen(req) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_retries:
                retry_after = e.headers.get("Retry-After")
                wait_time = float(retry_after) if retry_after else min(2 ** attempt, 60)
                print(f"  Rate limited (429). Retrying in {wait_time:.1f}s "
                      f"(attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
                continue
            error_body = e.read().decode(errors="replace")
            try:
                return json.loads(error_body)
            except Exception:
                return {"_http_error": e.code, "_body": error_body[:200]}
        except Exception as e:
            return {"_error": str(e)}

# ---------------------------------------------------------------------------
# Apply schemes
# ---------------------------------------------------------------------------

def existing_schemes():
    """Return {name: scheme_dict} for all existing color schemes."""
    resp = api("GET", "/admin/color_schemes.json")
    if not isinstance(resp, list):
        print(f"  Could not list color schemes: {resp}")
        return {}
    return {s.get("name"): s for s in resp}

def build_colors(color_map):
    return [{"name": name, "hex": hex_value} for name, hex_value in color_map.items()]

def apply_scheme(name, spec, current):
    colors = build_colors(spec["colors"])
    payload = {
        "color_scheme": {
            "name": name,
            "base_scheme_id": spec["base_scheme_id"],
            "user_selectable": True,
            "colors": colors,
        }
    }

    if name in current:
        scheme_id = current[name]["id"]
        resp = api("PUT", f"/admin/color_schemes/{scheme_id}.json", payload)
        action = "updated"
    else:
        resp = api("POST", "/admin/color_schemes.json", payload)
        action = "created"

    ok = isinstance(resp, dict) and resp.get("id") and not resp.get("_http_error")
    if ok:
        print(f"  {name} -> {action} (id {resp['id']})")
    else:
        print(f"  {name} -> FAILED: {resp}")
    return ok

if __name__ == "__main__":
    print(f"Target: {BASE}")
    print("\n=== Applying Regarded color schemes ===")
    current = existing_schemes()
    for name, spec in SCHEMES.items():
        time.sleep(0.2)
        apply_scheme(name, spec, current)
    print("\nDone. Set the active scheme under Admin > Customize > Themes")
    print("(assign 'Regarded - Light' and 'Regarded - Dark' to your theme's")
    print("color palette / dark-mode palette).")
