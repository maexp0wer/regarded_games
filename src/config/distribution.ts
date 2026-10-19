// src/config/distribution.ts

/* ---- Distribution of power ----
   The initial $RGD supply as the rulebook's first section sets it out: two
   coalitions, what the community controls and what Team & Operations holds,
   each made of allocations, two of which split further. Shares are percent of
   the initial supply and sum to 100; the chamber seats one per percent.

   `ink` is the allocation's colour in the chamber and on the index: the brand
   hues stepped into the dark band for marks on the book's stock, so they stay
   apart for colour-blind readers too (adjacent pairs, with the chamber's gaps
   and the index's labels as the second cue). The community holds the
   Proletarian purple, and Team & Operations' two inks are both warm, of the
   Capitalist gold. A sub-allocation's `color` is its allocation's ink mixed
   over the book's stock, deeper for the larger share. */

export interface SubAllocation {
  name: string;
  share: number;
  color: string;
}

export interface Allocation {
  name: string;
  /** The name as it fits a chip under the chamber. */
  short: string;
  share: number;
  ink: string;
  explanation: string;
  subs: SubAllocation[];
}

export interface Coalition {
  name: string;
  share: number;
  explanation: string;
  allocations: Allocation[];
}

export const COALITIONS: Coalition[] = [
  {
    name: 'Community Controlled',
    share: 75,
    explanation: '75% of the initial $RGD supply is directly controlled by you, the DAO members.',
    allocations: [
      {
        name: 'DAO Treasury Reserve',
        short: 'Treasury',
        share: 40,
        ink: '#07AD70',
        explanation: 'Long-Term Capital. Controlled entirely by governance for future growth, acquisitions, or diversification. Subject to a 5-year linear unlock.',
        subs: [],
      },
      {
        name: 'Growth & Ecosystem',
        short: 'Growth',
        share: 20,
        ink: '#D7195F',
        explanation: 'Funds Active Incentives and marketing. Released based on DAO-approved milestones.',
        subs: [
          { name: 'Merkl Rewards', share: 5, color: '#9D174D' },
          { name: 'User Acquisition', share: 15, color: '#D7195F' },
        ],
      },
      {
        name: 'Market Formation',
        short: 'Market',
        share: 15,
        ink: '#9B4BDA',
        explanation: 'Distributed to early community participants and used to provide initial exchange liquidity to ensure Day 1 market stability.',
        subs: [
          { name: 'Genesis Program', share: 3, color: '#452762' },
          { name: 'Capital Auction', share: 6, color: '#733AA3' },
          { name: 'Liquidity Pool', share: 6, color: '#9B4BDA' },
        ],
      },
    ],
  },
  {
    name: 'Team & Operations',
    share: 25,
    explanation: 'Only 25% of the initial $RGD supply is not directly controlled by you, but distributed to the non-profit DAO LLC and vested among the founding Team for long-term alignment.',
    allocations: [
      {
        name: 'Team',
        short: 'Team',
        share: 15,
        ink: '#B88C03',
        explanation: 'Incentivizes the founding team. Subject to a 4-year vesting schedule with a 12-month cliff.',
        subs: [],
      },
      {
        name: 'Operational Reserve',
        short: 'Operations',
        share: 10,
        ink: '#9C5403',
        explanation: 'Allocated to the non-profit Regarded DAO LLC to cover real-world costs (legal compliance, audits, hosting). Managed via multi-sig with strict spending rules.',
        subs: [],
      },
    ],
  },
];

/** What one seat in the chamber stands for. */
export const SEAT_CAPTION = 'One seat = 1% of the initial $RGD supply';

/** Every allocation in seat order, with the coalition it sits in. */
export const ALLOCATIONS = COALITIONS.flatMap((c, coalition) => c.allocations.map((a) => ({ ...a, coalition })));

/** What the reader is looking at: a coalition, an allocation (by its index in
    ALLOCATIONS), or nothing. */
export type ChamberFocus = { kind: 'coalition' | 'allocation'; index: number } | null;

export function sameFocus(a: ChamberFocus, b: ChamberFocus) {
  return a?.kind === b?.kind && a?.index === b?.index;
}

/** Whether an allocation stays lit under the focus: nothing focused, itself, or
    its coalition. */
export function allocationLit(focus: ChamberFocus, index: number) {
  if (!focus) return true;
  return focus.kind === 'allocation' ? focus.index === index : ALLOCATIONS[index].coalition === focus.index;
}

/** Whether a coalition stays lit under the focus: nothing focused, itself, or
    one of its allocations. */
export function coalitionLit(focus: ChamberFocus, index: number) {
  if (!focus) return true;
  return focus.kind === 'coalition' ? focus.index === index : ALLOCATIONS[focus.index].coalition === index;
}
