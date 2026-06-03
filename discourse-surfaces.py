#!/usr/bin/env python3
"""
discourse-surfaces.py  -  recolor Discourse UI to the design blueprint

Installs (or updates) a Discourse theme COMPONENT named "Regarded - UI Colors"
that recolors elements the color scheme alone cannot reach, WITHOUT changing
any layout, spacing, typography, or component structure. Colors only.

It covers:

  1. Two-tier borders + muted text (variables Discourse derives as grayscale):
                       Light       Dark
     --color-border    #E2E8F0     #251F3D   -> --primary-low
     --color-border2   #CBD5E1     #4C3F7A   -> --primary-low-mid
     --color-text2     #655E85     #9E97BD   -> --primary-medium / -high

  2. Side panel navbar (sidebar): active tab + hover render as an opaque
     project-purple fill (the scheme's `tertiary` slot), with the foreground
     set to `--secondary` so contrast flips correctly between light and dark.

Borders are purple-tinted in dark mode and neutral slate in light mode -- not
derivable by one formula -- so they are pinned per mode via
`@media (prefers-color-scheme: ...)`, matching how Discourse serves its own
auto light/dark palettes. (Assumes the interface color setting is "auto".)

Usage:
  python3 discourse-surfaces.py

Reads credentials from .env.local in the current directory.
"""

import json
import re
import sys
import time
import urllib.request
import urllib.error

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

COMPONENT_NAME = "Regarded - UI Colors"
# Earlier names this component shipped under; found-and-renamed in place so a
# rerun never leaves a stale duplicate.
PRIOR_NAMES = ["Regarded - Borders & Text"]

# ---------------------------------------------------------------------------
# UI color CSS  (colors only; mode-aware where Discourse derives shades)
# ---------------------------------------------------------------------------

SURFACES_SCSS = """
/* Regarded Games - UI color overrides. Colors only; default layout. */
:root {
  /* Tier-1 / Tier-2 structural borders (--color-border / --color-border2) */
  --primary-low: #E2E8F0;
  --primary-low-mid: #CBD5E1;
  /* Muted labels / timestamps / metadata (--color-text2) */
  --primary-medium: #655E85;
  --primary-high: #655E85;

  /* Side panel navbar: active tab + hover = opaque project purple */
  --d-sidebar-highlight-background: var(--tertiary);
  --d-sidebar-highlight-hover-background: var(--tertiary);
  --d-sidebar-hover-background: var(--tertiary);
}

@media (prefers-color-scheme: dark) {
  :root {
    --primary-low: #251F3D;
    --primary-low-mid: #4C3F7A;
    --primary-medium: #9E97BD;
    --primary-high: #9E97BD;
  }
}

/* Sidebar active tab + hover: opaque purple fill, contrast-safe foreground.
   Foreground uses --secondary so it stays light-on-purple (light mode) and
   dark-on-purple (dark mode). */
.sidebar-section-link-wrapper .sidebar-section-link.active,
.sidebar-section-link-wrapper .sidebar-section-link.active:hover,
.sidebar-section-link-wrapper .sidebar-section-link:hover,
.sidebar-section-link.active,
.sidebar-section-link:hover {
  background: var(--tertiary) !important;
  color: var(--secondary) !important;

  .sidebar-section-link-content-text,
  .sidebar-section-link-content-badge,
  .sidebar-section-link-prefix,
  .sidebar-section-link-suffix,
  .prefix-icon,
  .d-icon {
    color: var(--secondary) !important;
  }
}
"""

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
# Theme helpers
# ---------------------------------------------------------------------------

def list_themes():
    resp = api("GET", "/admin/themes.json")
    if isinstance(resp, dict):
        return resp.get("themes", [])
    return []

def find_by_names(themes, names):
    for name in names:
        for t in themes:
            if t.get("name") == name:
                return t
    return None

def find_default(themes):
    for t in themes:
        if t.get("default"):
            return t
    return None

def upsert_component(existing):
    field = {"target": "common", "name": "scss", "value": SURFACES_SCSS}
    payload = {
        "theme": {
            "name": COMPONENT_NAME,  # renames in place if found under a prior name
            "component": True,
            "theme_fields": [field],
        }
    }
    if existing:
        resp = api("PUT", f"/admin/themes/{existing['id']}.json", payload)
        action = "renamed/updated" if existing.get("name") != COMPONENT_NAME else "updated"
    else:
        resp = api("POST", "/admin/themes.json", payload)
        action = "created"

    theme = resp.get("theme") if isinstance(resp, dict) else None
    if theme and theme.get("id"):
        print(f"  Component '{COMPONENT_NAME}' -> {action} (id {theme['id']})")
        return theme["id"]
    print(f"  Component upsert FAILED: {resp}")
    return None

def existing_child_ids(theme_detail):
    children = theme_detail.get("childThemes") or theme_detail.get("child_themes") or []
    ids = []
    for c in children:
        if isinstance(c, dict) and c.get("id"):
            ids.append(c["id"])
        elif isinstance(c, int):
            ids.append(c)
    return ids

def attach_to_default(component_id):
    parent = find_default(list_themes())
    if not parent:
        print("  No default theme found; attach the component manually under "
              "Admin > Customize > Themes.")
        return
    detail = api("GET", f"/admin/themes/{parent['id']}.json")
    parent_detail = detail.get("theme", {}) if isinstance(detail, dict) else {}
    child_ids = existing_child_ids(parent_detail)
    if component_id in child_ids:
        print(f"  Already attached to default theme '{parent['name']}'.")
        return
    child_ids.append(component_id)
    resp = api("PUT", f"/admin/themes/{parent['id']}.json",
               {"theme": {"child_theme_ids": child_ids}})
    if isinstance(resp, dict) and resp.get("theme"):
        print(f"  Attached to default theme '{parent['name']}'.")
    else:
        print(f"  Attach FAILED: {resp}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print(f"Target: {BASE}")
    print(f"\n=== Installing '{COMPONENT_NAME}' theme component ===")
    existing = find_by_names(list_themes(), [COMPONENT_NAME] + PRIOR_NAMES)
    component_id = upsert_component(existing)
    if component_id:
        time.sleep(0.2)
        attach_to_default(component_id)
    print("\nDone.")
