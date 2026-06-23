---
title: Getting Started
slug: getting-started
sidebar_position: 2
---

# Getting Started

This guide takes you from a fresh wallet to your first trade on the seasonal
exchange. If you have not yet read the [Intro](/intro), start there — it explains
the two classes and the goal of a season. This page is about *how to actually
play*.

## 1. Connect a Wallet

Regarded Games runs on **Base**. You will need an EVM wallet (such as a browser
wallet) connected to the correct network:

- **Mainnet:** Base
- **Testnet:** Base Sepolia (play-money — start here to learn the mechanics)

Open the app and connect your wallet. On testnet, use the **faucet** to claim
fake USDC so you have something to play with.

You don't pick a class from a menu — it is **derived** from how much FIM you hold
relative to everyone else, against the live [share-of-supply boundary](/intro#the-two-classes).
Hold enough FIM to sit above the line and you're a **Capitalist**; below it, a
**Proletarian**. Because the line moves with every trade, your class can shift as
the market does.

## 2. Stake RGD, Then Acquire FIM

Two tokens are in play (see [The Two Tokens](/intro#the-two-tokens)):

- **RGD** is the governance and access token. You must **stake** it before you
  can play — it is your collateral and your "skin in the game."
- **FIM** is the seasonal token you actually trade.

Every unit of FIM you hold has to be backed by locked RGD. So the order is always:
**stake RGD first, then buy FIM.** If a purchase would leave you holding more FIM
than your stake can cover, it simply fails.

There are two ways to get FIM:

1. **At the auction** (the start of a season): buy newly minted FIM with USDC at a
   fixed rate. See [Phase 1 — The Auction](/intro#phase-1-auction).
2. **On the exchange** (once trading is open): buy it from other players. There
   are no hidden pools and no privileged sellers — every order and every
   counterparty is visible on-chain.

## 3. Understand the Order Book

Trading is **peer-to-peer against a fully transparent limit order book** — not an
automated pool. The book shows every open **bid** (someone wanting to buy FIM) and
**ask** (someone wanting to sell FIM), *and the wallet behind each one, with its
current balance and class.*

That last part is the whole game. In an ordinary market one unit is interchangeable
with another, so you only care about price. Here, **who you trade with matters as
much as the price**, because the trade changes who ends up holding what — and that
is exactly what decides the season. Before you confirm anything, the terminal shows
a live preview of how the trade would move the economy and in which direction.

## 4. Maker or Taker?

Every trade is either a **maker** order or a **taker** fill. The terminal has a
toggle for the two modes.

### Taker — fill an existing order

You are *taking* liquidity that someone else posted.

1. Browse the order book and **pick the specific orders you want to fill** — this
   is how you choose your counterparty. Selecting a counterparty *is* the strategic
   move.
2. Add them to your **order queue** (you can stack several).
3. Set the size, then **execute**. The fills settle on-chain in one transaction.

A taker pays a small **trade fee on the USDC leg** of every fill (the maker always
gets exactly their quoted price). That fee flows straight into the season's prize
pool — so trading actively *grows* the pot you're competing for.

### Maker — post your own order

You are *providing* liquidity and waiting for someone to take it.

1. Choose **Buy** or **Sell**, set your **price** and **size**.
2. Submit the order. Your USDC (for a bid) or FIM (for an ask) is escrowed, and a
   bid also reserves the RGD collateral up front.
3. The order sits in the book until another player fills it, or you cancel it
   (which refunds your escrow and releases the collateral).

Makers pay no trade fee, but they wait; takers pay the fee, but execute
immediately and choose exactly whom they trade with.

## 5. Shuffle (Mixed) Trades

As a taker you are not limited to a single direction. You can queue **both asks and
bids in the same batch** — buying from some players and selling to others in one
transaction. This is a **mixed**, or **shuffle**, trade, and it is the most direct
way to reshape the distribution.

For example, a Proletarian might in one move **sell** FIM down to several small
holders *and* **buy** FIM off a whale — spreading wealth out from two directions at
once. The terminal nets it all out: it only asks your stake to cover the **net**
FIM you end up holding, so a shuffle that leaves you roughly flat needs little or no
extra collateral.

A taker mask with both a buy queue and a sell queue is running a shuffle. Use it
when your goal is to change *who holds what*, not just to grow or shrink your own
bag.

## 6. Play the Season

Every trade is a strategic act. Capitalists work to concentrate FIM; Proletarians
work to spread it out. The season is won by the class that moves the economy far
enough from its starting point toward their pole — and the winning class dictates
how the USDC prize pool is paid out (see [Phase 3 — Settlement & Payout](/intro#phase-3-victory-and-payouts)).

A few habits of strong players:

- **Read the distribution, not just the price.** The cheapest order isn't always
  the best move; the one that shifts the economy your way is.
- **Coordinate.** No single ordinary player can move the line alone — your class
  has to act together.
- **Mind your net contribution.** In a Proletarian win, the surplus is shared by
  *net contribution* (money in minus money out), so genuine sacrifice for the
  cause is what pays.

For the complete mechanics, economics, and technical design, read the
[Whitepaper](/whitepaper).
