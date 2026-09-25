/**
 * Scoring engine for the Group Trip Decider.
 *
 * Everything in this file is pure and deterministic: same inputs, same
 * outputs. No database, no network, no AI. That is deliberate — the group can
 * re-run it and get identical numbers, so nobody can argue that "the AI picked
 * favourites". The AI explainer only ever *describes* what this file computed.
 *
 * Pipeline (matches column 3 of the components map):
 *   1. findCommonWindows  – every N-day stretch that ALL participants can make
 *   2. hardFilterBlocks   – drop a destination if it fails ANY person's hard rule
 *   3. bestWindowFor      – choose the best common window for each destination
 *   4. personFit          – 0–100 fit per person (budget/type/travel/season)
 *   5. groupScore         – average fit minus 15 per person below 50
 *   6. computeResults     – top 3, or the closest options + who blocks them
 */

import type {
  Dealbreaker,
  Destination,
  DestType,
  ParticipantPrefs,
  TravelInfo,
  TripParams,
} from "./types";

// ---------------------------------------------------------------------------
// Tunable constants (documented in the README's "Scoring formula" section)
// ---------------------------------------------------------------------------

export const WEIGHTS = { budget: 0.3, type: 0.35, travel: 0.2, season: 0.15 };
/** Points by position in a person's type ranking (1st … 4th). */
export const RANK_POINTS = [100, 70, 40, 10];
/** "Travel over 8 hours" dealbreaker threshold. */
export const LONG_TRAVEL_HOURS = 8;
/** Group-score penalty for each person whose fit is below the floor. */
export const LOW_FIT_FLOOR = 50;
export const LOW_FIT_PENALTY = 15;
export const TOP_N = 3;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type BlockRule =
  | "dates"
  | "budget"
  | "flights"
  | "long_travel"
  | "treks"
  | "wont_go";

/** One reason a destination fails the hard filters, tied to a person. */
export interface Block {
  /** null when the block is about the whole group (e.g. no shared dates). */
  participantId: string | null;
  name: string;
  rule: BlockRule;
  detail: string;
}

export interface DateWindow {
  start: string; // YYYY-MM-DD, inclusive
  end: string; // YYYY-MM-DD, inclusive
}

export interface FitParts {
  budget: number;
  type: number;
  travel: number;
  season: number;
}

export interface PersonFit {
  participantId: string;
  name: string;
  fit: number;
  parts: FitParts;
}

export interface ScoredOption {
  destination: Destination;
  window: DateWindow | null;
  cost: number;
  fits: PersonFit[];
  avgFit: number;
  groupScore: number;
  /** Names of people whose fit is below LOW_FIT_FLOOR. */
  lowFit: string[];
  tradeOffs: string[];
  blocks: Block[];
}

export interface DateNote {
  start: string;
  end: string;
  /** Names of people who can't make these dates. */
  unavailable: string[];
  /** True when nobody at all can make these dates. */
  everyone: boolean;
}

export interface ResultsComputation {
  status: "ok" | "none_pass" | "no_participants";
  commonWindows: DateWindow[];
  /** Top options that pass every hard filter (empty if none do). */
  options: ScoredOption[];
  /** Only when nothing passes: the nearest misses, with their blocks. */
  closest: ScoredOption[];
  /** Popular destinations that were filtered out, and why. */
  filteredOut: ScoredOption[];
  dateNotes: DateNote[];
  passedCount: number;
}

// ---------------------------------------------------------------------------
// Date helpers (dates are plain YYYY-MM-DD strings, handled in UTC so there
// are no timezone surprises)
// ---------------------------------------------------------------------------

function toUtc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** All dates from start to end inclusive. */
export function enumerateDates(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

// ---------------------------------------------------------------------------
// 1. Date overlap
// ---------------------------------------------------------------------------

/**
 * Every window of `tripLength` consecutive days inside the trip window where
 * every participant is available on every day. Returned in date order.
 */
export function findCommonWindows(
  prefs: ParticipantPrefs[],
  trip: TripParams,
): DateWindow[] {
  if (prefs.length === 0 || trip.tripLength < 1) return [];
  const sets = prefs.map((p) => new Set(p.availableDates));
  const everyoneFree = (d: string) => sets.every((s) => s.has(d));

  const windows: DateWindow[] = [];
  const lastStart = addDays(trip.windowEnd, -(trip.tripLength - 1));
  for (let start = trip.windowStart; start <= lastStart; start = addDays(start, 1)) {
    const days = enumerateDates(start, addDays(start, trip.tripLength - 1));
    if (days.every(everyoneFree)) {
      windows.push({ start, end: days[days.length - 1] });
    }
  }
  return windows;
}

/** Share (0–100) of the days in a date range that fall in good months. */
export function seasonScore(dest: Destination, start: string, end: string): number {
  const days = enumerateDates(start, end);
  if (days.length === 0) return 0;
  const good = days.filter((d) => dest.bestMonths.includes(monthOf(d))).length;
  return Math.round((good / days.length) * 100);
}

/**
 * 2. Pick the best common window for a destination: the one with the most
 * days in the destination's good months; ties go to the earliest window.
 */
export function bestWindowFor(
  dest: Destination,
  windows: DateWindow[],
): DateWindow | null {
  let best: DateWindow | null = null;
  let bestScore = -1;
  for (const w of windows) {
    const s = seasonScore(dest, w.start, w.end);
    if (s > bestScore) {
      best = w;
      bestScore = s;
    }
  }
  return best;
}

/**
 * When there is no common window, work out who is blocking it: a person
 * "blocks" the dates if removing just them would open up a valid window.
 */
export function whoBlocksDates(
  prefs: ParticipantPrefs[],
  trip: TripParams,
): Block[] {
  const blockers = prefs.filter(
    (p) =>
      findCommonWindows(
        prefs.filter((q) => q.participantId !== p.participantId),
        trip,
      ).length > 0,
  );
  const days = `${trip.tripLength}-day`;
  if (blockers.length > 0) {
    return blockers.map((p) => ({
      participantId: p.participantId,
      name: p.name,
      rule: "dates" as const,
      detail: `${p.name}'s dates don't overlap with a ${days} window everyone else can make`,
    }));
  }
  return [
    {
      participantId: null,
      name: "The group",
      rule: "dates",
      detail: `No ${days} window works for everyone, even leaving one person out`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Travel lookup
// ---------------------------------------------------------------------------

/**
 * Travel info from a home city. For "Other" (or any city missing from the
 * catalog) we use the average hours across known cities, and assume a flight
 * if most known cities need one.
 */
export function travelFor(dest: Destination, city: string): TravelInfo {
  const known = dest.travel[city];
  if (known) return known;
  const all = Object.values(dest.travel).filter(Boolean) as TravelInfo[];
  if (all.length === 0) return { hours: 8, flight: false };
  const hours = all.reduce((s, t) => s + t.hours, 0) / all.length;
  const flights = all.filter((t) => t.flight).length;
  return { hours: Math.round(hours * 10) / 10, flight: flights > all.length / 2 };
}

/** Estimated per-person cost: midpoint of the destination's cost band. */
export function costEstimate(dest: Destination): number {
  return Math.round((dest.costMin + dest.costMax) / 2);
}

// ---------------------------------------------------------------------------
// 3. Hard filters
// ---------------------------------------------------------------------------

const has = (p: ParticipantPrefs, d: Dealbreaker) => p.dealbreakers.includes(d);

/**
 * Every hard rule this destination breaks, per person. An empty array means
 * it passes. `dateBlocks` is the (destination-independent) result of the
 * shared-dates check, computed once by the caller.
 */
export function hardFilterBlocks(
  dest: Destination,
  prefs: ParticipantPrefs[],
  dateBlocks: Block[],
): Block[] {
  const blocks: Block[] = [...dateBlocks];
  const cost = costEstimate(dest);
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  for (const p of prefs) {
    const t = travelFor(dest, p.homeCity);
    const who = { participantId: p.participantId, name: p.name };
    if (cost > p.maxBudget) {
      blocks.push({
        ...who,
        rule: "budget",
        detail: `Est. ${inr(cost)} is over ${p.name}'s max of ${inr(p.maxBudget)}`,
      });
    }
    if (has(p, "flights") && t.flight) {
      blocks.push({
        ...who,
        rule: "flights",
        detail: `Needs a flight from ${p.homeCity}; ${p.name} won't fly`,
      });
    }
    if (has(p, "long_travel") && t.hours > LONG_TRAVEL_HOURS) {
      blocks.push({
        ...who,
        rule: "long_travel",
        detail: `~${t.hours}h from ${p.homeCity}; ${p.name}'s limit is ${LONG_TRAVEL_HOURS}h`,
      });
    }
    if (has(p, "treks") && dest.hasTreks) {
      blocks.push({
        ...who,
        rule: "treks",
        detail: `Involves treks; ${p.name} said no strenuous activity`,
      });
    }
    if (p.wontGo.includes(dest.id)) {
      blocks.push({
        ...who,
        rule: "wont_go",
        detail: `${p.name} won't go to ${dest.name}`,
      });
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// 4. Per-person fit
// ---------------------------------------------------------------------------

/**
 * Budget headroom → 0–100. At exactly the max budget you get 40; 40% or more
 * headroom gets 100; over budget gets 0.
 */
export function budgetPoints(cost: number, maxBudget: number): number {
  if (maxBudget <= 0 || cost > maxBudget) return 0;
  const headroom = (maxBudget - cost) / maxBudget;
  return Math.round(40 + 60 * Math.min(1, headroom / 0.4));
}

/** Destination type → 0–100 using the person's best-ranked matching type. */
export function typePoints(types: DestType[], ranking: DestType[]): number {
  let best = 0;
  for (const t of types) {
    const i = ranking.indexOf(t);
    const pts = i === -1 ? RANK_POINTS[RANK_POINTS.length - 1] : RANK_POINTS[i] ?? 0;
    best = Math.max(best, pts);
  }
  return best;
}

/** Travel hours → 0–100. 1h or less = 100, 13h or more = 0, linear between. */
export function travelPoints(hours: number): number {
  return Math.round(clamp(100 * (1 - (hours - 1) / 12)));
}

/**
 * Fit (0–100) of one destination for one person, weighted:
 * budget 30%, type rank 35%, travel time 20%, good month 15%.
 * If there is no common window, season is judged over the whole trip window.
 */
export function personFit(
  dest: Destination,
  pref: ParticipantPrefs,
  window: DateWindow | null,
  trip: TripParams,
): PersonFit {
  const parts: FitParts = {
    budget: budgetPoints(costEstimate(dest), pref.maxBudget),
    type: typePoints(dest.types, pref.typeRanking),
    travel: travelPoints(travelFor(dest, pref.homeCity).hours),
    season: window
      ? seasonScore(dest, window.start, window.end)
      : seasonScore(dest, trip.windowStart, trip.windowEnd),
  };
  const fit = Math.round(
    WEIGHTS.budget * parts.budget +
      WEIGHTS.type * parts.type +
      WEIGHTS.travel * parts.travel +
      WEIGHTS.season * parts.season,
  );
  return { participantId: pref.participantId, name: pref.name, fit, parts };
}

// ---------------------------------------------------------------------------
// 5. Group score
// ---------------------------------------------------------------------------

/**
 * Average of per-person fits minus LOW_FIT_PENALTY for each person below
 * LOW_FIT_FLOOR, so an option that's great for 4 and bad for 1 loses to one
 * that's decent for all 5. Never below 0.
 */
export function groupScore(fits: number[]): number {
  if (fits.length === 0) return 0;
  const avg = fits.reduce((s, f) => s + f, 0) / fits.length;
  const low = fits.filter((f) => f < LOW_FIT_FLOOR).length;
  return Math.max(0, Math.round(avg - LOW_FIT_PENALTY * low));
}

// ---------------------------------------------------------------------------
// Trade-offs (plain facts derived from the numbers, shown on option cards)
// ---------------------------------------------------------------------------

export function tradeOffsFor(
  dest: Destination,
  prefs: ParticipantPrefs[],
  fits: PersonFit[],
  window: DateWindow | null,
): string[] {
  const out: string[] = [];
  const cost = costEstimate(dest);

  const lowest = [...fits].sort((a, b) => a.fit - b.fit)[0];
  if (lowest && fits.length > 1) {
    out.push(`${lowest.name} compromises most (fit ${lowest.fit})`);
  }
  for (const p of prefs) {
    const t = travelFor(dest, p.homeCity);
    if (t.hours >= 7) out.push(`Long journey for ${p.name}: ~${t.hours}h from ${p.homeCity}`);
  }
  const flyers = prefs.filter((p) => travelFor(dest, p.homeCity).flight).map((p) => p.name);
  if (flyers.length > 0 && flyers.length < prefs.length) {
    out.push(`${listNames(flyers)} will need to fly`);
  } else if (flyers.length === prefs.length && prefs.length > 0) {
    out.push("Everyone needs a flight");
  }
  for (const p of prefs) {
    if (cost <= p.maxBudget && cost / p.maxBudget >= 0.85) {
      out.push(`Uses most of ${p.name}'s budget (₹${cost.toLocaleString("en-IN")} of ₹${p.maxBudget.toLocaleString("en-IN")})`);
    }
  }
  if (window && seasonScore(dest, window.start, window.end) < 100) {
    out.push("Not peak season for these dates");
  }
  return out.slice(0, 4);
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Date notes ("Nobody can make X", "Karan can't make 12–17 Nov")
// ---------------------------------------------------------------------------

export function computeDateNotes(
  prefs: ParticipantPrefs[],
  trip: TripParams,
): DateNote[] {
  const notes: DateNote[] = [];
  const sets = prefs.map((p) => ({ name: p.name, dates: new Set(p.availableDates) }));
  let current: DateNote | null = null;

  for (const d of enumerateDates(trip.windowStart, trip.windowEnd)) {
    const missing = sets.filter((s) => !s.dates.has(d)).map((s) => s.name);
    const key = missing.join("|");
    if (current && current.unavailable.join("|") === key && addDays(current.end, 1) === d) {
      current.end = d;
      continue;
    }
    if (current) notes.push(current);
    current = missing.length
      ? { start: d, end: d, unavailable: missing, everyone: missing.length === prefs.length }
      : null;
  }
  if (current) notes.push(current);
  return notes;
}

// ---------------------------------------------------------------------------
// 6. Putting it together
// ---------------------------------------------------------------------------

function scoreDestination(
  dest: Destination,
  prefs: ParticipantPrefs[],
  trip: TripParams,
  windows: DateWindow[],
  dateBlocks: Block[],
): ScoredOption {
  const window = bestWindowFor(dest, windows);
  const fits = prefs.map((p) => personFit(dest, p, window, trip));
  const values = fits.map((f) => f.fit);
  return {
    destination: dest,
    window,
    cost: costEstimate(dest),
    fits,
    avgFit: Math.round(values.reduce((s, f) => s + f, 0) / Math.max(1, values.length)),
    groupScore: groupScore(values),
    lowFit: fits.filter((f) => f.fit < LOW_FIT_FLOOR).map((f) => f.name),
    tradeOffs: tradeOffsFor(dest, prefs, fits, window),
    blocks: hardFilterBlocks(dest, prefs, dateBlocks),
  };
}

/** Higher group score first; then higher average fit; then cheaper; then name. */
function byScore(a: ScoredOption, b: ScoredOption): number {
  return (
    b.groupScore - a.groupScore ||
    b.avgFit - a.avgFit ||
    a.cost - b.cost ||
    a.destination.name.localeCompare(b.destination.name)
  );
}

/** Number of distinct people blocking an option (group-level counts as all). */
function blockerCount(o: ScoredOption, total: number): number {
  if (o.blocks.some((b) => b.participantId === null)) return total;
  return new Set(o.blocks.map((b) => b.participantId)).size;
}

/**
 * Run the full pipeline. If at least one destination passes the hard filters
 * we return the top 3 by group score. If none pass, `closest` holds the 3
 * destinations blocked by the fewest people (then fewest rules, then best
 * score), each with the exact person + rule that blocks it.
 */
export function computeResults(
  destinations: Destination[],
  prefs: ParticipantPrefs[],
  trip: TripParams,
): ResultsComputation {
  const empty: ResultsComputation = {
    status: "no_participants",
    commonWindows: [],
    options: [],
    closest: [],
    filteredOut: [],
    dateNotes: [],
    passedCount: 0,
  };
  if (prefs.length === 0) return empty;

  const commonWindows = findCommonWindows(prefs, trip);
  const dateBlocks = commonWindows.length ? [] : whoBlocksDates(prefs, trip);
  const scored = destinations.map((d) =>
    scoreDestination(d, prefs, trip, commonWindows, dateBlocks),
  );

  const passed = scored.filter((o) => o.blocks.length === 0).sort(byScore);
  const failed = scored.filter((o) => o.blocks.length > 0);
  const dateNotes = computeDateNotes(prefs, trip);

  if (passed.length > 0) {
    return {
      status: "ok",
      commonWindows,
      options: passed.slice(0, TOP_N),
      closest: [],
      filteredOut: failed.sort(byScore).slice(0, 5),
      dateNotes,
      passedCount: passed.length,
    };
  }

  const closest = failed
    .sort(
      (a, b) =>
        blockerCount(a, prefs.length) - blockerCount(b, prefs.length) ||
        a.blocks.length - b.blocks.length ||
        byScore(a, b),
    )
    .slice(0, TOP_N);

  return {
    status: "none_pass",
    commonWindows,
    options: [],
    closest,
    filteredOut: [],
    dateNotes,
    passedCount: 0,
  };
}

// ---------------------------------------------------------------------------
// Final decision: vote tally
// ---------------------------------------------------------------------------

export interface VoteTally {
  counts: Record<string, number>;
  /** Winning destination id, or null if there are no options. */
  winnerId: string | null;
  totalVotes: number;
}

/**
 * Most votes wins. A tie goes to the option with the higher group score.
 * Votes for destinations that are no longer in the options are ignored.
 */
export function tallyVotes(
  options: { destinationId: string; groupScore: number }[],
  votes: { destinationId: string }[],
): VoteTally {
  const counts: Record<string, number> = {};
  for (const o of options) counts[o.destinationId] = 0;
  let totalVotes = 0;
  for (const v of votes) {
    if (v.destinationId in counts) {
      counts[v.destinationId] += 1;
      totalVotes += 1;
    }
  }
  let winner: { destinationId: string; groupScore: number } | null = null;
  for (const o of options) {
    if (
      !winner ||
      counts[o.destinationId] > counts[winner.destinationId] ||
      (counts[o.destinationId] === counts[winner.destinationId] &&
        o.groupScore > winner.groupScore)
    ) {
      winner = o;
    }
  }
  return { counts, winnerId: winner?.destinationId ?? null, totalVotes };
}
