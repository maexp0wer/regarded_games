# Launch Checklist

Step-by-step guide for launching a new season. Run through these in order.

---

## 1. Configure Environment

Copy `.env.example` to `.env.local` and fill in all values:

```
DISCOURSE_INIT_SECRET=<strong random secret>
DISCOURSE_API_KEY=<your Discourse API key>
NEXT_PUBLIC_DISCOURSE_URL=<http://community.localhost or live URL>
ALCHEMY_API_KEY=<your Alchemy key>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your WalletConnect project ID>
POSTGRES_URL=postgresql://postgres:<password>@localhost:5432/regarded_games
```

For the anti-bot CAPTCHA system (required for testnet quest protection), register a site at [dash.cloudflare.com → Turnstile](https://dash.cloudflare.com/) and add:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key — embedded in browser widget, safe to expose>
TURNSTILE_SECRET_KEY=<secret key — server-side only, never expose>
```

Leave both unset in local dev — CAPTCHA verification auto-passes and the widget is hidden.

For mainnet launch, also set:
```
NEXT_PUBLIC_ENVIRONMENT=mainnet
NEXT_PUBLIC_PONDER_URL_MAINNET=https://your-ponder-endpoint/graphql
NEXT_PUBLIC_PONDER_URL_SEPOLIA=https://your-ponder-sepolia-endpoint/graphql
```

---

## 1b. Run Database Migrations

Run this once against your database before the first deploy. It creates the tables for quests and anti-bot fingerprinting. Safe to re-run — all statements are `CREATE TABLE IF NOT EXISTS`.

```powershell
# Quest completion + config tables
node scripts/create-quest-tables.mjs

# Anti-bot session fingerprints table (IP clustering + CAPTCHA verification log)
node scripts/create-session-fingerprints-table.mjs
```

Both scripts read `POSTGRES_URL` from `.env` in the project root. Expected output ends with a column schema dump confirming the table exists.

---

## 2. Configure Quest Points

Edit `content/quests.json` to set point values for the season. Key fields:

```json
"points": {
  "vote_manifest": 200,
  "discussion_bonus_cap": 400
}
```

Adjust `discussion_bonus_cap` if you want to raise or lower the maximum Strategic Voice award.

---

## 3. Configure the Manifest Vote

Edit `content/manifest-vote.md`. Update the frontmatter fields:

| Field | What to change |
|---|---|
| `title` | Post title shown in Discourse |
| `categorySlug` | Discourse category slug (e.g. `governance`) |
| `pollName` | Unique poll identifier — increment per season (e.g. `manifest_s2`) |
| `closesAt` | ISO 8601 deadline — when voting closes |

Also update the body text below the `---` to reflect the current season's Manifest content.

---

## 4. Configure Discussion Grants

Edit `content/discussion-grants.json` with the wallet addresses and points for every player receiving a Strategic Voice bonus:

```json
{
  "grants": [
    { "address": "0xabc...", "points": 300 },
    { "address": "0xdef...", "points": 200 }
  ]
}
```

Points per address are capped at `discussion_bonus_cap` (default 400). Existing awards are never downgraded.

---

## 5. Start the Local Environment (dev only)

```bat
start.bat
```

This launches:
- Next.js on `:3000`
- Anvil (mainnet fork) on `:8545`, chain `31337`
- Anvil (Sepolia fork) on `:8546`, chain `31338`
- Ponder (mainnet) on `:42069`
- Ponder (Sepolia) on `:42070`
- Discourse (WSL2 container `app`) at `http://community.localhost` — `start.bat` ensures the container is up and the port bridge is applied. The web takes ~30 s to finish booting. See [§5a](#5a-discourse-local-community-forum-wsl2) for details.

Wait until both Ponder instances log `Indexed to block ...` before running the admin commands below.

---

## 5a. Discourse (local community forum, WSL2)

Discourse runs as the official `discourse_docker` **`app` container inside WSL2 (Ubuntu)**, reachable at `http://community.localhost`. The launcher lives at `/var/discourse` in the distro; data is in `/var/discourse/shared/standalone`.

**Auto-start.** A scheduled task **`WSL Discourse Keepalive`** runs at logon (highest privileges, forever). It keeps the WSL distro alive (so Docker + the container stay up) and maintains the `netsh portproxy` bridge `127.0.0.1:{80,2222} → <wsl-ip>:{80,2222}` (the WSL IP can change per boot). `start.bat` also re-triggers it. `community.localhost` resolves to `127.0.0.1` via the Windows `hosts` file.

**Common operations** (run from a normal Windows terminal):

```powershell
# Status / is it up?
wsl -d Ubuntu -u root -- docker ps

# Start / stop
wsl -d Ubuntu -u root -- docker start app
wsl -d Ubuntu -u root -- docker stop app

# Re-apply the port bridge + keepalive (e.g. after `wsl --shutdown`)
schtasks /Run /TN "WSL Discourse Keepalive"

# Logs
wsl -d Ubuntu -u root -- docker logs --tail 50 app

# Open a shell / Rails console in the container
wsl -d Ubuntu -u root -- bash -lc "cd /var/discourse && ./launcher enter app"

# Rebuild after editing /var/discourse/containers/app.yml
wsl -d Ubuntu -u root -- bash -lc "cd /var/discourse && ./launcher rebuild app"

# Create a backup (lands in /var/discourse/shared/standalone/backups/default/)
wsl -d Ubuntu -u root -- bash -lc "cd /var/discourse && ./launcher run app 'discourse backup'"
```

> **Windows-only glue:** the container uses Docker's **iptables-legacy** backend (the nftables backend is broken on the WSL2 kernel), stays in **NAT** networking mode (mirrored mode breaks Docker port publishing), and relies on the keepalive task above (WSL's localhost relay is unreliable here and WSL idle-shuts-down the distro). **None of this is needed in production** — on a real Linux host the same `app.yml` just runs with `./launcher start app` and `restart=always`. For production, also add a real hostname + SMTP and re-enable the `443`/SSL templates in `app.yml`.

---

## 5b. Stop the Local Environment (dev only)

```bat
stop.bat
```

The counterpart to `start.bat`. It:
- Stops Discourse — ends the `WSL Discourse Keepalive` task and `docker stop`s the `app` container (a manual stop overrides `restart=always`, so it stays down until next logon or the next `start.bat`).
- Kills Anvil + Ponder on ports `8545`, `8546`, `42069`, `42070`.
- Closes the Frontend + Docs windows (and frees ports `3000`/`3001` as a fallback).

WSL itself is left running. To shut that down too (frees its RAM): `wsl --shutdown`.

**Stop only Discourse**, leaving the rest of the dev env alone:
```powershell
wsl -d Ubuntu -u root -- docker stop app
```
Start it again with `wsl -d Ubuntu -u root -- docker start app` (or just `start.bat`).

---

## 6. Publish the Manifest Vote

Creates the Discourse topic + poll and registers its IDs in the database so the `vote_manifest` quest can detect voters.

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/quests/admin/create-manifest-vote" `
  -Headers @{ "x-quests-admin-token" = "YOUR_DISCOURSE_INIT_SECRET" } `
  -ContentType "application/json" `
  -Body "{}"
```

**If the Discourse topic already exists** (e.g. you created it manually), register it instead of creating a new one:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/quests/admin/create-manifest-vote" `
  -Headers @{ "x-quests-admin-token" = "YOUR_DISCOURSE_INIT_SECRET" } `
  -ContentType "application/json" `
  -Body '{ "existingPostId": 123, "pollName": "manifest_s1" }'
```

A successful response looks like:
```json
{ "success": true, "topicId": 12, "postId": 34, "pollName": "manifest_s1" }
```

---

## 7. Award Strategic Voice (Discussion Bonus) Points

Posts all discussion grants in a single call. Run this **after** the vote is live and forum activity has been assessed.

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/quests/admin/grant" `
  -Headers @{ "x-quests-admin-token" = "jeTN6Oe8IiBfITffH1mb" } `
  -ContentType "application/json" `
  -Body (Get-Content -Raw content/discussion-grants.json)
```

A successful response looks like:
```json
{
  "success": true,
  "granted": [
    { "address": "0xabc...", "points": 300 },
    { "address": "0xdef...", "points": 200 }
  ],
  "errors": []
}
```

Any invalid entries appear in `errors` — the rest are still awarded.

---

## 8. Verify

- Visit `http://localhost:3000/app` and confirm the quest board loads.
- Check a test wallet's quest state via `GET http://localhost:3000/api/quests?address=0x...`.
- Confirm the Discourse poll is visible and accepting votes.

---

## 9. Pre-TGE: Sybil Review

Run **before** distributing tokens. The script queries `session_fingerprints` and `quest_completions` and prints four flagging reports. Requires `POSTGRES_URL` in `.env`.

```powershell
# Default output (JSON-lines, thresholds: ≥3 wallets/IP, ≥5-hop referral chains)
node scripts/tge-sybil-review.mjs

# Tighten IP threshold, get CSV for spreadsheet review
node scripts/tge-sybil-review.mjs --ip-threshold=2 --chain-threshold=3 --format=csv
```

**Report sections:**

| Section | What it flags |
|---|---|
| **A — IP clusters** | Multiple wallets that signed in from the same IP address hash. Default: ≥3 wallets/IP. |
| **B — Referral chains** | Wallets linked by `faucet_referrals` in a chain of N+ hops (recursive CTE, depth ≤10). Default: ≥5 hops. |
| **C — Timestamp clusters** | 5+ wallets completing the same quest within the same clock-minute — coordinated scripted runs. |
| **D — All wallets ≥300 pts** | Full export for manual review. Cross-reference addresses appearing in A, B, or C. |

**Decision flow:**

1. Export section D to a spreadsheet (`--format=csv`).
2. Mark any address that appears in **two or more** of A/B/C as "review" — single-signal hits may be legitimate (NAT, shared VPNs).
3. For each "review" address, check on-chain timestamps and referral patterns manually.
4. Exclude confirmed bot farms from the token snapshot before running the TGE contract call.

> **Note:** The `session_fingerprints` table only populates IPs for users who sign in through the website with `TURNSTILE_SECRET_KEY` set. Wallets that never signed in will have no IP row and will not appear in section A — that is expected behaviour (they also cannot have earned quest points through the gate).
