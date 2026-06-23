---
title: Intro
slug: intro
sidebar_position: 1
---

# Intro

**Class War: The Game** is a real-money strategy game where two classes fight
over a shared prize pool. Everyone sees the same information, every rule is
enforced by code, and the players themselves own the rules. This page explains
how it all fits together in plain language. For the full theory, mechanics, and
math, see the [Whitepaper](/whitepaper).

## What You Are Playing

Most markets are tilted. Insiders see the order flow first and hold enough
capital to move prices, so ordinary players quietly lose money to people who can
see more than they can. Regarded Games removes that edge: there are no hidden
pools, no privileged data, and no operator who can reach in and change the
outcome. Smart money is welcome — it just can't cheat.

The whole thing is built as a game because a game is the most honest way to make
the structure visible. A **season** lasts a fixed period. Players buy in, pick a
side, and trade a seasonal token to push the economy toward their class's goal.
When one side wins, the prize pool is paid out according to that side's rules.

→ Read more: [The Clean Room of Finance](/whitepaper/part-vi-conclusion--future-vision#18-conclusion-the-clean-room-of-finance)

## The Two Classes {#the-two-classes}

Every player belongs to one of two classes, decided automatically by how much
of the seasonal token (**FIM**) they hold relative to everyone else. You don't
choose a side from a menu — you *become* one by how you trade.

The line between the classes is a **share-of-supply cut**, not a head-count.
Line every holder up from smallest to largest and walk up the list until the
balances add up to half of all the FIM in the game. Everyone below that line is
on one side; everyone above it is on the other. Because the cut is by supply, the
smaller, richer group sits above the line and the larger group of ordinary
holders sits below it.

- **Regardo, the Capitalist.** Regardo wants wealth to pile up in few hands.
  Capitalists try to concentrate FIM, pushing the economy toward inequality. A
  Capitalist win pays the whole pool to the small group of top holders — the
  winner-take-all market in its purest form.

- **Carlo, the Proletarian.** Carlo is the force of coordination. Proletarians
  work together to spread FIM out and keep wealth from concentrating. A
  Proletarian win caps the richest players' winnings and shares the surplus
  broadly.

→ Read more: [The Game as a Mirror](/whitepaper/part-i-the-philosophical-foundation#4-the-game-as-mirror-a-socratic-dialogue-in-code)

## A Season in Three Phases

A season always runs through the same three phases. Each one has its own page in
the rulebook on the landing site.

### Phase 1 — The Auction {#phase-1-auction}

A season opens with a buy-in window. Players exchange stablecoin (**USDC**) for
the season's token, **FIM**, at a fixed one-to-one rate. All the USDC collected
becomes the **prize pool** the two classes fight over, and it is immediately put
to work earning yield in established DeFi lending markets while the season runs.

To buy FIM you must first **stake RGD** (the governance token) as collateral.
This is the "skin in the game" rule: every unit of FIM has to be backed by locked
RGD. It stops one wealthy player from splitting their money across hundreds of
fake wallets to fake a crowd, because every wallet would need its own real,
locked stake.

→ Read more: [Phase I: Raising the Capital](/whitepaper/part-iii-the-mechanical-and-technical-framework#93-phase-i-raising-the-capital-the-auction)

### Phase 2 — Trading {#phase-2-trading}

Once the auction closes, the market opens. Players trade FIM with each other on a
**transparent peer-to-peer order book** — you can see every open order, and the
identity and balance of everyone on the other side of a trade.

That transparency is the whole point, because here **who you trade with matters
as much as the price**. Selling to a large holder concentrates wealth and helps
the Capitalists; selling to a small holder spreads it out and helps the
Proletarians. Every trade is a deliberate choice with a consequence for the whole
game, and the interface shows you a live preview of exactly how each trade would
move the economy.

FIM can only move through the official exchange — never wallet-to-wallet — so
every shift in wealth is recorded in the open and nothing happens in the dark.

→ Read more: [Phase II: The Active Game](/whitepaper/part-iii-the-mechanical-and-technical-framework#94-phase-ii-the-active-game)

### Phase 3 — Settlement &amp; Payout {#phase-3-victory-and-payouts}

A class wins by moving the economy far enough from where the season started —
not all the way to perfect equality or total concentration, just a defined step
toward their pole. Because markets naturally drift toward concentration, the
Proletarian side gets a built-in handicap so the contest stays fair. When a side
crosses the line, the season locks and the prize pool pays out:

- **Capitalist victory:** the entire prize pool goes to the small group of top
  holders who together control half the supply, in proportion to what they hold.
  Everyone else gets nothing.

- **Proletarian victory:** the richest players' winnings are **capped**, and the
  surplus is pooled into a **Solidarity Fund**. The fund is shared out by *net
  contribution* — the money each player put in minus what they took out — so the
  players who sacrificed the most for the cause are rewarded, and freeloaders get
  little.

- **Time runs out:** if neither side reaches the target before the clock ends,
  the payout blends the two — every bit of progress a side made still translates
  into money, so no effort is ever wasted.

→ Read more: [Phase III: Settlement and Payout](/whitepaper/part-iii-the-mechanical-and-technical-framework#95-phase-iii-settlement-and-payout)

## Who Owns the Game {#governance}

There is no company behind Regarded Games that can tune the rules to extract from
players. The game is run by a **DAO** — a decentralized organization owned by the
players, who govern it by holding the **RGD** token. This is what makes the market
credibly neutral: the rules are transparent, fixed during any live season, and
changed only between seasons by a vote of the people who play under them.

The most important lever is the dial that balances the two classes against each
other. It isn't held by founders or sold to the highest bidder — the players set
it collectively, in the open, the way a game studio patches for balance between
seasons.

Governance works in two halves that are kept apart:

- **Deciding** happens for free. Proposals are debated on the community forum
  (Discourse) and voted on through **Snapshot**, where members vote by signing a
  message rather than paying a transaction fee. Voting power comes from *staked*
  RGD, so the people setting the rules are the ones with capital committed to the
  game's long-term health.

- **Carrying it out** is the job of the **Execution Council**, a shared multi-
  signature wallet. The Council has no discretion — it simply confirms that a vote
  passed and writes the result on-chain, after a waiting period that lets the
  community inspect the exact change first.

→ Read more: [How Governance Works](/whitepaper/part-ii-organizational--technical-framework#7-how-governance-works)

## How Value Flows Back {#revenue-allocation}

While a season's prize pool sits in DeFi lending markets, it earns yield. That
yield (plus the small fee charged on every trade) is real revenue, and the DAO
decides how to use it. By vote, each season's revenue is split across four
streams:

1. **Buyback** — USDC is directed to buy RGD off the market, supporting the token.
2. **Liquidity** — funds deepen the protocol-owned market so trading stays stable.
3. **Prize-pool reinvestment** — value is added back to the pool players compete for.
4. **DAO / operations** — funds the ongoing work of running the protocol.

Crucially, only the *yield* is ever spent this way — never the players' principal,
which stays accounted for per season and is always recoverable.

→ Read more: [Tokenomics &amp; Value Accrual](/whitepaper/part-iv-the-economic-framework#112-the-sovereign-asset-rgd)

## The Two Tokens

The economy uses two tokens with completely different jobs:

| Token | Name | What it's for |
| :--- | :--- | :--- |
| **FIM** | Fake Internet Money | The seasonal game token you trade. A fresh one is minted each season; last season's FIM is worthless, so no one can hoard it across seasons. |
| **RGD** | Regarded Token | The permanent governance and access token. You stake it to play, and you use it to vote on the rules. Fixed supply of 1,000,000,000. |

→ Read more: [The Dual-Token System](/whitepaper/part-iv-the-economic-framework#11-tokenomics--governance)

## How Ownership Is Distributed {#distribution}

The RGD supply is fixed at one billion tokens, and most of it belongs to the
community rather than to insiders. The landing page's **Distribution of Power**
rulebook wheel shows the full breakdown; it splits into two groups:

**Community-controlled (≈75%)** — the majority of the supply, governed by the
players themselves:

| Tranche | Share | What it's for |
| :--- | :--- | :--- |
| **DAO Treasury** | 40% | Long-term capital for growth, controlled by governance. |
| **Growth & Ecosystem** | 20% | Incentives, rewards, and user acquisition. |
| **Market Formation** | 15% | The launch auction, initial liquidity, testnet quests, and airdrops. |

**Team & operations (≈25%)** — aligned to the long run, not handed out at launch:

| Tranche | Share | What it's for |
| :--- | :--- | :--- |
| **Core Team** | 15% | Vests over four years behind a one-year cliff. |
| **Operational Reserve** | 10% | Legal, audits, and infrastructure, run by the DAO LLC. |

The point of releasing it slowly is to keep the very concentration the game
critiques from re-forming at the level of who owns it. Only a small fraction is in
circulation at launch; the rest is earned over years by the people who build and
play. The team only profits if the project thrives long-term.

→ Read more: [Supply Distribution](/whitepaper/part-iv-the-economic-framework#113-supply-distribution) · [Release Over Time](/whitepaper/part-iv-the-economic-framework#12-how-ownership-is-released-over-time)

## Joining at Launch: The Capital Auction {#capital-auction}

When RGD is created, the whole supply is minted in a single **Token Generation
Event**, and the public sale tranche is offered through a **Capital Auction**.
Rather than a first-come scramble at a moving price, it is a batch auction:
everyone commits USDC during a window, and at the end a single **clearing price**
is set by collective demand. Every participant buys in at that same price — no
insider gets an earlier or cheaper entry.

When the auction closes, the same step that distributes RGD to buyers also pairs
the raised USDC with a matching liquidity tranche to open the public market at
exactly the auction price, and locks that liquidity up so no one can pull it.
Acquiring and staking RGD here is what gets you a seat at the game.

→ Read more: [The Token Generation Event](/whitepaper/part-iv-the-economic-framework#131-the-token-generation-event)

## Earning Your Stake: The Genesis Campaign {#testnet-quests}

Before mainnet, ownership is handed to the people who show up and contribute, not
to whoever buys the most on day one. A **testnet quest campaign** on Base Sepolia
lets founding players earn a **Contribution Score** by joining the community,
spreading the word, and playing live testnet seasons. That score converts into a
genesis airdrop of RGD when the token launches.

The full schedule of phases is laid out below and on the landing page's
**Campaign Sequence** rulebook page.

→ Read more: [Growing the Community](/whitepaper/part-v-strategic-execution#14-growing-the-community-and-distributing-ownership)

## The Roadmap {#roadmap}

The protocol grows in phases, proving the core game is stable before adding
complexity on top of it. Where it goes after launch is decided by the DAO, so
every expansion follows the community's direction.

| Phase | When | What happens |
| :--- | :--- | :--- |
| **Foundation** | Complete | Game design, dual-token economics, and the DAO LLC legal structure. |
| **Build** | Q1–Q2 2026 | Core smart contracts on Base, the dApp (exchange, terminal, community), and pre-launch community seeding. |
| **Testnet** | Q3 2026 | Public testnet on Base Sepolia, the Genesis quest campaign, the audit competition, and the Execution Council. |
| **Mainnet** | Q4 2026 | The RGD launch and Capital Auction, the Genesis airdrop, Season 1, the bug bounty, and live governance. |
| **Expansion** | Beyond | DAO-approved new game modes and ecosystem growth. |

Later seasons aren't fixed in stone: because the players own the rules, the DAO
can add new game modes — from seasons backed by volatile real assets to ones that
start everyone on perfectly equal footing.

→ Read more: [Roadmap & Future Vision](/whitepaper/part-vi-conclusion--future-vision#19-roadmap--future-vision)

## How the Game Is Kept Safe

Protecting the prize pool is the first priority. The contracts are fully
open-source, audited through a public competition before launch, and kept under a
permanent bug bounty (the Guardian Programme) afterward. The DAO is also wrapped
in a Wyoming DAO LLC, which shields individual contributors from liability and
gives the organization a legal point of contact.

→ Read more: [How the Protocol Is Secured](/whitepaper/part-v-strategic-execution#16-how-the-protocol-is-secured)

## Glossary

### Gini Coefficient {#gini-coefficient}

The standard measure of wealth inequality, and the scoreboard of the game. It runs
from **0** (everyone holds an equal share) to **1** (a single holder owns
everything). Each class tries to move it toward their pole, and a season is won
by shifting it far enough from where it started. It is calculated transparently
and checked on-chain, so no one can fake the result.

### Collateral / Skin-in-the-Game Rule

The requirement that every unit of FIM be backed by staked RGD. It makes faking a
crowd of fake wallets prohibitively expensive and ties any would-be manipulator's
fortune to the health of the very game they'd be attacking.

### Net Contribution

A player's total money in minus total money out. It rewards genuine sacrifice for
the collective and decides each player's share of the Solidarity Fund in a
Proletarian victory.

### Solidarity Fund

In a Proletarian victory, the pool created by capping the richest players'
winnings, then shared out among all players by net contribution.

### DAO

A Decentralized Autonomous Organization — the player-owned organization, governed
by RGD holders, that owns and runs the protocol in place of a company.

---

New here? The [Getting Started](/getting-started) guide walks you from a fresh
wallet to your first trade. For the complete economic and philosophical theory,
read the [Whitepaper](/whitepaper).
