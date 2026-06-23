---
title: Whitepaper
slug: /
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Whitepaper

**Version 0.8 - 23.06.2026**

**Website:** [www.regarded.games](https://www.regarded.games)

**Contact:** [regardedgames@proton.me](mailto:regardedgames@proton.me)

---

## Table of Contents

- [Introduction](#introduction)

- **Part I: The Philosophical Foundation**
  - [1. How the Field Is Tilted](#1-how-the-field-is-tilted)
  - [2. The Promise Crypto Abandoned](#2-the-promise-crypto-abandoned)
  - [3. What Regarded Games Does About It](#3-what-regarded-games-does-about-it)
  - [4. The Game as Mirror: A Socratic Dialogue in Code](#4-the-game-as-mirror-a-socratic-dialogue-in-code)
  - [5. Why the Players Own the Rules](#5-why-the-players-own-the-rules)

- **Part II: Organizational & Technical Framework**
  - [6. How Governance Is Structured](#6-how-governance-is-structured)
  - [7. How Governance Works](#7-how-governance-works)
  - [8. Why the Protocol Runs on Base](#8-why-the-protocol-runs-on-base)

- **Part III: The Mechanical and Technical Framework**
  - [9. System Design: A Codified Philosophy](#9-system-design-a-codified-philosophy)
  - [10. Smart Contract Architecture](#10-smart-contract-architecture)

- **Part IV: The Economic Framework**
  - [11. Tokenomics & Governance](#11-tokenomics--governance)
  - [12. How Ownership Is Released Over Time](#12-how-ownership-is-released-over-time)
  - [13. Liquidity Initialization and Capital Controls](#13-liquidity-initialization-and-capital-controls)

- **Part V: Strategic Execution**
  - [14. Growing the Community and Distributing Ownership](#14-growing-the-community-and-distributing-ownership)
  - [15. Where Players Coordinate](#15-where-players-coordinate)
  - [16. How the Protocol Is Secured](#16-how-the-protocol-is-secured)
  - [17. Risks and How They Are Managed](#17-risks-and-how-they-are-managed)

- **Part VI: Conclusion & Future Vision**
  - [18. Conclusion: The Clean Room of Finance](#18-conclusion-the-clean-room-of-finance)
  - [19. Roadmap & Future Vision](#19-roadmap--future-vision)

- **Appendices**
  - [20. Appendix A: Formal Mechanics & Mathematical Notation](#20-appendix-a-formal-mechanics--mathematical-notation)
  - [21. Appendix B: Game Theory Considerations](#21-appendix-b-game-theory-considerations)
  - [22. Appendix C: Glossary](#22-appendix-c-glossary)

---

# Introduction

**You have watched the smart money win.** You have been front-run by actors who saw your order before it filled, sold liquidity that insiders had already exited, and traded against counterparties who knew things you could not. Whether the venue is a traditional equities desk or a digital-asset exchange, the everyday participant plays a game whose decisive moves happen somewhere they cannot see. This is not bad luck or a skill gap. It is structure: a permanent advantage built out of two things ordinary players never have—**better information** (privileged data, order flow, and the speed to act on it first) and **deeper pockets** (the scale to move a market and absorb the swings that wipe out smaller players). The house is not cheating against the rules. The house *is* the rules.

**Regarded Games is an alternative financial market built so those two advantages cannot exist—and owned by the people who play in it.** It is a real-money market whose every state is public, whose every rule is enforced by code rather than discretion, and whose rule-set is governed by a Decentralized Autonomous Organization (DAO) composed of its own participants. There is no privileged data feed, no hidden order flow, no administrator who can reach in and tilt the outcome. Smart money is welcome to play; it simply cannot cheat. What it loses at the door is not its capital but its structural edge—and on a field where that edge is gone, the only variables left are the quality of your strategy and the strength of your coordination.

**The market is structured as a game—Class War: The Game—because a game is the most honest way to make the structure visible.** It is a perfect-information, real-money arena that stages a recurring contest between two philosophies—capitalism (the concentration of wealth) and socialism (its redistribution)—kept score by a live, on-chain measure of inequality, the Gini Coefficient. A strict collateral-backed identity requirement and a fully transparent peer-to-peer order book turn each trade into a choice with consequences for the whole, forcing the friction between individual self-interest and collective action into the open. But the game is the *vehicle*, not the point. The point is what players discover by trading in a market where the cheats are gone and the rules belong to them: that decentralized governance can produce genuine fairness and participation, and that this—giving ordinary people the tools to rebuild the economy on fairer terms—is what blockchain technology was always supposed to be for.

---

# Part I: The Philosophical Foundation

## 1. How the Field Is Tilted

The Introduction named the two advantages that decide most markets: better information and deeper pockets. This section examines why that tilt is not a flaw the market is working to correct, but the foundation it is built on.

There are two longstanding views of what a market is. The first holds that a market is self-balancing: when people trade freely, prices settle where supply meets demand, and the result serves everyone. The second holds that a market left to itself drifts toward concentration—wealth accumulates at the top, and those who own assets pull steadily ahead of those who contribute only labor or liquidity. One need not resolve that debate to observe which description fits the markets we actually have.

The tilt is not the work of any conspiracy; it is built into the structure of every major venue, from the equity exchange to the digital-asset exchange. A hedge fund or a high-frequency trading firm sees more of the order book, sees it sooner, and holds enough capital to move prices and absorb the swings that would ruin a smaller participant. The retail trader responds to a price only after it has moved, with access to none of that reach. The outcome is not a fair contest the small participant occasionally loses, but a stable arrangement in which those losses are the system's product: a steady, predictable transfer of money from those who cannot see the whole market to those who can.

## 2. The Promise Crypto Abandoned

The technology now used to operate these extractive markets was originally designed to end them. This reversal is the starting point for everything that follows.

The first blockchain was conceived as a response to a banking crisis, and it carried a specific charge: that the financial system privatizes its gains and socializes its losses—when speculative bets succeed, the institutions keep the proceeds; when they fail, the public absorbs the cost. The proposed remedy was to remove the intermediary altogether. There would be no bank, no custodian, and no authority able to freeze an account or dilute the value of what a person held—only a public network open to anyone on equal terms.

The technology achieved this. What was built on top of it did not. The same neutral, open infrastructure proved to be an ideal venue for the very extraction it was meant to replace—now faster, and presented as liberation. The participants the system was meant to free became the material it consumed. Several features of how those participants trade made this straightforward:

- **Distrust of established institutions.** Often well-founded, this skepticism views legacy finance as closed, inefficient, and structurally biased against the individual—a sentiment that is genuine and therefore readily exploited.

- **A demand for direct ownership.** Participants want to hold their assets outright, beyond the reach of any custodian. The desire is legitimate, and easily flattered.

- **Valuation by narrative rather than fundamentals.** Where an asset has no earnings or cash flow to anchor its price, value becomes a function of collective belief—a reflexive process driven by shared conviction rather than intrinsic worth.

- **A preference for low-probability, high-magnitude outcomes.** A small chance at a transformative gain is favored over a steady, modest return, particularly among those for whom the conventional economy offers little upward mobility.

Contemporary crypto markets are constructed to exploit precisely these tendencies. They affirm the participant's desire for independence from the banks while quietly reproducing the banks' extraction—converting the pursuit of autonomy into a renewable supply of liquidity for whoever is positioned to capture it. The founding vision of an open and equitable economy was thereby repurposed into a more efficient version of the system it set out to replace.

## 3. What Regarded Games Does About It

**Regarded Games is the market that technology was meant to make possible**, with its rules written, enforced, and owned by the people who participate in it.

The contradiction at the center of crypto is that it is *socialist in its promise and capitalist in its practice*: open and equal in who may enter, sharply concentrated in who prevails. Regarded Games makes that contradiction the explicit object of the game. The two forces—capitalism, which draws wealth into few hands, and socialism, which distributes it outward—are no longer an unspoken tension within the market. They become the two sides a participant can take, and the balance between them is a parameter the participants themselves govern (see §5).

A season proceeds as follows. A participant enters by exchanging stablecoin (USDC) for the season's token, FIM; the sum of these contributions constitutes the pool under contention—the total value locked. Each participant aligns with one side, and every subsequent trade shifts the economy toward concentration or toward distribution. A live measure of inequality, the Gini Coefficient, records the state of that contest. Because computing it on every trade would be prohibitively slow and costly, it is verified at the season's close through a procedure anyone can independently check rather than one entrusted to any privileged party. When the measure crosses a defined threshold, the corresponding side has won and the season concludes.

One rule distinguishes this market from any conventional one: **the identity of one's counterparty matters as much as the price.** In an ordinary order book, who sits on the other side of a trade is irrelevant—one unit is interchangeable with another. Here, whether a participant buys from a large holder or a small one alters the direction in which the economy tilts, because it alters who ends up holding what. Every trade therefore carries a consequence beyond the trader's own balance, and skilled play requires attention to the distribution, not merely the price. To prevent manipulation through large numbers of pseudonymous accounts, participation carries a cost: a participant must stake the protocol's token, RGD, to trade—a single stake that can secure standing across several seasons at once.

The two sides differ most sharply in how they pay out. **A Capitalist victory directs the entire pool to the Oligarchy**—the top holders who together control half the supply—a winner-take-all distribution that mirrors the market this protocol offers an alternative to. **A Proletarian victory instead activates a Solidarity Fund**, which caps any single participant's share and distributes the yield broadly—the open and equitable outcome that crypto originally promised. Two victories define two distinct economies. (The precise payout curves, the threshold mathematics, and the treatment of partial victories are specified in Part III and Appendix §20.) That asymmetry does real work: it is the mechanism behind the strategic shift described in the next section, in which the mathematics itself moves a self-interested participant toward cooperation.

## 4. The Game as Mirror: A Socratic Dialogue in Code

**Regarded Games does two things at once.** It is a competitive, player-owned market—and, because of what trading on a truly level field reveals, it is also a way to see through the biases that ordinary markets train into us. To reach players where they already are, it borrows the look and language of the fast, speculative world it offers an alternative to. It presents itself as Class War: The Game—a clean market for anyone who has understood that in stocks and crypto alike, the "edge" comes from structural privilege rather than skill.

**That idea is built into the project's name and its central character, Regardo.** On the surface the name plays on the "high-conviction" slang of crypto culture. Underneath it carries the project's core concept: *systemic regard*. In opaque, manipulated markets, traders are reduced to reacting to noise. To "regard," here, means to look past an asset's immediate price to the structural state of the whole economy—to pay deliberate attention to where the wealth actually sits.

By slowing trading down with deliberate friction and giving everyone perfect information, the game rewards the player who reads the distribution of wealth as the real measure of value. That demand for patient, analytical attention is the opposite of the speed-at-all-costs reflex that rules normal trading. The name marks the move from the noise of manipulated speculation to the signal of coordinated strategy: the player who pays the closest attention to the system as a whole is the one who wins.

### 4.1. The Open Invitation: From Individualism to Coordination

The protocol does not preach; it holds up a level field as a mirror and lets the player read what it reflects. Because no one holds a hidden edge, players are free to discover for themselves where their real interest lies—and that discovery, not any lecture, is what aligns individual incentives with collective action. The familiar aesthetics of speculative culture are the on-ramp, carried by two archetypal characters that externalise the ideological conflict:

- **Regardo, the Capitalist:** the drive to dominate the market and pull capital into one's own hands. Regardo chases the role of the apex player—the "highly regarded" actor who rides the high-risk environment all the way to Oligarch status through winner-take-all play.

- **Carlo, the Socialist:** the counterweight—the force of coordination and mutual support. Carlo measures success by the community's strength in holding wealth together against the pull toward concentration, rather than by any single fortune.

The game opens with the familiar lure of big, high-variance returns and winner-take-all dynamics—the Capitalist payout. Its inner logic then confronts the player with a mathematical reality that overturns the assumption they walked in with.

*A new player, trained by the individualist stories of the wider market, almost always starts out competing. The Oligarchy payout looks just like the dream of crypto riches, and the player is free to chase it. But on a level field the math is out in the open: the game's Gini-aware design makes concentration genuinely hard, because moving the Gini Coefficient toward concentration takes overwhelming capital. The ordinary player soon finds that in a competitive, every-player-for-themselves game (capitalism), their own weight counts for almost nothing against the big, well-funded actors. And the payout drives the lesson home: a Capitalist win produces no winning faction at all, only a winning elite.*

**This is where the player meets a genuine dilemma.** Their motive is still plain self-interest—but what *counts* as self-interest is forced to change as they play. With Oligarch status out of statistical reach, the player faces a clear choice:

1. **Keep competing,** and in practice become liquidity for the dominant players.

2. **Switch to cooperation,** seeing that for the vast majority of players the Proletarian outcome—redistribution—pays better on average.

**The result is cooperation reached through arithmetic rather than appeals to conscience.** To make money, the would-be individualist is driven by the numbers to act as a collectivist. The game thereby demonstrates a hard claim: under the right conditions, the most rational, self-serving move is to coordinate for the good of the whole. The lesson lands as a felt, profit-driven experience—proof that a market is often rigged by the absence of a coordinated response, something its players have the power to change.

## 5. Why the Players Own the Rules

A protocol like this one cannot be run by a conventional company. A company owes its duty to shareholders, and that duty is to maximise their returns—which gives it a permanent reason to reach into the game and adjust the dials, tuning issuance or fees to pull revenue out rather than to keep the game sound. In the hands of a central operator, the market would stop being a neutral testing ground and turn into a machine for extracting rent from the people playing in it.

This is why governance is handed to a Decentralized Autonomous Organization (DAO)—a structural necessity, not a stylistic flourish. The DAO administers the protocol through code in place of human discretion, and that is what makes the market credibly neutral: every participant is treated alike because the rules are transparent, verifiable, and—within any live season—fixed. Players extend their trust to the code they can read, rather than to the founders.

### 5.1. Who Holds the Dial: The Players Set the Balance

This is where the project's central claim becomes concrete. Every market embeds a thumb on the scale—some parameter that decides whether the structure favours the concentration of capital or its distribution. In the markets most people trade today, that thumb belongs to a hidden minority, and it presses in their favour. In Regarded Games, the most consequential of those parameters is the **Compensation Multiplier**: the lever that balances the Capitalist faction against the Socialist faction, making one side's victory easier or harder to reach. It is the single most powerful knob in the entire economy.

That knob is not held by the founders, and it is not for sale to whoever brings the most capital. It is held by the players, collectively, through a DAO vote—and it is adjusted the way a competitive game studio patches for balance: openly, between seasons, in response to how the last season actually played out. Within a live season the multiplier is fixed and cannot be touched, so no one can reach in and change the rules mid-game; between seasons, the people who live under the rules are the same people who set them. That identity—rule-makers and rule-takers being one and the same—is not a feature bolted onto the protocol. It *is* what decentralized governance means.

A sharp reader will object: if the players vote on the dial, and most players stand to gain from tilting it one way, won't the majority simply rig the field in their own favour? The premise sounds obvious, but it is false—and seeing why is the whole point of the project. A tilted field only pays out if the other side keeps playing. Tilt it too far and the disfavoured faction has no reason to stay, no reason to buy in next season, and no reason to be on the other side of your trades; the market thins, liquidity drains, and the majority's "victory" becomes a claim on an empty table. There is nothing to extract from a counterparty who has walked away. So the equilibrium the players converge on is not the one that grabs the largest share of any single season—it is the one that keeps *everyone* willing to return. Self-interest, played out across seasons, does not point toward domination; it points toward the balance that keeps the game alive. That balance is fairness, arrived at not by decree but because no other setting is stable. And because the dial is set in daylight, on the record, by the participants themselves—rather than in secret by a minority the rest of the market never gets to vote against—the search for that balance is one anyone can see and contest. (The formal mechanics of the multiplier and its governance parameter are given in §17.3 and Appendix §20.2.)

### 5.2. From Owning Coins to Coordinating Capital

Regarded Games is an argument about what this technology is *for*. The dominant story, inherited from the first blockchains, treats crypto-assets mainly as a way to hold value outside the banking system—money you own and store yourself. That was a real breakthrough, but it stops at simple ownership.

The project makes the case for a larger use: coordination. Smart contracts can do more than hold a balance; they can run a market with no middleman in the middle. In an ordinary market, a central intermediary skims the value that everyone's activity creates. A DAO-governed system removes that layer and clears value automatically, so the surplus the ecosystem generates flows straight to the participants who generated it.

Regarded Games is the practical application of this shift—a market people actually trade in, whose surplus and whose rules both flow back to its participants. It stands for a simple thesis, which the rest of this paper makes concrete: the highest use of this technology is to give ordinary participants the tools to recreate the economy as a more equitable, self-governing system—and to own the rules that govern it.

---

# Part II: Organizational & Technical Framework

## 6. How Governance Is Structured

Part I argued that the market must belong to its players (§5). This Part describes the machinery that delivers that ownership: the legal form the DAO takes, the principles it operates under, and the process by which the players actually decide and enforce the rules.

### 6.1. A Legal Home for the DAO

Part I established *why* the protocol is governed by a DAO rather than a company (§5): only rules no one is positioned to tilt can be trusted to be neutral. This section covers what that structure looks like in practice. The treasury, the governance logic, and the parameters that run each season all live on the blockchain, enforced by code, so the game behaves as a deterministic system—the same inputs always produce the same outcome, with no room for discretion to alter the result after the fact.

Code can govern the protocol, but contracts with auditors or vendors, and the question of who bears liability, still occur in the ordinary legal world. There is a concrete danger in leaving that gap open: a DAO with no legal form is treated by default as a general partnership, which would make every member personally liable for the whole organization's debts and legal exposure. To close it, the project registers the DAO as a **Wyoming DAO LLC**—a limited liability company under Wyoming's dedicated DAO statute, which serves as a legal interface for an organization that otherwise exists only as code.

Wyoming's statute is what makes this structure possible: unlike a conventional company run by a board of directors, a DAO LLC may be *member-managed* with its membership and governance defined directly by the smart contract, so that the members are simply the holders of the governance token and membership is established by what a participant holds on-chain. The arrangement does two things:

1. **It limits liability.** A participant's exposure is confined to the capital they commit to the protocol; their personal assets are not at risk.

2. **It defers to the code.** The LLC's operating agreement names the smart contract as the governing authority for the protocol's decisions. The intent is that the LLC does not direct the DAO; the DAO uses the LLC only as a legal point of contact for compliance and contracting.

### 6.2. The Five Operating Principles

Five principles govern how the protocol operates.

- **Equal information.** There are no tiered access levels, privileged data feeds, or insider channels of the kind traditional finance runs on. Winning depends on the quality of a participant's analysis and execution, never on information others cannot see.

- **Full transparency.** Every participant sees the same complete picture: the entire order book and the token balances of every possible counterparty are visible on-chain. This is what makes "Gini-aware" strategy possible—a participant can weigh not only an asset's price but the effect of trading with a particular counterparty on the distribution as a whole.

- **Enforcement by code.** The rules are applied by smart contracts that cannot be altered once deployed, not by human judgment. The mechanics run the same way for everyone, without bias, delay, or discretion.

- **Active governance.** Ownership of the DAO is defined by putting capital to work, not by passive extraction. The protocol's revenue is directed by the DAO under its Revenue Allocation Policy: RGD holders vote on how to deploy it—among token buybacks, liquidity provision, or growing the treasury—and create value by managing those assets collectively.

- **Solvency and security.** Protecting participants' collateral is the system's non-negotiable baseline. The contracts are open-source and kept under a standing bug bounty (§16), so that the mathematics of the game cannot be exploited to drain the treasury.

## 7. How Governance Works

**Governance has to satisfy two goals that pull against each other: it should be open to everyone, and it should be secure against attack.** Regarded Games reconciles them by separating the two halves of the process. Deciding *what* to do—debating proposals and voting on them—is kept apart from *carrying it out* on-chain. This lets the deciding happen for free, with no transaction fees, while the carrying-out still settles with the finality of the blockchain.

The framework has three layers.

### 7.1. Where Proposals Are Debated and Voted On

**Discussion happens on the protocol's Discourse forum, and voting happens through Snapshot**—a system that lets members vote by signing a message rather than by sending a paid transaction. A proposal is debated and refined in the forum, then taken to Snapshot for a formal vote, keeping the move from debate to decision as smooth as possible. (The forum is described in full in §15.)

- **Voting is free.** Members vote by cryptographically signing a message rather than by submitting an on-chain transaction, so casting a vote costs no gas. No one is priced out, and governance stays open to every RGD holder regardless of how much they hold.

- **Voting power belongs to stakeholders.** The forum itself is an open public square—anyone can read and join the debate. What is gated is the vote, and here the protocol makes a deliberate choice. The simplest approach, and the most common one across DAOs, is to let anyone who merely *holds* the token vote with it. Regarded Games instead counts only **staked** RGD: voting weight comes from tokens a member has locked into the protocol, not from a balance sitting idle in a wallet. This follows the "vote-escrow" pattern established by protocols such as Curve and Pendle, where governance power is tied to a committed, locked position rather than a transient one. The reasoning is that the people setting the rules should be those who have bound their capital to the system's long-term health—so while everyone can make their case, the binding decisions rest with participants who have something genuinely at risk.

- **Votes can't be bought for a moment.** A known attack is to borrow a large amount of a token just long enough to swing a vote, then return it (a "flash loan"). The defense is to measure voting power from a snapshot taken when the proposal was created, not at the moment of voting: a member's weight is fixed at that earlier block, so a balance acquired afterward counts for nothing. Requiring tokens to be staked reinforces this—borrowed capital cannot vote without first being locked into the protocol—but the historical checkpoint is what closes the attack.

- **The record is public.** Every vote is recorded permanently and openly through Snapshot on IPFS (a public, content-addressed storage network). Anyone—the Execution Council or an outside observer—can independently verify the result.

### 7.2. Who Carries Decisions Out: The Execution Council

**A passed vote still has to be written to the blockchain, and that is the Execution Council's only job.**

- **What it is.** The Council is a shared wallet that requires several signers to approve any action—a multi-signature wallet (a Gnosis Safe), set so that some fixed number must sign, for example four of seven.

- **It has no discretion.** The Council does not rule; it confirms. Its sole mandate is to check that a proposal reached the required participation and majority, and then to sign the matching on-chain transaction. It cannot decide *whether* it agrees—only *that* the vote passed.

- **It can sign in the legal world too.** As the managers of the Regarded DAO LLC, Council members can also sign ordinary contracts—with auditors or vendors—on the DAO's behalf, but only after a vote has authorized the action.

- **It becomes more decentralized over time.** The first Council is made up of trusted community members and founders; the roadmap commits to filling its seats by election, so the community keeps ultimate control of the executive role.

### 7.3. How the Rules Are Enforced On-Chain

The protocol's most sensitive functions—starting a new season, or setting a season's treasury policy—can only be called by a designated owner. That owner is the Execution Council's shared wallet, which controls the contracts that in turn run the treasury and staking. Handing over that ownership is done in two deliberate steps: the deployer *offers* control to the Council, and the Council must explicitly *accept* it before the transfer completes—a safeguard that makes it impossible to lose control by sending it to a wrong address. The effect is that no change to the game's rules or financial parameters can happen without the Council acting on a vote that has actually passed.

### 7.4. The Path of a Proposal

A proposal moves from idea to execution in four stages.

1. **Request for comments.** The proposal begins in the community forum, where it is debated and its support is gauged.

2. **Formalization.** The finished proposal is posted to Snapshot, which records the block height that fixes everyone's voting weight.

3. **Voting.** RGD holders sign messages to cast their votes. If the required participation and majority are reached, the proposal passes.

4. **Settlement.** A waiting period—a *timelock*, for example 48 hours—begins, giving the community time to inspect the exact code to be executed for anything malicious. When it elapses, the Execution Council signs the transaction and the change is written to the blockchain.

**The timelock is also the safety catch.** If a passed proposal turns out to contain a critical bug or a hidden exploit, the Council is bound by its protective mandate to withhold its signatures—vetoing the transaction to protect the protocol. The veto exists only to stop harm, not to overturn a legitimate result.

## 8. Why the Protocol Runs on Base

**Regarded Games is deployed on Base**, an Ethereum Layer 2—a network that runs on top of Ethereum to process transactions faster and more cheaply while still settling to Ethereum for security. This choice gives the protocol the speed, low cost, and security it needs, for four reasons.

- **It speaks Ethereum's language.** Base is fully compatible with the Ethereum Virtual Machine, the standard environment Ethereum contracts run in. That keeps the protocol in line with the wider ecosystem, makes it easier to audit, and lets it build on well-tested, widely-used tools. It also keeps the door open to moving elsewhere later: the protocol is not permanently locked to one network if the landscape changes.

- **Trading stays cheap.** Gini-aware play depends on participants making many small, deliberate adjustments to their positions. On an expensive network, transaction fees would discourage exactly that kind of fine-grained trading and the game would stop working. Base's low fees keep the cost of each move small, so what limits a participant is their skill, not the price of transacting.

- **Getting in is easy.** Base connects directly to established on-ramps for converting ordinary money into crypto and to mature wallet infrastructure. That smooths the path for new participants to fund an account, and lets the project spend its effort on the game itself rather than on building payment plumbing.

- **Settlement is anchored to Ethereum.** Transactions run on Base for speed and low cost, but their final settlement and data are recorded on Ethereum itself. The protocol therefore inherits Ethereum's security and censorship resistance: the DAO's treasury and participants' assets are protected by Ethereum's consensus, without the security compromises that come with faster but less-proven standalone chains.

---

# Part III: The Mechanical and Technical Framework

## 9. System Design: A Codified Philosophy

Every mechanic in Regarded Games is the working form of a principle from Part I, translated into code. Each rule exists to do a specific job: keep the field fair, hold players accountable, and isolate the one variable the game is built to study—economic ideology. To keep those jobs cleanly separated, the system is divided into distinct smart contracts, each responsible for one phase of the economic cycle. This section explains what each phase does and why; the contracts that implement it are catalogued in §10.

### 9.1. The Entry Requirement: Keeping One Player from Posing as Many

The most basic way to cheat a game played by anonymous wallets is the *Sybil attack*: a single wealthy actor (a "whale") splits their funds across hundreds of wallets to impersonate a crowd of small holders. Because a player's faction is read from the spread of balances, a whale who fragmented their stake this way could fake a flat, equal distribution and make a Proletarian victory trivial to manufacture. The game has to make pretending to be many people expensive.

It does this by requiring every unit of the game token to be backed by locked collateral. To enter, a wallet must first have staked the governance token, RGD; only then can it buy the season's token, FIM. Every whole unit of FIM acquired locks a fixed amount of staked RGD—a flat token amount per FIM, set for the season, not a percentage that floats with RGD's market price. A purchase that the player's staked balance cannot cover simply fails.

The same requirement follows the token everywhere, not just at the auction. Whether a holder bought FIM at the auction or from another player, their holdings must always be backed by staked RGD, and the obligation transfers from seller to buyer as part of the trade itself: a buyer placing a bid must set aside the collateral up front, and a taker buying from a sell order is checked at the moment of the fill. Neither side of a trade can complete unless the buyer's stake covers what they will end up holding.

Crucially, one stake can secure several seasons at once. The protocol tracks the collateral each active season requires and asks a player's staked balance to cover only their *largest* single-season obligation, not the sum of all of them—and a player cannot withdraw stake below that high-water mark while any season they joined is still running. This makes participation efficient without weakening the guarantee.

The effect is accountability. No one can move the game's state from behind a wall of disposable wallets; influence requires a real, lasting stake in the protocol. And because that stake is the protocol's own governance token, attacking or degrading the game would erode the value of the very collateral the attacker is forced to hold.

### 9.2. The Season's Token: FIM

The game runs on its own internal token, FIM (Fake Internet Money), shaped to keep the game economy sealed off from outside markets. Two design choices do this work.

First, FIM is disposable. Each season issues a fresh token of its own; last season's FIM is worthless this season. That prevents anyone from carrying a hoard forward to speculate across seasons, and it guarantees every season begins from a clean, neutral slate.

Second, FIM cannot be sent directly from one wallet to another. The only path it can travel is through the official Exchange. This forces every change in who-holds-what to happen inside the observable marketplace, so that each shift in wealth is recorded on-chain and correctly reflected in the inequality measure—nothing moves in the dark.

### 9.3. Phase I: Raising the Capital (The Auction)

A season opens with a capital-formation window of fixed length. That length is not a fixed feature of the protocol; it is a per-season setting chosen when the season is created, so each season can run on its own schedule. The figures in this paper are illustrative proposals, not guarantees—mainnet and testnet, for instance, may use different windows (a longer formation window on mainnet, a shorter one of about a week on testnet so seasons cycle quickly). The actual value for any season is whatever that season's configuration specifies.

During this window:

- **Entry is at a fixed rate.** Participants exchange stablecoin (USDC) for FIM at a flat one-to-one rate—one USDC buys one FIM.

- **Every contribution is recorded.** Each purchase writes down how much capital that wallet has committed to its FIM position. This running figure—what a player puts in, net of what they take out—is the basis for the "proof of sacrifice" measure that decides part of the settlement payout (§9.5).

- **The capital is put to work.** Deposited USDC is not left idle in the contract; it is routed to the Treasury, which immediately supplies it to an external lending market to earn yield. Each season's principal is tracked separately, so the money owed to one season is never mingled with another's.

### 9.4. Phase II: The Active Game

When the auction closes, the market does not open straight away. First comes a short bootstrap step: trading stays paused while the starting distribution of wealth is calculated and recorded as the season's baseline. Only once that baseline is verified on-chain does live trading begin. Everything that follows is measured against it.

**A transparent order book.** Most decentralized exchanges hide individual traders behind a shared pool of liquidity. The Regarded Games exchange does the opposite: it is an open order book that publicly shows the identity and current balance of everyone posting an order.

That openness is the whole point, because it makes *Gini-aware* trading possible. A player selling FIM can choose a counterparty not only on price but on what the trade does to the distribution. Selling to a whale concentrates wealth further and helps the Capitalist side; selling to a small holder spreads it out and helps the Proletarian side. Because the counterparty's identity is visible, every trade becomes a deliberate choice with a consequence for the whole. The interface does not leave that judgment to intuition: for any pending trade it shows a live, signed preview of the exact effect on the inequality score—how many basis points the trade would move it, and in which direction—computed with the same arithmetic the contract uses. Gini-aware play is quantified for the player in real time.

**The faction you see is the faction that pays out.** The side a player is shown as during trading—Capitalist (part of the Oligarchy) or Proletarian (part of the Masses)—is not a cosmetic label separate from the endgame. It is the *same* boundary that governs the settlement payout in §9.5: sort holders from poorest to richest, and the largest group whose balances together make up half the FIM supply or less are the Masses; everyone above that line is the Oligarchy. The live indicator a player trades against is therefore a running readout of exactly where they stand relative to the line that will decide how the money is split.

**Keeping score: the Gini Coefficient.** The state of the game is measured by the Gini Coefficient, the standard measure of inequality—0 means everyone holds an equal share, 1 means a single holder owns everything (on-chain it is expressed in basis points, 0 to 10,000). Rather than recompute it on every trade, the protocol establishes it at the boundaries between phases: an off-chain solver submits the full list of players sorted from smallest balance to largest, and the contract checks that ordering itself—rejecting any list that is out of order or contains duplicates—while adding up the figures needed to derive the coefficient in a way that always produces the same result from the same data.

**Winning: a race measured from the starting line.** A faction does not have to reach perfect equality or total concentration. It has to *move* the economy far enough from where it started. The target is to shift the Gini score one quarter of the way from the season's baseline toward that faction's pole:

- **Capitalist win condition:** `(G_current − G_initial) / (1 − G_initial) ≥ 0.25`

- **Proletarian win condition:** `((G_initial − G_current) / G_initial) × M ≥ 0.25`

**The compensation multiplier (M): a thumb on the scale, by design.** Left to themselves, markets tend to concentrate—wealth drifts toward those who already have the most (the "power law" pattern). Spreading wealth out takes deliberate coordination; letting it pool together does not. To keep the contest fair against that natural drift, the protocol gives the Proletarian side a structural handicap through a multiplier, M:

`M = β + (1 − G_initial)²`

The base term β (the season's base multiplier, currently set around 1.2) is the protocol's most important governance lever. It is not a fixed constant but a value the DAO can change between seasons by vote. Looking at how concluded seasons actually played out, the community can raise or lower β to rebalance the game—making sure neither side wins reliably just because of how markets naturally behave, rather than because of how players played. This is the same dial discussed in §5.

**The dust filter.** A player could try to distort the inequality measure by creating thousands of wallets each holding a trivial amount of FIM—padding the population with fake "poor" holders. To stop this, only wallets holding more than a minimum balance (set per season, for example 5 units) count toward the measure at all. Anything below that line is left out of the calculation entirely.

### 9.5. Phase III: Settlement and Payout

When a victory condition is met, the season's state is locked and the Treasury pays out. How it pays is the financial expression of whichever side won. As during trading, wallets below the dust threshold are excluded from both the inequality measure and the payout. There are three possible outcomes.

**Outcome A: a Capitalist victory.** The protocol identifies the Oligarchy—the smallest group of top holders who together control at least half the FIM supply—and pays the entire prize pool to them alone, in proportion to their holdings. Everyone outside that group receives nothing. This is the winner-take-all market in its purest form.

**Outcome B: a Proletarian victory.** Here the payout is capped and redistributed:

1. The players are split by the **same boundary used during trading** (§9.4): the Masses are the largest group of poorest holders whose balances sum to half the FIM supply or less; the remaining top holders are the Oligarchy. (Again, this is a share-of-supply cut, *not* a top-half/bottom-half split of people—the Masses are usually far more than half the players.)

2. A cap is set from the largest balance among the Masses.

3. No Oligarchy player can claim more than that cap. The surplus above it is taken and pooled into a **Solidarity Fund**.

The Solidarity Fund is then shared out according to each player's *net contribution*—the money they put in minus the money they took out (`Money_In − Money_Out`). This rewards genuine sacrifice for the collective goal and prevents freeloading: it distinguishes the player who spent real capital to buy and hold FIM in order to flatten the distribution from the bystander who merely watched. The more a player sacrificed for the cause, the larger their share of the fund.

One attack has to be headed off here. Because net contribution comes from real trades, two colluding wallets could in principle pass FIM back and forth to inflate one wallet's contribution figure. The defense is economic rather than a hard cap (which could not tell a genuine large sacrifice from a fake one): every trade pays the per-fill trade fee (§10.3), so each round-trip is taxed twice and bleeds real, unrecoverable money into the prize pool. The more a colluder works the attack, the more it costs them, until it defeats itself.

**Outcome C: a blended result when time runs out.** If the season's clock expires before either side reaches the full 25% target, the payout blends the two logics in proportion to how far the leading side got. Let the final progress be whichever side advanced further; the payout is then:

`Payout = (P_final × winning-side logic) + ((1 − P_final) × draw logic)`

- The **progress share** (`P_final`) is paid out by the rules of the side that led—Oligarchy concentration or Solidarity Fund redistribution.

- The **residual share** (`1 − P_final`) is returned to all players in proportion to their final FIM holdings.

This guarantees that even in a stalemate, every bit of progress a side made still translates into money—no strategic effort is ever wasted.

## 10. Smart Contract Architecture

This section covers the contracts behind everything described in §9: first the reasoning behind the major architectural choices (§10.0), then a technical reference for each contract. It is written for developers and auditors and names contracts and functions directly; a reader who only wants to understand how the game works, rather than how it is implemented on-chain, can skip ahead to Part IV.

**The protocol keeps each responsibility in its own contract**, organized into two groups. One group is *permanent*—deployed once and shared by every season. The other is *seasonal*—a fresh, disposable set of contracts spun up for each season and discarded when it ends.

### 10.0. Key Design Decisions

The architecture is the product of a handful of deliberate choices, each made over an obvious alternative a reader might expect. This subsection states the reasoning behind the major ones—what was chosen, what was rejected, and what attack or failure each choice is meant to close. The per-contract reference that follows (§10.1 onward) then describes what each contract does.

**D1 — A transparent limit order book, not an AMM.**
The most common way to build an on-chain market is an automated market maker (AMM): traders swap against a pooled reserve, and price is set by a curve rather than by a counterparty. Regarded Games deliberately forgoes this in favour of a peer-to-peer limit order book in which every maker's identity and balance is visible on-chain. The reason is that the game's central mechanic—Gini-aware trading—requires a player to *choose whom they trade with*. An AMM makes the counterparty an anonymous pool, which erases exactly the information the game is built on: whether you are buying from a whale or a small holder determines which way the trade tilts the distribution.

Concretely, selling FIM to a large holder concentrates supply and helps the Capitalist side, while selling the same FIM to a small holder spreads it out and helps the Proletarian side. In an AMM these two trades are indistinguishable—you trade against the curve, not a person—so the strategic core of the game could not exist. The order book preserves it: a taker selects a specific order by `orderId` and therefore a specific counterparty.

The trade-off accepted is that a limit order book has thinner passive liquidity than an AMM, since it depends on makers actively posting orders rather than a standing reserve. The protocol accepts this because counterparty transparency is non-negotiable for the game, and it partly offsets the cost by routing the per-fill trade fee into the prize pool, which rewards active market-making.

**D2 — Disposable per-season contracts, not one upgradeable contract.**
Each season deploys a fresh set of four contracts (`GameSeason`, `Auction`, `Exchange`, `FIM`) through the `SeasonFactory`, and discards them when the season ends. The obvious alternative—one long-lived, upgradeable contract suite behind proxies that is reused season after season—is rejected. Isolating each season in its own contracts guarantees a clean slate: balances, orders, and state from one season cannot leak into the next, and a bug or exploit in one season's instance is contained to that season rather than threatening the whole protocol and every participant's funds at once.

This also narrows the trust surface. An upgradeable proxy means an admin key that can change the rules of a live game from under its players—precisely the discretionary power the protocol exists to eliminate (§5). Disposable, non-upgradeable season contracts mean the rules of a season are fixed in code the moment it is deployed and cannot be altered while it runs. The DAO changes the rules only *between* seasons, by configuring the parameters the next season is deployed with—never by upgrading a contract mid-flight.

**D3 — Compute the Gini off-chain, verify it on-chain.**
Recomputing the Gini Coefficient on-chain after every trade would be prohibitively expensive: the pairwise formula is O(n²) in the number of players, and even an O(n) sorted-sum form would still impose a heavy per-trade gas cost that scales with the population. Rather than pay this, the protocol splits the work: an off-chain solver submits the full player set **sorted by balance**, and the contract only *verifies* that submission—checking the ordering, rejecting duplicates, and applying the dust filter—while accumulating the sums needed to derive the coefficient.

The security property that makes this safe is that verifying a sorted list is cheap and impossible to fake. A solver cannot submit a favourable-but-false distribution, because the contract independently re-checks the sort and the sums against the real on-chain balances; any inconsistency is rejected. So the protocol gets the cost profile of off-chain computation with the trust profile of on-chain enforcement—nobody has to trust the solver, only verify its output. This is why the Gini is established at phase boundaries (bootstrap and settlement) rather than continuously.

**D4 — Collateral is a fixed token amount per FIM, not a percentage of value.**
Every unit of FIM must be backed by a fixed quantity of staked RGD (`rgdWeiLockedPerFim`)—a flat token amount, set per season. The alternative would be to require collateral worth some *percentage of the FIM's market value*, floating with the RGD price. That alternative is rejected because it would make the Sybil-resistance guarantee depend on a manipulable, volatile input: an attacker who could push the RGD price down would cheapen the collateral required to flood the game with wallets, and ordinary price swings would make the cost of honest participation unpredictable.

A fixed token amount makes the cost of identity deterministic and known in advance. To fragment capital across N wallets, an attacker must acquire and lock N times the per-FIM collateral, regardless of market conditions—and because that collateral is the governance token itself, the attacker is forced into a large RGD position whose value they would themselves destroy by breaking the game (§21.4). The choice converts Sybil resistance from a value-based check that can be gamed into a quantity-based commitment that cannot.

**D5 — Settlement is a bonded, permissionless crank, not a privileged admin action.**
Ending a season—establishing the initial Gini at bootstrap and finalising at settlement—must be driven by *someone*, but the protocol refuses to make that someone a privileged administrator, since an admin who controls when and whether a game settles holds discretionary power over outcomes. Instead, settlement is permissionless: any external actor (a Keeper) can drive it by posting a USDC bond, which makes them that season's `settlementStarter`.

The bond exists to defend a specific attack. Settlement processes the player set in batches; if anyone could submit batches, a griefer could interleave a poisoned or out-of-order batch into a partially-processed settlement and stall it in an unfinalisable state, freezing everyone's funds. So once a starter has bonded, **only they** may submit that season's batches, and the batches are validated (sorted, de-duplicated, dust-filtered) on the way in. An honest finalisation returns the bond; an attempt to settle before a victory or the time limit is actually met forfeits the bond to the DAO, which makes spamming premature settlements costly. Should a bonded starter abandon a batch mid-flight, the Execution Council can reassign the crank via `resetSettlement`. The net effect: settlement is open to anyone, cheap for an honest keeper, and expensive to grief.

**D6 — Payouts are computed lazily per player, not in a distribution loop.**
At settlement the protocol could iterate over every player and push each their payout in one transaction. It deliberately does not, because that loop's gas cost grows with the player count and would eventually exceed the block gas limit—turning a popular season into one that *cannot be settled at all*, a denial-of-service that scales with success. Instead, finalisation only snapshots the final prize pool, and each player's payout is computed lazily, on demand, when they call `claimPayout`.

This makes the cost of finalisation independent of how many players joined, removing the population-based DoS entirely. It also hardens a subtler property: because `claimPayout` always releases the player's RGD collateral and burns their FIM even when the payout is zero, no player's stake can be stranded by a season they technically "lost"—everyone can always recover their locked collateral regardless of outcome. The same pagination logic protects order settlement, which drains open orders in bounded slices via `settleOrders(maxCount)`.

**D7 — FIM can only move through the Exchange, not by free transfer.**
FIM is a restricted ERC-20: its `transfer`/`transferFrom` are gated so that only the season's `Exchange` can move tokens, and minting/burning are restricted to the `Auction` and `GameSeason` respectively. A normal freely-transferable token is rejected here for a precise reason: if players could send FIM wallet-to-wallet outside the order book, they could rearrange the wealth distribution—and therefore the Gini score the whole game is measured by—through private transfers the market never sees.

Forcing every movement of FIM through the observable Exchange guarantees that each shift in wealth is recorded on-chain, priced, and subject to the trade fee, so the Gini metric always reflects the true distribution and cannot be quietly manipulated off-book. It also means the counterparty-selection mechanic (D1) cannot be bypassed: there is no side door around the transparent market. The cost of this choice is that FIM is unusable in any external venue or composable DeFi context, which is acceptable because FIM is a disposable, season-local game token with no purpose outside the game.

### 10.1. The Permanent Layer (Shared Across Seasons)

**`RGD.sol` (The Governance & Access Token)**

- **Function:** A minimal, fixed-supply ERC-20 (`ERC20Burnable`) that serves as the governance standard and the Sybil-Resistance key. \$RGD carries no bespoke game logic itself — the collateral accounting lives in `Staking`, and access checks live in the seasonal `Auction`.

- **Supply Logic:** The token uses a rigid supply model (1,000,000,000 \$RGD), minted once at construction (the Token Generation Event) to prevent arbitrary dilution. Being `ERC20Burnable`, supply can only ever decrease.

**`Staking.sol` (The Identity & Governance Hub)**

- **Function:** Manages the staking of \$RGD to enforce the "Skin in the Game" rule and to track governance weight. It enforces the High-Water Mark (MAX) rule by recording the **exact \$RGD amount** locked per season (`seasonLocks`) and requiring the staked balance to cover the largest single lock (`requiredRegStake`). One stake can therefore collateralize multiple active seasons simultaneously.

- **Governance Checkpointing:** Each stake/unstake writes a `(blockNumber, value)` checkpoint, allowing off-chain governance interfaces (Snapshot) to query a user's staked balance at a historical block height — the basis for flash-loan-resistant voting power.

- **Locking Mechanism:** A player cannot unstake \$RGD if doing so would drop their balance below `requiredRegStake` — i.e. below the collateral still locked by any active season they joined. Locks are released back to the player when they claim their payout at season end (`releaseCollateral`). The `Staking` contract exposes three additional entry points used exclusively by the approved `Exchange`: `reserveCollateral` (locks collateral when a bid is placed), `releaseCollateralPartial` (frees collateral when a bid is cancelled or filled from the seller's side), and `adjustCollateral` (atomically releases the seller's lock and adds the buyer's lock on a completed trade). Together these ensure the invariant `seasonLocks == (FIM held + FIM committed in open bids) × rgdWeiLockedPerFim` is maintained across the full secondary-market lifecycle.

### 10.2. The Governance & Administrative Layer

**`GameController.sol` (The Rules Engine)**

- **Function:** The administrative hub that orchestrates season creation. It does not itself contain a global collateral ratio; instead `startNewSeason` forwards a full set of per-season parameters (durations, victory threshold, base multiplier, treasury splits, existential threshold, the `rgdWeiLockedPerFim` collateral lock, and the verification bond) to a dedicated `SeasonFactory`.

- ***The `SeasonFactory`:*** A separate contract whose sole job is to deploy and wire a season's four disposable contracts (`GameSeason`, `Auction`, `Exchange`, `FIM`) in one transaction, renounce/transfer their ownership appropriately, and return their addresses. `GameController` then registers the season and grants it the necessary `Staking` and `Treasury` approvals. Because `GameSeason` and `Exchange` have large constructors, their creation bytecode is held in two lightweight sub-deployer contracts (`GameSeasonDeployer` and `ExchangeDeployer`) deployed once in `SeasonFactory`'s constructor, keeping the factory within the EIP-170 24 576-byte runtime limit.

- ***The Season Manifest:*** The game rules are authored off-chain in `config/seasonManifest.json` (the "SeasonManifest") and read by the deployment script, which passes them into `startNewSeason`. Financial splits are in basis points; durations are in seconds. **Every value in the SeasonManifest is a per-season parameter, not a hard-coded protocol constant.** Each is bound to a single season at creation time and is subject to change between seasons through DAO governance: any figure quoted in this paper (auction and game durations, victory threshold, base multiplier, treasury splits, existential threshold, the `rgdWeiLockedPerFim` collateral lock, the trade fee, the verification bond, etc.) reflects a current proposal, and the value used for any given season is whatever a passed Snapshot proposal — executed on-chain by the Execution Council via `startNewSeason` — has ratified for that season. This lets the DAO tune the economic rule-set season over season (e.g. adjusting the multiplier or victory threshold) without redeploying the core protocol.

- **Governance Interface:** `GameController` is `Ownable`; `startNewSeason` is `onlyOwner`. Ownership is held by the **Execution Council multisig**, so no new season can be created without the Council's signature acting on a passed proposal.

**`Treasury.sol` (The Automated Vault)**

- **Function:** A vault (`Ownable`, owned by `GameController`) responsible for principal custody and yield deployment.

- **JIT Asset Management:** The Treasury supplies idle USDC to **Aave V3** to generate yield (`depositPrincipal`) and withdraws only when required for payouts (`payWinner`).

- ***Multi-Ledger Accounting:*** It tracks `seasonPrincipals` per season alongside a `totalGlobalPrincipal`, ensuring the principal owed to one season is never paid out to another. With multiple seasons live at once, yield is attributed **per season by its share of global principal**: when a season harvests, it realizes only `totalYield × seasonPrincipal ÷ totalGlobalPrincipal` and leaves the remaining seasons' yield untouched in the pool to be realized at their own harvest. A season can therefore never drain the yield earned on another season's capital.

- **Season-Locked Policies:** Each season's revenue policy (Buyback / Liquidity / Prize-Pool-reinvest / DAO basis points) is snapshotted at deployment via `setSeasonPolicy` and must sum to 10 000. `harvestAndExecutePolicy` applies these splits **to that season's realized yield only** — never to principal: the DAO and liquidity shares are transferred to their recipient addresses, the prize-pool share is reinvested by adding it back to the season's principal, and the buyback share is forwarded as USDC to a `buybackRecipient`. The Treasury forwards that share for the DAO-controlled recipient to execute separately, rather than performing an automatic on-chain buy-and-burn of \$RGD—a design that avoids an exploit vector.

- ***Trading-Fee Ingress:*** The seasonal `Exchange` charges a per-fill trade fee that flows into the Treasury via `collectTradingFee` and is credited **in full to the originating season's prize pool** (added to `seasonPrincipals`). This makes the prize pool that game-aligned players compete for grow with trading activity, taxes purely speculative flow, and — critically — makes attempts to wash-trade the Solidarity-Fund metric cost real, unrecoverable money on every leg.

- **Emergency Principal Recovery:** An owner-only `sweepSeasonPrincipal(season, to)` function allows the Execution Council to recover residual USDC principal for a given season (withdrawing from Aave if needed) and send it to a specified address. This function is the on-chain counterpart to `GameSeason.sweepUnclaimed` and is called by that function after the 365-day lockout elapses.

### 10.3. The Seasonal Execution Layer (Disposable Contracts)

**`Auction.sol` (Capital Ingress Mechanism)**

- **Function:** Manages the initial capitalisation phase.

- **Gated Entry:** `buyFIM` computes the required lock as a fixed `rgdWeiLockedPerFim × (FIM purchased)` and calls `Staking.registerCollateral`, which reverts unless the buyer's staked \$RGD covers the new high-water mark. The lock remains bound to the player until they claim at season end.

- **Accountability Tracking:** Each purchase records the player's committed capital through `GameSeason.updateLedger`.

**`Exchange.sol` (The Peer-to-Peer Order Book)**

- **Function:** A transparent, peer-to-peer limit order book. There is no AMM and no automatic matching engine.

- **Mechanism Design:** A Maker calls `createOrder(isBuy, fimAmount, usdcPrice)`, escrowing USDC (for a bid) or \$FIM (for an ask) into the contract. A Taker chooses a specific order and calls `fillOrder(orderId)` (full fill) or `fillBatch(orderIds[], amounts[])` (partial / multi-order fills). Because the Taker selects the exact counterparty by `orderId`, every trade is a deliberate choice of *whom* to trade with. `cancelOrder` refunds the Maker's escrow and releases any reserved collateral.

- **Collateral Lifecycle:** The `Exchange` is approved in `Staking` and calls back into it at every step. When a **bid** (buy order) is placed, `reserveCollateral` locks the buyer's \$RGD upfront — the order cannot be created if the buyer is under-collateralized. When a bid is filled, `releaseCollateralPartial` frees the seller's lock as their FIM leaves them (the buyer's reservation already covers the newly acquired FIM, so no second lock is added). When an **ask** (sell order) is filled, `adjustCollateral` atomically releases the seller's lock and adds the buyer's lock, reverting the entire fill if the buyer cannot cover it. On cancel or end-of-season `settleOrders`, any reserved bid collateral is released via `releaseCollateralPartial`.

- **Trade Fee:** Every fill carries a protocol fee on the USDC leg, set per season by the `tradeFeeBps` parameter in the `SeasonManifest` (default `100` bps = 1 %). The fee is **borne by the Taker** — the Maker always receives (or pays) exactly their quoted price — and is routed in full into the season's prize pool. The fee both monetises speculative flow and economically deters wash-trading of the Net-Contribution metric (see §9.5).

- **Strategic Rationale:** This friction forces participants to evaluate each counterparty's impact on the Gini Coefficient — the counterparty's identity is the Maker's `owner` address, and balances are queryable from `GameSeason`.

- **Ledger Sync:** Every fill calls `GameSeason.updateLedger` so the season's authoritative \$FIM balances and net-contribution figures stay consistent with on-chain settlement. When a season is finalized, `GameSeason` flips the Exchange into settlement mode (`openSettlement`); anyone can then drain still-open orders and refund their escrow to the Makers in bounded slices via the paginated, permissionless `settleOrders(maxCount)`, so settlement can never exceed the block gas limit.

**`GameSeason.sol` (The State Machine & Arbiter)**

- **Function:** The autonomous referee managing season state and settlement.

- **The Phase Engine:** An internal `State` enum surfaces to clients through `getPhase()` as the human-readable lifecycle `AUCTION → BOOTSTRAP → TRADING → SETTLING → PAYOUT`. `getPhase()` returns the distinct string `AUCTION` while the capital-formation window is open; once it closes, the season reports `BOOTSTRAP` until `G_initial` is established, then `TRADING`. The internal `CALCULATING`/`DISTRIBUTION` states surface as `SETTLING`/`PAYOUT`. The season remains in `DISTRIBUTION` (`PAYOUT`) indefinitely so latecomers can always claim.

- **The Bootstrap Phase:** After the auction window closes, trading stays paused until `G_initial` is established. `startBootstrap` opens the batch, `processBatch` consumes the sorted player set, and `finalizeBootstrap` records `G_initial` and transitions to `ACTIVE`.

- **Trustless Verification (The Arbitrator):** Any external actor (a Keeper or Bot) drives a state transition by posting a USDC bond (`bondAmountUsdc`), which makes them the season's `settlementStarter`. **Only that bonded starter may submit batches** via `processBatch`, and the set must be in **ascending balance order**; the validation logic enforces a sort check, a no-duplicates check, and the dust filter (`existentialThresholdFim`). Gating batch submission to the bond-poster prevents a griefer from poisoning a partially-processed batch into an unfinalisable state; should a starter abandon a batch mid-flight, the Execution Council can reassign it with `resetSettlement`. On a successful finalization the bond is returned to the starter; an attempted settlement that does not yet meet a victory or time condition forfeits the bond **to the DAO** (routed to the `daoRecipient`, not the Treasury balance, so it is never miscounted as yield).

- **The Multiplier Logic:** Applies the compensation formula `M = β + (1 − G_initial)²` (all in basis points) in favour of the Proletarian faction.

- **Settlement Engine:** On a triggering condition `finalizeGame` locks state, opens Exchange settlement, harvests Treasury yield, and snapshots the final prize pool (`finalPoolSize`), then moves to `DISTRIBUTION`. Payouts are computed **lazily, per player, at claim time** (`claimPayout`), so finalization cost is independent of the player count. `claimPayout` **always releases the player's \$RGD collateral and burns their \$FIM — even when their payout is zero** — so no player's stake can ever be stranded by an ended season; USDC is transferred only when a payout is owed.

- **Payout Preview:** The view function `computePayout(player)` returns exactly what a player would receive from `claimPayout` right now, enabling frontends to display pending rewards without requiring a transaction. It returns 0 before settlement, for already-claimed players, and for players below the existential threshold.

- **Unclaimed-Principal Sweep:** If any USDC principal remains unclaimed 365 days after the season enters `DISTRIBUTION`, the owner (Execution Council) may call `sweepUnclaimed(to)`, which forwards the season's residual principal from the `Treasury` to the specified address. This 1-year lockout gives every participant ample time to claim before any administrative recovery is possible.

**`FIM.sol` (The Seasonal Asset)**

- **Function:** A restricted ERC-20. `mint` is callable only by the season's `Auction`, `burn` only by its `GameSeason`, and `transfer`/`transferFrom` are gated so that only the `Exchange` can move tokens — forcing every value transfer through the observable order book.

### 10.4. Autonomous Execution Framework

**The Keeper Strategy and Progressive Decentralisation:**

1. **Bootstrap Phase (Federated Automation):** Protocol Administrators operate the primary Keeper nodes.

2. **Maturity Phase (Open Competition):** Keeper functions exposed to the public market.

3. **Institutional Phase (Network Integration):** DAO may integrate with Chainlink Automation.

**The End-of-Season "Finalization Cascade":**

1. *Trigger:* The bonded Keeper (`settlementStarter`) posts the USDC bond via `startSettlement()` (the same bonded-crank mechanism used by `startBootstrap()` to establish `G_initial`), submits the sorted player set through `processBatch()`, then calls `finalizeGame()`.

2. State Locking: If a victory or the time limit is met, game state is frozen (`CALCULATING → DISTRIBUTION`) and the Exchange is flipped into settlement mode; open orders are then drained permissionlessly in bounded slices via `settleOrders`.

3. Settlement Calculation: Winning faction and final progress are determined and the final prize pool is snapshotted (`finalPoolSize`); individual payouts are computed lazily, per player, when each calls `claimPayout`.

4. Treasury Routing: `harvestAndExecutePolicy` realizes this season's pro-rata Aave yield and applies the revenue policy; the season's prize pool is sized from `getSeasonPoolSize`.

5. Incentivisation: The Keeper's bond is returned on a successful finalization (a premature settlement attempt instead forfeits the bond to the DAO, discouraging spam).

**The Operational Lifecycle:** Auction → Bootstrap → Trading → Settling → Payout

### 10.5. Mainnet and Testnet Deployments

The same contract suite deploys in two profiles, chosen automatically by the network it runs on.

On **Base mainnet**, the contracts described above run in full: \$RGD launches through the real Auction, trades clear in real USDC against live liquidity, and the Treasury earns yield on a live lending market. This is the production game, played for real stakes.

On the **Base Sepolia testnet**, the protocol runs against stand-ins for those external dependencies—a mock USDC, a mock lending pool and swap router, and a faucet that hands out play-money USDC on request. Everything else behaves exactly as it does on mainnet, which serves two purposes. First, it lets the entire system—seasons, settlement, payouts—be exercised end to end and hardened before a single real dollar is at stake. Second, it is where the testnet quest campaign is played: the proving ground on which founding participants earn their place in the launch distribution (see §14).

---

# Part IV: The Economic Framework

## 11. Tokenomics & Governance

Ownership of this market is something participants literally hold. The token design below is what makes "ruled by the players" a concrete arrangement—it defines who governs the rules and who shares in the value the market creates.

**The economic architecture of Regarded Games uses a Dual-Token System**, separating the short-term seasonal game state from the permanent governance and value-accrual layer.

### 11.1. The Seasonal Operational Unit: \$FIM (Fake Internet Money)

- **Classification:** Seasonal Utility Token.

- **Function:** \$FIM serves exclusively as the currency for the active game, with no external rights or governance power.

- **Lifecycle:** Minted during Auction, traded during the active Season, and becomes useless once the season ends.

### 11.2. The Sovereign Asset: \$RGD

- **Classification:** Governance and Access Token.

- **Function:** \$RGD represents ownership over the Regarded Games protocol.

- ***Intrinsic Utility (Access):*** Staked \$RGD is required to play the game. The seasonal `Auction` locks \$RGD collateral on entry, ensuring that only participants with a long-term stake in the protocol can influence the game economy.

- **Value Accrual (Dynamic Revenue Allocation):** The yield earned on each season's USDC principal (the surplus over principal generated on Aave) is split by a DAO-ratified, season-locked policy across four streams:

1. **Buyback:** The buyback share is forwarded as USDC to a DAO-controlled `buybackRecipient`, which executes any buyback separately rather than through an automatic on-chain swap-and-burn—a design that closes an attack vector.

2. **Liquidity Deepening:** Sent to a liquidity recipient to support protocol-owned liquidity and market stability.

3. **Prize-Pool Reinvestment:** Added back to the season's principal, increasing the payout pool for participants.

4. **DAO / Operations:** Sent to the DAO recipient to fund ongoing operations.

In addition to Aave yield, the seasonal `Exchange` **trade fee** (default 1 %, configurable per season via `tradeFeeBps`) is a second revenue stream: it accrues directly to the active season's prize pool, so trading activity and speculation continuously deepen the pot that participants compete for.

### 11.3. Supply Distribution

**The total supply of \$RGD is fixed at 1,000,000,000 tokens.**

| Category | Allocation | Total Tokens | Purpose and Vesting Schedule |
|---|---|---|---|
| **DAO Treasury Reserve** | 40% | 400,000,000 | **Long-Term Capital.** Controlled by governance; held in the `Vesting` contract under a long-horizon unlock. |
| **Growth & Ecosystem** | 20% | 200,000,000 | **User Acquisition.** Funds incentives and marketing; held in the `Vesting` contract. |
| **Core Contributors (Team)** | 15% | 150,000,000 | **Team Alignment.** `Vesting` schedule of 4 years total with a 12-month cliff. |
| **Operational Reserve (LLC)** | 10% | 100,000,000 | **Legal & Infrastructure.** Held in the `Vesting` contract; managed by the DAO LLC. |
| **Market Formation** | 15% | 150,000,000 | **Market Initialisation.** 5% Capital Auction / 5% Liquidity Pool / 3% Testnet Quests / 2% Airdrops. See Section 13. |
| **Total** | 100% | 1,000,000,000 |
## 12. How Ownership Is Released Over Time

The same principle that governs the market governs its ownership: it should be earned by the people who build and play it, not auctioned to whoever brings the most capital on day one. The allocation itself is set out in §11.3; this section explains the *timing*—why ownership is released slowly rather than all at once—which is what keeps the very concentration the protocol critiques from re-forming at the level of governance.

**The release schedule favours long-term stability over short-term speculation.** Only 5% of the supply is in circulation at the start, the opening state of a model in which ownership is earned gradually over time.

### 12.1. Why the Float Starts Small

Keeping the circulating supply small at launch holds back the pump-and-dump cycle and lets the token's price form around real use of the game rather than launch-day hype. Of the allocation in §11.3, fully 75% belongs to the community—the DAO Treasury, Growth & Ecosystem, and Market Formation tranches combined—and almost all of it is released over time rather than handed out at launch. The effect is that most of the governance power is earned by the players, builders, and contributors who add value to the network, rather than sold to whoever bids highest on day one.

### 12.2. Aligning the Team with the Long Run

The founding team's tokens vest over four years behind a one-year cliff, which ties their stake to the long term: they can only profit by sticking around. Their financial success depends entirely on the DAO thriving over many years, which puts the builders and the holders on exactly the same side.

## 13. Liquidity Initialization and Capital Controls

A market owned by its participants has to be *launched* in a way that honours that ownership—without a privileged tranche of insiders positioned to extract from everyone who arrives later. The instantiation mechanics below bind the launch to the public allocation rules rather than to anyone's discretion.

### 13.1. The Token Generation Event

The RGD economy is created in a single Token Generation Event (TGE), anchored by the `CapitalAuction` contract. The entire fixed supply of 1,000,000,000 RGD is minted **into `CapitalAuction`** at deployment. When the auction window closes, anyone may call `finalize()`, which atomically: pairs 100% of the raised USDC with the 5% Liquidity tranche into a Uniswap V2 pool; sends the 5% sale tranche's pro-rata claims to depositors; routes the 85% vesting allocation to the `Vesting` contract; routes the 3% testnet-quest allocation to the `TestnetRewardDistributor`; and routes the 2% airdrop allocation to its recipient — and starts the vesting clocks (`Vesting.init` / `TestnetRewardDistributor.init`) in the same transaction. This binds the live distribution strictly to the allocation table in Section 11.3.

### 13.2. The Genesis Allocation Split

The 15% of supply allocated to Market Formation is divided into four tranches to ensure decentralised ownership and a deep, stable secondary market:

1. **Capital Formation Auction (5% / 50M \$RGD):** Offered via a Batch Auction to determine a single uniform Clearing Price. Participants commit USDC during the window (`deposit`) and, after `finalize`, `claim` their pro-rata share of this tranche.

2. **Liquidity Pool (5% / 50M \$RGD):** Paired with 100% of the USDC raised in the auction to establish the initial Uniswap V2 market.

3. **Testnet Quests (3% / 30M \$RGD):** Distributed to founding community members via the Contribution Score mechanism through the `TestnetRewardDistributor`. 25% is liquid at TGE to facilitate Season 1 participation, with the remaining 75% vesting linearly over 180 days.

4. **Airdrops (2% / 20M \$RGD):** Reserved for direct community airdrops.

### 13.3. Opening the Market at the Auction Price

**The Uniswap V2 pool that `finalize()` creates (§13.1) opens the secondary market at parity with the auction.** Because the sale tranche and the liquidity tranche are the same size—5% each—the pool's opening price is exactly the clearing price the auction discovered, so there is no gap between the auction price and the first day of trading. To protect the genesis listing from front-running, `finalize()` refuses to deposit if the \$RGD/USDC pair has been pre-created and seeded with skewed reserves, and supplies liquidity with non-zero minimum-amount bounds rather than accepting any ratio; an owner-only `recoverToken` escape hatch (disabled once finalized) allows recovery if such a griefing attempt blocks the listing.

### 13.4. Locking the Liquidity (Protocol-Owned Liquidity)

**To guarantee the market stays solvent and to remove the risk of anyone pulling the liquidity, the Uniswap V2 LP tokens created by `finalize()` go straight into the `Vesting` contract on their own schedule.** That schedule has a 12-month cliff and a multi-year linear release, so the founding liquidity cannot be withdrawn at launch. The position is released to the DAO gradually over the vesting period, turning the initial seed capital into long-lived Protocol-Owned Liquidity (POL) that keeps the market liquid. *(On the public testnet there is no Capital Auction; instead the deploy script seeds the mock Uniswap V2 router with 5% of supply plus mock USDC so a working \$RGD/USDC market exists for testing.)*

---

# Part V: Strategic Execution

## 14. Growing the Community and Distributing Ownership

**The growth plan starts from a simple premise: a healthy decentralized network needs a committed, thoughtful core of people who actually understand it.** It runs in two stages—first an organic stage that draws those people in before launch, then a genesis stage that distributes ownership to the ones who showed up and contributed.

### 14.1. Stage One: Drawing in the Right People (Pre-Launch)

The first goal is to reach people who can grasp the game theory and economic design the protocol is built on.

- **Writing that explains the thesis.** Rigorous analysis of how the protocol works and the thinking behind it, published on open platforms (such as Mirror) and shared through social channels.

- **Showing up where these people already are.** Taking part in DAOs, strategy-gaming communities, and DeFi governance forums to find engaged, high-agency contributors.

- **Building in public.** Developing in the open to establish a verifiable track record, so trust is earned before anyone is asked to commit capital.

### 14.2. Stage Two: Earning a Founding Stake (The Genesis Airdrop)

**The DAO's ownership is first spread out through the Genesis Airdrop**, drawn from the two community tranches of the Market Formation allocation—the 3% Testnet Quests share (handed out trustlessly through the `TestnetRewardDistributor`) and the 2% Airdrops share. *This is a targeted distribution, designed to find and reward the protocol's founding participants. Each person's allocation is calculated directly from a Contribution Score (CS), earned through a structured Testnet Quest Program that spans community participation, spreading the word, and playing live seasons.*

**The Contribution Scoring Function**
CS_p = S_community + S_spread + S_testnet

**S_community — Join the Community**

- *Follow on X:* 50 pts (Galxe Quest)

- *Join Discord:* 50 pts (Galxe Quest)

- *Log in to Discourse:* 50 pts

- *Strategic Voice Bonus:*

  - *Join the discussion on Discord or Discourse:* up to 400 pts

  - *Vote on the Mainnet Season 1 Season Manifest (Discourse):* 200 pts

**S_spread — Spread the Word**

- *Retweet on X:* 200 pts (Galxe Quest)

- *Referrals 1–10:* 50 pts each

- *Referrals 11–35:* 20 pts each

- *Referrals 36–100:* 5 pts each

**S_testnet — Dominate the Testnet**

- *Use the faucet to claim fakeUSDC:* 50 pts

- *Exchange fakeUSDC for \$RGD:* 50 pts

- *Stake \$RGD:* 50 pts

- *Buy \$FIM during the Auction:* 50 pts

- *Buy or sell \$FIM during the Trading Phase:* 50 pts

- *Claim payout:* 50 pts

- *Win the Game (Efficiency Rank):* 0–1,000 pts, scaled linearly by relative seasonal performance — the top relative gainer receives 1,000 pts; the top relative loser receives 0.

## 15. Where Players Coordinate

Coordination happens in two distinct social spaces, which together form the DAO's deliberative layer—where players talk, debate, and organize before anything reaches the executive layer (the Snapshot vote and the Council that carries it out).

### 15.1. The Parliament (Discourse)

The hosted forum at Discourse serves as the public square and legislative house for all RGD holders. Key functional features include:

- **Proposal Incubation (The RFC Pipeline):** Governance proposals are refined and debated prior to formal on-chain ratification.

- **Post-Mortem Analysis and Archiving:** A permanent repository for game theory analysis and seasonal reviews.

- **Ideological Manifestos:** A venue for factions to publish long-form philosophical arguments.

### 15.2. The War Rooms (Token Gated Discourse Board and Chat)

Tactical coordination and real-time market operations. Key features include:

- **Faction-Specific Strategy Rooms:** Utilising Token Gating for faction-specific private and public spaces.

- **Dynamic Role Management (Capitalists vs. Proletarians):** Access strictly determined by FIM holdings, with automatic role assignment.

- **Market intelligence and alerts:** Live feeds from on-chain events let factions react the moment the Gini Coefficient moves. By giving these social spaces real structure, Regarded Games makes the human "meta-game" of coordination as demanding and strategically rich as the on-chain play itself.

## 16. How the Protocol Is Secured

Protecting the DAO's treasury and the capital players commit to it is the protocol's first operational priority. Security is built in layers, run through Immunefi—the Web3-native security platform—in two stages: an intensive audit competition that hardens the code before launch, and a permanent bug bounty that keeps it under scrutiny for the protocol's whole life. Both sit on top of a fully open codebase that anyone can inspect for themselves.

### 16.1. Before Launch: An Audit Competition

Before Season 1 goes live on mainnet, the full contract suite goes through an audit competition on Immunefi: a time-boxed, crowdsourced review in which a fixed prize pool is opened to the platform's security researchers, who compete to find as many flaws as possible within the window. Because the contest happens before the token exists, its prize pool is funded and paid in **USDC**, a fixed, real-value reward that researchers can price from day one. The method turns money into security: a substantial pool draws many independent reviewers to attack the code at once, a concentrated trial-by-fire that is unusually good at surfacing obscure, edge-case bugs a single reviewer would miss.

### 16.2. After Launch: The Guardian Programme

Once the protocol is live, a permanent bug bounty—the **Guardian Programme**, also on Immunefi—keeps the contracts under standing scrutiny for the rest of the protocol's life, rather than checked once and forgotten. Its purpose is to make honesty the rational choice: by paying a verified disclosure reliably more than an exploit would yield, it gives any researcher who finds a flaw a stronger incentive to report it than to abuse it.

Because the Guardian Programme runs after the Token Generation Event, its rewards are funded from the DAO Treasury Reserve and paid in \$RGD, valued at the market price. Following Immunefi's scaling-bounty standard, payouts are denominated in USD and scaled to the severity of the flaw—a critical disclosure that could have drained the treasury commands the largest reward, up to a defined share of the funds it would have put at risk, with lower-severity findings rewarded proportionally. The DAO ratifies the exact reward bands for each season, so the bounty scales with the value the protocol actually holds.

### 16.3. Transparency and Verifiability

The codebase remains fully open-source and verified on block explorers, in keeping with the ethos of "Don't Trust, Verify." Anyone—researcher, player, or auditor—can read exactly what the contracts do, which is what makes both the audit competition and the bounty effective: there is nothing hidden to attack and nothing hidden to defend.

## 17. Risks and How They Are Managed

Building something new in economics carries real uncertainty. We are open about the main risks and the structural choices made to manage each one.

### 17.1. A Bug in the Contracts

- **Risk:** An undiscovered vulnerability in the code could lock or drain funds.

- **Mitigation:** A pre-launch audit competition and a continuous, treasury-funded bug bounty (the Guardian Programme), both run on Immunefi, an open codebase under standing public scrutiny, and an emergency pause that the Guardian/Council can trigger to halt the system if something goes wrong.

### 17.2. Regulatory Uncertainty

- **Risk:** The rules governing DAOs and digital assets are still young and changing fast.

- **Mitigation:** A Wyoming DAO LLC gives individual contributors a liability shield and a formal entity that can retain legal counsel to keep monitoring compliance as the landscape shifts.

### 17.3. A Flaw in the Game's Design

- **Risk:** A clever player finds a way to game the mechanics and make the contest one-sided or pointless.

- ***Mitigation:*** The game is built to improve under pressure. When a season exposes a weakness, the DAO uses its governance power to patch the rules—adjusting the multiplier or the victory threshold—for the next season. The game evolves in response to how its players actually play it.

### 17.4. Not Enough Players or Liquidity

- **Risk:** The protocol might not attract enough players or liquidity to generate meaningful yield for the governance token.

- **Mitigation:** 20% of the supply is set aside for Growth & Ecosystem—a long-term subsidy that funds tournament prizes and outreach to build momentum until the protocol sustains itself.

---

# Part VI: Conclusion & Future Vision

## 18. Conclusion: The Clean Room of Finance

**At its core, Class War: The Game is a perfect-information, real-money market that rewards strategy and nothing else.** Victory comes down to one thing: how well a player can read a complex economy and coordinate with others toward a shared goal. It puts a direct question to everyone who trades: given perfect information, instant data, and rules everyone can see, can you out-think the competition? For too long, ordinary participants in stocks and crypto alike have played in an environment where insiders hold an unbeatable edge built from privileged information and overwhelming capital. By removing those two advantages from the structure itself, the protocol opens a "clean room" for human coordination in its purest form—a market where smart money may play but cannot cheat.

But the deepest result is not who wins a season. It is what the market reveals once the cheats are gone and the rule-book is handed to the people who trade under it. Players discover, through real stakes rather than any sermon, that on a level field their own best outcome is bound up with the collective's—and they discover that the dial which balances the whole economy is theirs to set, in the open, by vote. That is the realisation the protocol exists to produce: that decentralized governance is not a slogan but a working machine for fairness and participation, and that this—handing ordinary people the tools to rebuild the economy on equitable terms and to own the rules that govern it—is what distributed-ledger technology was for all along. The market is a war, but for the first time the weapons are distributed equally, and the rules belong to the people holding them. The game is the lesson; the lesson is that a fairer market is something we can simply choose to build.

## 19. Roadmap & Future Vision

The protocol grows in phases, proving the core game is stable before adding complexity on top of it. Where it goes from there is decided entirely by the DAO, so every expansion follows the community's direction.

| Phase | Status | Key Milestones |
| :--- | :--- | :--- |
| **Phase 1 — Foundation** | **Complete** | Conceptualisation, Architecture, Dual-Token Economic Design, Legal Structure  |
| **Phase 2 — Build** | **In Progress (Q1–Q2 2026)** | Core Smart Contract Development on Base Network, dApp (Exchange, Trading Terminal, Community) Build-Out, Finalisation of the Collateral Mechanism, Pre-Launch Community Seeding. |
| **Phase 3 — Testnet** | **Q3 2026** | Public Testnet Launch on Base Sepolia, Community Genesis Period (Testnet Quests earning the Genesis Airdrop), Immunefi Audit Competition, Establishment of the Execution Council. |
| **Phase 4 — Mainnet** | **Q4 2026** | \$RGD Token Generation Event (TGE) & Capital Auction — `finalize()` distributes the Genesis Airdrop and opens the secondary market — Mainnet Launch on Base, Game Season 1, Guardian Programme (Immunefi Bug Bounty), Hybrid Governance (Snapshot + Council) Activated. |
| **Phase 5 — Expansion** | **Beyond** | Implementation of DAO-approved new game modes and ecosystem expansion. |

### 19.1. Future Vision: The Evolution of the Game

The first game mode sets the baseline. From there, the DAO can keep adding new modes to test players in new ways and deepen the game's strategy—each one a demonstration that the fair field is a space the players themselves can reconfigure, not a single fixed game. Possibilities include:

- **The "Volatile Asset" mode:** Players mint the game token by depositing real, volatile crypto (for example, minting Fake Internet Coins, \$FIC, against ETH or WBTC) instead of a stablecoin. This adds a demanding new layer: the Gini Coefficient would shift not only from trading but from the real-world price swings of the collateral itself, testing a faction's ability to steer a genuinely chaotic, many-variable economy.

- **The "Equal Start" mode (the Proletarian Arena):** The open-ended auction is replaced with a fixed buy-in—every player purchases the same set amount of FIM—so the season starts from a Gini Coefficient of exactly 0.0, perfect equality. From there the game becomes a pure test of play, pitting the Capitalist faction's ability to build inequality out of a perfectly level start against the Proletarian faction's ability to defend it.

---

# Appendices

## 20. Appendix A: Formal Mechanics & Mathematical Notation

This appendix states the game's core mechanics precisely, in mathematical form, for readers who want the exact definitions behind the prose.

### 20.1. Definitions

*Let P = {p_1, p_2, ..., p_n} be the set of n players in a game season.*

*Let t_i be the balance of \$FIM tokens held by player p_i.* *Let T = Σ t_i be the total supply of \$FIM tokens.* Let c_i = MoneyIn_i - MoneyOut_i be the Net Contribution of player p_i.

*Let P\* ⊆ P be the **eligible set**: the players whose balance clears the existential (dust) threshold, `t_i ≥ existentialThresholdFim`. Let A = Σ_{p_i ∈ P\*} t_i be the **accumulated (dust-filtered) supply**.* The 50%-of-supply **boundary** is always taken against the raw total `T` (so dust cannot shift the cut), but every payout **share** is divided by the eligible accumulated supply `A` — never by `T` — so excluded dust holders neither receive a payout nor dilute anyone else's. (On-chain: `T` = `totalSupply`, `A` = `accumulatedSupply`; the contract divides each share by `accumulatedSupply`.)

### 20.2. Gini Coefficient (G)

**The Gini Coefficient is calculated as:**
G = (Σ_i Σ_j |t_i - t_j|) / (2 × n × Σ_i t_i)

This formula is computed off-chain by the Solver Bot and verified on-chain via sorted batch processing to establish G_initial (during the Bootstrap Phase) and G_current (during the Settlement Phase).

**Victory Conditions:** Let V_thresh = 0.25 be the Victory Threshold. *Let M = 1.2 + (1 - G_initial)² be the Compensation Multiplier (the base, β, is the governance-tunable `baseMultiplierBps`, currently 1.2).* *The Capitalist Faction wins if:* `(G_current - G_initial) / (1 - G_initial) ≥ V_thresh` *The Proletarian Faction wins if:* `((G_initial - G_current) / G_initial) × M ≥ V_thresh`

### 20.3. Payout Logic Formalization

**Oligarchy Payout (Capitalist Win):** - Let O ⊂ P\* be the subset of eligible players of minimum cardinality |O| such that Σ_{p_i ∈ O} t_i ≥ 0.5 × T. - For a player p_j ∈ O: `Payout_j = PrizePool × (t_j / Σ_{p_i ∈ O} t_i)` - For a player p_k ∉ O: `Payout_k = 0` **Solidarity Fund Payout (Proletarian Win):** - Let P_M ⊆ P\* be the "Masses," the largest subset of eligible players such that Σ_{p_i ∈ P_M} t_i ≤ 0.5 × T. - Let s_i = PrizePool × (t_i / A) be the theoretical proportional share for each eligible player p_i (divided by the dust-filtered accumulated supply A, **not** by T).

- *Let Cap_Value = max({s_j | p_j ∈ P_M}).*

- *The confiscated amount for a player p_k is: `Confiscated_k = max(0, s_k - Cap_Value)`* - The Solidarity Fund F_S = Σ Confiscated_k.

- *A player p_j's final payout: `Payout_j = min(s_j, Cap_Value) + (F_S × (max(0, c_j) / Σ max(0, c_i)))`*

## 21. Appendix B: Game Theory Considerations

Regarded Games is applied game theory. Its rules are built to lead players toward specific strategic insights and to close off common exploits by design.

### 21.1. The Core Dilemma: the Individual against the Collective

The game is a classic many-player dilemma. The obvious move for any single player, requiring no coordination, is to act in immediate self-interest—buy low, sell high, maximize personal USDC profit. But each such trade, made without regard for who is on the other side, tends to push the Gini Coefficient up and help the Capitalist side. If every ordinary (non-whale) player follows that simple instinct, together they hand the Capitalists a victory in which they themselves almost certainly win nothing. The best outcome for the majority requires solving the coordination problem and acting together for a Proletarian victory.

### 21.2. The Equilibrium and the Learning Effect

Looked at one player at a time, the apparent equilibrium is to defect—to abandon the collective good for personal profit.

The game is built to expose that as a poor equilibrium for most players. The genuinely stable one is cooperation within a faction. The "learning effect" is what happens as players discover, through real money on the line, that their own best result is bound to the success of the collective they chose.

### 21.3. The Strategies This Creates: Gini-Aware Trading

Because the order book shows every counterparty's balance, a set of advanced strategies emerges that we call "Gini-aware trading." Where an ordinary market is only about price, players here must also weigh what each trade does to the Gini Coefficient.

- **The Proletarian premium:** A Proletarian player trying to reduce inequality will rationally pay *more* for tokens held by the biggest whales, because buying from a whale moves the distribution most in their favor.

- **The Capitalist discount:** A Capitalist player trying to increase inequality will rationally sell at a *discount* to an empty wallet, because creating a brand-new holder moves the distribution most in theirs.

- **Choosing whom to trade with:** Picking which order to fill is no longer just about the best price. It is a calculation in which the trade's effect on the Gini score weighs as heavily as the money.

### 21.4. How the Rules Shut Down Exploits

The protocol's rules are designed to hold up against the obvious attacks.

**The Sybil Consolidation Attack:**

- ***The Threat:*** A whale creating numerous "minion" wallets during the Auction to create an artificially low G_initial and then consolidating the FIM during the game.

- **The Mitigation:** The RGD collateral rule defends against this in two ways:

- **It costs too much.** Funding thousands of minion wallets becomes prohibitively expensive, because the attacker has to buy and lock a proportional amount of the governance token for every single wallet.

- **It turns the attacker into a stakeholder.** Forcing the attacker to hold a large RGD position puts their interests on the same side as the ecosystem's: any manipulation that damages the game would also sink the value of the RGD they are holding, so the attack works against itself.

**The Free-Rider Problem:**

- **The Threat:** A player might align with the Proletarian faction but contribute nothing, hoping to benefit from others' sacrifice.

- ***The Mitigation:*** Our Net Contribution payout metric solves this. It rewards financial sacrifice (MoneyIn − MoneyOut), ensuring that free-riders receive a proportionally smaller share of the Solidarity Fund.

**The Payout Sybil Attack:**

- **The Threat:** An adversary could create thousands of wallets to try and unfairly claim a share of the Solidarity Fund.

- **The Mitigation:** This is also countered by the Net Contribution metric. A wallet with no financial activity has a Net Contribution of zero and is therefore entitled to zero rewards from the fund, rendering this attack vector unprofitable and useless.

## 22. Appendix C: Glossary

**Clearing Price:** The single, uniform price per token determined at the conclusion of a Batch Auction, calculated by dividing the total capital committed by the total tokens offered. Every participant in the auction receives the same entry price.

**Credible Neutrality:** The principle that a system earns trust because its rules are fixed and transparent, beyond the reach of any single party that might bend them for its own gain.

**DAO (Decentralised Autonomous Organisation):** An organisation represented by rules encoded as a computer program that is transparent, controlled by the organisation members, and not influenced by a central government. **\$FIM (Fake Internet Money):** The non-investment, seasonal utility token used exclusively for gameplay within a single Regarded Games season.

**Gini Coefficient:** A statistical measure of distribution used to gauge economic inequality. A score of 0 represents perfect equality, and 1 represents perfect inequality.

**Net Contribution:** A core metric calculated as a player's total MoneyIn minus their total MoneyOut. It serves as a Sybil-resistant "Proof of Sacrifice." **Oligarchy:** In a Capitalist victory, the smallest group of top players whose combined FIM holdings equal or exceed 50% of the total supply. **\$RGD (Regarded Token):** The governance token of the Regarded Games ecosystem (ERC-20, fixed 1,000,000,000 supply, burnable). Holders govern the DAO and their staked balance is required as collateral to participate in the game.

**Capital Formation Auction (ILO):** The one-time `CapitalAuction` batch sale that bootstraps the \$RGD market at the Token Generation Event. Participants deposit USDC; on finalize, the raised USDC is paired with a protocol-owned liquidity tranche into a Uniswap V2 pool and depositors claim \$RGD pro-rata at a uniform clearing price.

**Vesting Contract:** The `Vesting` contract that custodies the Team, DAO Treasury, Growth, Operational (LLC), and protocol-owned-liquidity allocations, releasing them on per-schedule cliffs and linear vesting clocks started at the TGE.

**Solidarity Fund:** In a Proletarian victory, the fund created by capping the winnings of the elite players, which is then redistributed to all players based on their Net Contribution.

**Vesting:** The process of granting an owner full rights to their tokens over a set period. It is used to ensure long-term commitment from the team and stakeholders.
