// src/config/campaign.ts

/* ---- Campaign sequence ----
   The roadmap as the rulebook's second section sets it out: five phases,
   numbered 1 to 5, each with the milestones it is made of. A phase's `state`
   is printed by the shape of its marks and the ink of its name: complete in
   the text ink, the phase in progress in gold, and the phases still ahead in
   the muted ink. Expansion is the open fifth phase: decided by the DAO, it has
   no milestones yet.

   A milestone is ticked off (`done`) as it lands. The track places its coin
   by milestones, never by the calendar, so the page only changes when one
   lands. The dates are legends. */

export type PhaseState = 'complete' | 'live' | 'upcoming' | 'open';

export interface Milestone {
  label: string;
  done: boolean;
}

export interface Phase {
  /** The phase's number on the track and in the index, 1 to 5. */
  n: number;
  title: string;
  when: string;
  status: string;
  state: PhaseState;
  milestones: Milestone[];
  /** What an open phase holds, in place of milestones. */
  note?: string;
}

export const PHASES: Phase[] = [
  {
    n: 1,
    title: 'Foundation',
    when: '2025',
    status: 'Complete',
    state: 'complete',
    milestones: [
      { label: 'Conceptualisation & game-theory design', done: true },
      { label: 'Dual-token economic model', done: true },
      { label: 'DAO LLC legal structure', done: true },
    ],
  },
  {
    n: 2,
    title: 'Build',
    when: '2026',
    status: 'In Progress',
    state: 'live',
    milestones: [
      { label: 'Core smart contracts on Base', done: true },
      { label: 'dApp build-out (Exchange, Terminal, Community)', done: true },
      { label: 'Pre-launch community seeding', done: false },
    ],
  },
  {
    n: 3,
    title: 'Testnet',
    when: 'Q1 2027',
    status: 'Upcoming',
    state: 'upcoming',
    milestones: [
      { label: 'Public testnet on Base Sepolia', done: false },
      { label: 'Community Genesis: testnet quests & Genesis Airdrop', done: false },
      { label: 'Immunefi audit competition', done: false },
      { label: 'Execution Council established', done: false },
    ],
  },
  {
    n: 4,
    title: 'Mainnet',
    when: 'Q2 2027',
    status: 'Upcoming',
    state: 'upcoming',
    milestones: [
      { label: '$RGD TGE & Capital Auction', done: false },
      { label: 'Genesis Airdrop distributed, market opens', done: false },
      { label: 'Mainnet launch & Season 1', done: false },
      { label: 'Hybrid governance (Snapshot + Council)', done: false },
    ],
  },
  {
    n: 5,
    title: 'Expansion',
    when: 'Beyond',
    status: 'Open',
    state: 'open',
    milestones: [],
    note: 'DAO-approved game modes and ecosystem growth.',
  },
];

/** Every milestone in track order, with the phase it belongs to. */
export const MILESTONES = PHASES.flatMap((p, phase) => p.milestones.map((m) => ({ ...m, phase })));

/** The phase in progress. */
export const LIVE_PHASE = PHASES.findIndex((p) => p.state === 'live');

/** The milestones landed, in track order: the order the coin passes them. */
export const DONE_ORDER = MILESTONES.flatMap((m, i) => (m.done ? [i] : []));

/** The first milestone still open: where the coin stands. */
export const NEXT_MILESTONE = MILESTONES.findIndex((m) => !m.done);

export function milestonesDone(phase: number) {
  return PHASES[phase].milestones.filter((m) => m.done).length;
}

/** A milestone's status, in the words the track's key uses. */
export function milestoneStatus(index: number) {
  if (MILESTONES[index].done) return 'Completed';
  return index === NEXT_MILESTONE ? 'In progress' : 'Upcoming';
}

/** What the reader is looking at: a phase, a milestone (by its index in
    MILESTONES), or nothing. */
export type CampaignFocus = { kind: 'phase' | 'milestone'; index: number } | null;

export function sameCampaignFocus(a: CampaignFocus, b: CampaignFocus) {
  return a?.kind === b?.kind && a?.index === b?.index;
}

/** The phase the focus belongs to, if any. */
export function focusedPhase(focus: CampaignFocus) {
  if (!focus) return null;
  return focus.kind === 'phase' ? focus.index : MILESTONES[focus.index].phase;
}

/** Whether a phase stays lit under the focus: nothing focused, itself, or one
    of its milestones. */
export function phaseLit(focus: CampaignFocus, phase: number) {
  return !focus || focusedPhase(focus) === phase;
}

/** Whether a milestone stays lit under the focus: nothing focused, itself, or
    its phase. */
export function milestoneLit(focus: CampaignFocus, index: number) {
  if (!focus) return true;
  return focus.kind === 'milestone' ? focus.index === index : MILESTONES[index].phase === focus.index;
}
