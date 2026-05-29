# Launch Checklist

Step-by-step guide for launching a new season. Run through these in order.

---

## 1. Configure Environment

Copy `.env.example` to `.env.local` and fill in all values:

```
DISCOURSE_INIT_SECRET=<strong random secret>
DISCOURSE_API_KEY=<your Discourse API key>
NEXT_PUBLIC_DISCOURSE_URL=<http://community.localhost or live URL>
NEXT_PUBLIC_ALCHEMY_API_KEY=<your Alchemy key>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your WalletConnect project ID>
POSTGRES_URL=postgresql://postgres:<password>@localhost:5432/regarded_games
```

For mainnet launch, also set:
```
NEXT_PUBLIC_ENVIRONMENT=mainnet
NEXT_PUBLIC_PONDER_URL_MAINNET=https://your-ponder-endpoint/graphql
NEXT_PUBLIC_PONDER_URL_SEPOLIA=https://your-ponder-sepolia-endpoint/graphql
```

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

Wait until both Ponder instances log `Indexed to block ...` before running the admin commands below.

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
