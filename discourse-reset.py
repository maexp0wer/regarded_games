#!/usr/bin/env python3
"""
discourse-reset.py  —  wipe all non-admin Discourse data

Deletes:
  - All non-admin users (and their posts/topics)
  - All chat channels (hard delete: TRUNCATE, not the soft-delete API)
  - All non-automatic groups
  - All categories (except Uncategorized) via SSH → Docker Rails runner
  - ALL topics/posts, deleted or not (hard delete via PostDestroyer) — nothing on
    a dev instance is stock Discourse seed data, so nothing is preserved
  - Resets users/groups/categories/topics/posts id sequences to MAX(id)+1
  - Re-asserts admin on the ADMIN_WALLETS allowlist (SSO recreation drops it)

Keeps: system, discobot, any user with admin=True, automatic groups,
       Uncategorized category, and every wallet in ADMIN_WALLETS (protected
       from deletion even if its live admin flag was lost).

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
# Admin allowlist
# ---------------------------------------------------------------------------
# Wallet addresses that must ALWAYS be Discourse admins. These are:
#   1. Protected from deletion — delete_users() skips them even if their live
#      admin flag has been lost (e.g. deleted + recreated via SSO, which never
#      restores admin). Matching by wallet, not the live admin flag, is the
#      whole point: the flag is exactly what goes missing.
#   2. Re-asserted as admin at the end of a run by ensure_admins(), because a
#      user recreated through wallet SSO comes back as a plain TL0 user.
# Lowercase; the Discourse username IS the wallet address (see discourseSSO.ts).
ADMIN_WALLETS = {
    "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
}

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
    """Yield all deletable users: non-admin, non-system, and NOT in ADMIN_WALLETS.

    Allowlisted wallets are protected even when their live admin flag is missing —
    that flag is precisely what gets lost when an admin is deleted + recreated via
    SSO, so relying on it alone would let the next run delete a should-be admin.
    """
    page = 0
    while True:
        users = api("GET", f"/admin/users/list/active.json?page={page}")
        if not isinstance(users, list) or not users:
            break
        found = False
        for u in users:
            if u.get("admin") or u["id"] <= 0:
                continue
            if (u.get("username") or "").lower() in ADMIN_WALLETS:
                continue
            yield u
            found = True
        if not found:
            break
        page += 1

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

def ssh_rails_runner(ruby_script, timeout=120):
    """Run a Ruby script inside the app container via SSH → Rails runner.

    The script is base64-encoded before transport so it can contain arbitrary
    characters without shell-quoting hazards. `rails runner -` reads from stdin
    (Rails 5.1+). Returns True if the SSH command was dispatched, False if
    paramiko is unavailable.
    """
    try:
        import paramiko
    except ImportError:
        print("  paramiko not installed — skipping SSH step")
        print("  Install with: pip install paramiko")
        return False

    import base64

    encoded = base64.b64encode(ruby_script.encode()).decode()
    cmd = (
        f"echo '{SSH_PASS}' | sudo -S docker exec -u discourse app bash -c "
        f"'cd /var/www/discourse && echo {encoded} | base64 -d | RAILS_ENV=production bundle exec rails runner -'"
        f" 2>&1"
    )

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS)
    _, stdout, _ = client.exec_command(cmd, timeout=timeout)
    for line in stdout:
        print(f"  {line.rstrip()}")
    client.close()
    return True

def ssh_rails_truncate_chat():
    # The chat API's DELETE only SOFT-deletes channels (sets deleted_at); the rows
    # stay, so MAX(id) never drops and the sequence can't restart low. To get chat
    # channels back to id 1 we hard-TRUNCATE every chat table. RESTART IDENTITY
    # resets chat_channels_id_seq (and siblings) to 1 in the same statement; CASCADE
    # follows FKs. Tables are listed explicitly (not left to CASCADE discovery) so
    # the wipe is deterministic. This is destructive and irreversible — all channels,
    # messages, threads, reactions, drafts, and memberships are removed.
    chat_tables = [
        "chat_channel_archives", "chat_channel_custom_fields", "chat_channels",
        "chat_drafts", "chat_mention_notifications", "chat_mentions",
        "chat_message_custom_fields", "chat_message_custom_prompts",
        "chat_message_interactions", "chat_message_links", "chat_message_reactions",
        "chat_message_revisions", "chat_message_search_data", "chat_messages",
        "chat_pinned_messages", "chat_thread_custom_fields", "chat_threads",
        "chat_webhook_events", "user_chat_channel_memberships",
    ]
    table_list = ", ".join(f"public.{t}" for t in chat_tables)
    ruby_script = (
        'begin; '
        f'ActiveRecord::Base.connection.execute("TRUNCATE {table_list} RESTART IDENTITY CASCADE"); '
        'nxt = ActiveRecord::Base.connection.select_value("SELECT last_value FROM public.chat_channels_id_seq"); '
        'puts "Truncated chat tables. chat_channels next id -> #{nxt}"; '
        'rescue => e; puts "TRUNCATE ERROR -> #{e.message}"; end; '
        'puts "Done"'
    )
    ssh_rails_runner(ruby_script)

def ssh_rails_delete_categories():
    ruby_script = (
        'cats = Category.where.not(id: SiteSetting.uncategorized_category_id).order(parent_category_id: :desc); '
        'cats.each do |c|; '
        'Topic.where(category_id: c.id).find_each { |t| t.destroy! rescue nil }; '
        'begin; c.destroy!; puts "Deleted: " + c.name; '
        'rescue => e; puts "Error: " + c.name + " -> " + e.message; end; end; '
        'puts "Done"'
    )
    ssh_rails_runner(ruby_script)

def ssh_rails_purge_all_topics():
    # PostDestroyer.new(..., force_destroy: true).destroy was tried first (mirrors
    # ssh_rails_delete_categories()'s Topic#destroy! pattern) but silently no-ops on
    # these system-authored (user_id -1) topics — no exception, deleted_at stays
    # nil. Rather than reverse-engineer PostDestroyer's guard clauses, this uses raw
    # SQL instead, scoped ONLY to these specific topic/post ids (never a blanket
    # TRUNCATE of the topics/posts tables, which also hold real content).
    #
    # Discourse doesn't declare real Postgres FKs for topic_id/post_id (checked:
    # only `polls` has a declared FK) — dependents are Rails-side by naming
    # convention only. So rather than hand-list tables (error-prone, version-
    # fragile), this discovers every table with a topic_id or post_id column via
    # information_schema at runtime and deletes matching rows from each before
    # deleting the posts, then the topics.
    #
    # Purges EVERY topic AND EVERY post — both already soft-deleted ones and the
    # remaining "live" ones, INCLUDING posts left orphaned by topics deleted before
    # this script ever ran (posts whose topic_id points at nothing) — because none
    # of what's left is stock Discourse install data. Verified by created_at: all
    # 28 surviving topics were created 2026-05-29..2026-07-08 (spread over weeks —
    # real Discourse seed data shares one install timestamp), and all are user_id
    # -1 (system) private messages: daily "Backup failed" cron failures, "Account
    # (temporarily) on/off hold" churn from repeated user delete/recreate test
    # cycles, and a "Downloading remote images disabled" self-notice. None of it is
    # admin-authored forum content, so nothing is preserved. post_ids is taken from
    # ALL posts directly (not derived from topic_ids) specifically to sweep up
    # those pre-existing orphans too.
    # Deletes are retried in a self-healing loop: if a DELETE fails on an FK
    # violation from a table not yet targeted (e.g. `polls` blocked by
    # `poll_options`/`poll_votes`, a 2-hop dependency this discovery pass doesn't
    # see up front since it only scans for topic_id/post_id columns), the
    # blocking child table + column is looked up via information_schema and
    # queued for deletion first, then the whole pass retries. The final
    # `posts`/`topics` deletes are themselves jobs in this same loop (not run
    # unguarded afterward) since they're just as exposed to the same class of
    # not-yet-discovered FK. Runs until nothing fails or nothing changes
    # (safety cap 10 passes).
    ruby_script = (
        'conn = ActiveRecord::Base.connection; '
        'def fk_child_for(conn, parent_table); '
        '  sql = "SELECT tc.table_name AS child, kcu.column_name AS fk_col '
        'FROM information_schema.table_constraints tc '
        'JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema '
        'JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema '
        'WHERE tc.constraint_type = \'FOREIGN KEY\' AND ccu.table_name = \'#{parent_table}\' AND tc.table_schema=\'public\'"; '
        '  conn.select_all(sql).to_a; '
        'end; '
        'topic_ids = Topic.unscoped.pluck(:id); '
        'post_ids = Post.unscoped.pluck(:id); '
        'puts "Target: " + topic_ids.size.to_s + " topics, " + post_ids.size.to_s + " posts"; '
        'topic_id_list = topic_ids.join(","); '
        'post_id_list = post_ids.join(","); '
        'jobs = []; '
        'if topic_ids.any?; '
        'topic_tables = conn.select_values('
        '"SELECT table_name FROM information_schema.columns WHERE column_name = \'topic_id\' '
        'AND table_schema = \'public\' AND table_name NOT IN (\'topics\',\'posts\',\'categories\')"); '
        'topic_tables.each { |tbl| jobs << ["public.#{tbl}", "topic_id", topic_id_list] }; '
        'end; '
        'if post_ids.any?; '
        'post_tables = conn.select_values('
        '"SELECT table_name FROM information_schema.columns WHERE column_name = \'post_id\' '
        'AND table_schema = \'public\' AND table_name NOT IN (\'topics\',\'posts\')"); '
        'post_tables.each { |tbl| jobs << ["public.#{tbl}", "post_id", post_id_list] }; '
        'end; '
        # The posts/topics deletes themselves must be retried through the exact
        # same self-healing loop as the dependent tables — they are exactly as
        # likely to hit a not-yet-discovered FK (this is literally what happened:
        # `posts` blocked by `polls`, discovered fine, but `polls` itself then
        # blocked by `poll_options`/`poll_votes`, a 2-hop dependency). An earlier
        # version ran these two deletes after the loop, unguarded — any FK
        # violation there crashed the whole script uncaught.
        'if post_ids.any?; jobs << ["public.posts", "id", post_id_list]; end; '
        'if topic_ids.any?; jobs << ["public.topics", "id", topic_id_list]; end; '
        'pass = 0; '
        'begin; '
        'pass += 1; '
        'progressed = false; '
        'still_pending = []; '
        'jobs.each do |tbl, col, id_list|; '
        'begin; '
        'n = conn.exec_delete("DELETE FROM #{tbl} WHERE #{col} IN (#{id_list})"); '
        'puts "  #{tbl}: deleted #{n} rows (#{col})" if n > 0; '
        'progressed ||= true; '
        'rescue ActiveRecord::InvalidForeignKey => e; '
        'msg = e.message; '
        'blocking = msg[/on table "(\\w+)"/, 1]; '
        'bare = tbl.sub("public.", ""); '
        'if blocking; '
        'fk_child_for(conn, bare).each do |row|; '
        'jobs << ["public.#{row[\'child\']}", row[\'fk_col\'], "SELECT id FROM #{tbl} WHERE #{col} IN (#{id_list})"]; '
        'end; '
        'end; '
        'still_pending << [tbl, col, id_list]; '
        'rescue => e; puts "  #{tbl}: SKIP (#{e.message.lines.first.strip})"; end; end; '
        'jobs = still_pending; '
        'end while jobs.any? && progressed && pass < 10; '
        'jobs.each { |tbl, col, _| puts "  #{tbl}: gave up after #{pass} passes" }; '
        'puts "Purged " + topic_ids.size.to_s + " topics, " + post_ids.size.to_s + " posts"; '
        'puts "Done"'
    )
    ssh_rails_runner(ruby_script, timeout=300)

def ssh_rails_reset_sequences():
    # For each table, set its identity/serial sequence so the NEXT id handed out
    # is MAX(surviving id) + 1. pg_get_serial_sequence resolves the sequence name
    # per table. setval(seq, N, false) means "the next nextval() returns N".
    # COALESCE(...,0)+1 → next id 1 when the table is empty.
    # (chat_channels is handled by ssh_rails_truncate_chat via TRUNCATE RESTART IDENTITY.)
    #
    # MUST run AFTER all deletions so MAX(id) reflects only survivors (admins keep
    # their ids; new users therefore start at highest-admin-id + 1, as intended).
    ruby_script = (
        'tables = [["users","id"],["groups","id"],["categories","id"],["topics","id"],["posts","id"]]; '
        'tables.each do |table, col|; '
        'begin; '
        'ActiveRecord::Base.connection.execute('
        '"SELECT setval(pg_get_serial_sequence(\'#{table}\', \'#{col}\'), '
        'COALESCE((SELECT MAX(#{col}) FROM #{table}), 0) + 1, false)"); '
        'nxt = ActiveRecord::Base.connection.select_value("SELECT MAX(#{col}) FROM #{table}").to_i + 1; '
        'puts "#{table}: next id -> #{nxt}"; '
        'rescue => e; puts "#{table}: ERROR -> #{e.message}"; end; end; '
        'puts "Done"'
    )
    ssh_rails_runner(ruby_script)

def ssh_rails_ensure_admins(wallets):
    # Re-assert admin on the allowlisted wallets. A user deleted + recreated via
    # wallet SSO comes back as a plain TL0 user (SSO carries no admin flag — see
    # discourseSSO.ts), so without this step the reset silently demotes admins.
    # grant_admin! is Discourse's proper path (adds them to the `admins` automatic
    # group + logs the staff action), unlike a raw column update. Only touches
    # users that already exist — a wallet that has never logged in is skipped
    # (nothing to grant until they SSO in at least once).
    if not wallets:
        print("  ADMIN_WALLETS is empty — nothing to ensure.")
        return
    # Ruby array literal of lowercased wallet usernames.
    ruby_list = "[" + ", ".join('"%s"' % w.lower() for w in wallets) + "]"
    ruby_script = (
        f'wallets = {ruby_list}; '
        'wallets.each do |w|; '
        'begin; '
        'u = User.find_by("lower(username) = ?", w); '
        'if u.nil?; puts "  " + w + ": not found (never logged in?) — skipped"; '
        'else; '
        'u.grant_admin! unless u.admin?; '
        'u.change_trust_level!(TrustLevel[4]) if u.trust_level < 4; '
        'u.reload; '
        'puts "  " + w + ": admin=" + u.admin.to_s + " tl=" + u.trust_level.to_s; '
        'end; '
        'rescue => e; puts "  " + w + ": ERROR -> " + e.message; end; end; '
        'puts "Done"'
    )
    ssh_rails_runner(ruby_script)

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
    # The chat API only soft-deletes (leaves rows, keeps MAX(id) high), so we hard-
    # TRUNCATE the chat tables over SSH instead. This resets chat_channels to id 1.
    section("Truncating chat tables via SSH → Rails runner")
    if not SSH_HOST or not SSH_USER:
        print("  SSH credentials missing — skipping.")
        return
    ssh_rails_truncate_chat()

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

def purge_all_topics():
    # Hard-deletes ALL topics/posts (both already-soft-deleted and any still live) —
    # nothing on this instance is stock Discourse seed data, it's all runtime noise
    # (backup-failure cron PMs, account-hold churn, etc.), see
    # ssh_rails_purge_all_topics() for the created_at/user_id evidence.
    # Must run after delete_categories() (which soft/hard-deletes its own
    # category-intro topics first) and before reset_sequences() (which needs
    # MAX(id) to reflect only what survives this purge — i.e. nothing, so topics
    # and posts both restart at id 1).
    section("Purging ALL topics/posts via SSH → Rails runner")
    if not SSH_HOST or not SSH_USER:
        print("  SSH credentials missing — skipping.")
        return
    ssh_rails_purge_all_topics()

def reset_sequences():
    section("Resetting id sequences via SSH → Rails runner")
    if not SSH_HOST or not SSH_USER:
        print("  SSH credentials missing — skipping.")
        return
    ssh_rails_reset_sequences()

def ensure_admins():
    # Re-grant admin to the ADMIN_WALLETS allowlist (see safeguard notes there).
    section("Ensuring admin wallets via SSH → Rails runner")
    if not SSH_HOST or not SSH_USER:
        print("  SSH credentials missing — skipping.")
        return
    ssh_rails_ensure_admins(ADMIN_WALLETS)

if __name__ == "__main__":
    print(f"Target: {BASE}")
    delete_users()
    delete_channels()
    delete_groups()
    delete_categories()
    purge_all_topics()  # after categories: hard-deletes every remaining topic/post
    reset_sequences()  # MUST be last: uses MAX(id) of surviving rows
    ensure_admins()    # re-assert admin on the allowlist (SSO recreation drops it)
    print("\nDone.")
