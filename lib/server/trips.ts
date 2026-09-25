import "server-only";
import type {
  DecisionView,
  OptionView,
  ResultsView,
  TripPublic,
} from "../api-types";
import { computeResults, tallyVotes, type ScoredOption } from "../scoring";
import type { Dealbreaker, Destination, DestType, ParticipantPrefs } from "../types";
import { db } from "./supabase";
import { HttpError } from "./http";
import { hashSecret } from "./tokens";

// ---------------------------------------------------------------------------
// Row types (snake_case, as stored)
// ---------------------------------------------------------------------------

export interface TripRow {
  id: string;
  name: string;
  window_start: string;
  window_end: string;
  trip_length: number;
  deadline: string;
  organizer_key_hash: string;
  is_demo: boolean;
  decided_destination_id: string | null;
  decided_start: string | null;
  decided_end: string | null;
  decided_at: string | null;
  explanations: unknown;
  explanations_key: string | null;
}

export interface ParticipantRow {
  id: string;
  trip_id: string;
  name: string;
  position: number;
  token_hash: string | null;
}

export interface ResponseRow {
  id: string;
  participant_id: string;
  trip_id: string;
  home_city: string;
  available_dates: string[];
  max_budget: number;
  type_ranking: DestType[];
  dealbreakers: Dealbreaker[];
  wont_go: string[];
  dream_destination: string | null;
  note: string | null;
  updated_at: string;
}

export interface VoteRow {
  participant_id: string;
  destination_id: string;
}

interface DestinationRow {
  id: string;
  name: string;
  country: string;
  state: string;
  types: DestType[];
  cost_min: number;
  cost_max: number;
  best_months: number[];
  travel: Destination["travel"];
  has_treks: boolean;
  blurb: string;
}

export interface TripBundle {
  trip: TripRow;
  participants: ParticipantRow[];
  responses: ResponseRow[];
  votes: VoteRow[];
  destinations: Destination[];
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function fail(error: { message: string } | null) {
  if (error) throw new Error(`Database error: ${error.message}`);
}

let catalogCache: { at: number; data: Destination[] } | null = null;

/** Destination catalog, cached in memory for 5 minutes. */
export async function getDestinations(): Promise<Destination[]> {
  if (catalogCache && Date.now() - catalogCache.at < 5 * 60_000) return catalogCache.data;
  const { data, error } = await db().from("destinations").select("*").order("name");
  fail(error);
  const mapped = (data as DestinationRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country,
    state: r.state,
    types: r.types,
    costMin: r.cost_min,
    costMax: r.cost_max,
    bestMonths: r.best_months,
    travel: r.travel,
    hasTreks: r.has_treks,
    blurb: r.blurb,
  }));
  catalogCache = { at: Date.now(), data: mapped };
  return mapped;
}

export async function getTrip(tripId: string): Promise<TripRow> {
  if (!/^[a-z0-9]{6,20}$/.test(tripId)) throw new HttpError(404, "Trip not found");
  const { data, error } = await db().from("trips").select("*").eq("id", tripId).maybeSingle();
  fail(error);
  if (!data) throw new HttpError(404, "Trip not found");
  return data as TripRow;
}

export async function getBundle(tripId: string): Promise<TripBundle> {
  const trip = await getTrip(tripId);
  const client = db();
  const [p, r, v, destinations] = await Promise.all([
    client.from("participants").select("*").eq("trip_id", tripId).order("position"),
    client.from("responses").select("*").eq("trip_id", tripId),
    client.from("votes").select("participant_id, destination_id").eq("trip_id", tripId),
    getDestinations(),
  ]);
  fail(p.error);
  fail(r.error);
  fail(v.error);
  return {
    trip,
    participants: p.data as ParticipantRow[],
    responses: r.data as ResponseRow[],
    votes: v.data as VoteRow[],
    destinations,
  };
}

// ---------------------------------------------------------------------------
// Auth by token
// ---------------------------------------------------------------------------

export function assertOrganizer(trip: TripRow, key: string | null | undefined) {
  if (!key || hashSecret(key) !== trip.organizer_key_hash) {
    throw new HttpError(403, "This organizer link isn't valid.");
  }
}

export function participantByToken(
  bundle: TripBundle,
  token: string | null | undefined,
): ParticipantRow {
  const hash = token ? hashSecret(token) : null;
  const p = hash ? bundle.participants.find((x) => x.token_hash === hash) : undefined;
  if (!p) throw new HttpError(403, "This personal link isn't valid for this trip.");
  return p;
}

// ---------------------------------------------------------------------------
// Status + lock rule
// ---------------------------------------------------------------------------

export function deadlinePassed(trip: TripRow, now = new Date()): boolean {
  return now.getTime() >= new Date(trip.deadline).getTime();
}

/**
 * Responses as they stood at the deadline. The server rejects edits after the
 * deadline, so this filter is belt-and-braces: anything updated after the
 * deadline is ignored.
 */
export function frozenResponses(bundle: TripBundle): ResponseRow[] {
  const cutoff = new Date(bundle.trip.deadline).getTime();
  return bundle.responses.filter((r) => new Date(r.updated_at).getTime() <= cutoff);
}

export function toPublic(bundle: TripBundle, now = new Date()): TripPublic {
  const { trip, participants } = bundle;
  const submitted = new Set(frozenResponses(bundle).map((r) => r.participant_id));
  const passed = deadlinePassed(trip, now);
  const submittedCount = participants.filter((p) => submitted.has(p.id)).length;
  const total = participants.length;
  const all = submittedCount === total && total > 0;
  return {
    id: trip.id,
    name: trip.name,
    windowStart: trip.window_start,
    windowEnd: trip.window_end,
    tripLength: trip.trip_length,
    deadline: trip.deadline,
    deadlinePassed: passed,
    participants: participants.map((p) => ({ id: p.id, name: p.name, submitted: submitted.has(p.id) })),
    submittedCount,
    total,
    resultsAvailable: all || passed,
    partial: passed && !all,
    isDemo: trip.is_demo,
    decided: decisionView(bundle),
  };
}

function decisionView(bundle: TripBundle): DecisionView | null {
  const { trip, destinations } = bundle;
  if (!trip.decided_destination_id || !trip.decided_at) return null;
  const d = destinations.find((x) => x.id === trip.decided_destination_id);
  return {
    destinationId: trip.decided_destination_id,
    name: d?.name ?? trip.decided_destination_id,
    start: trip.decided_start,
    end: trip.decided_end,
    cost: d ? Math.round((d.costMin + d.costMax) / 2) : null,
    decidedAt: trip.decided_at,
  };
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export function prefsFrom(bundle: TripBundle): ParticipantPrefs[] {
  const byId = new Map(bundle.participants.map((p) => [p.id, p]));
  return frozenResponses(bundle)
    .filter((r) => byId.has(r.participant_id))
    .sort((a, b) => byId.get(a.participant_id)!.position - byId.get(b.participant_id)!.position)
    .map((r) => ({
      participantId: r.participant_id,
      name: byId.get(r.participant_id)!.name,
      homeCity: r.home_city,
      availableDates: r.available_dates,
      maxBudget: r.max_budget,
      typeRanking: r.type_ranking,
      dealbreakers: r.dealbreakers,
      wontGo: r.wont_go,
      dreamDestination: r.dream_destination,
    }));
}

function toOptionView(o: ScoredOption): OptionView {
  return {
    destinationId: o.destination.id,
    name: o.destination.name,
    state: o.destination.state,
    types: o.destination.types,
    blurb: o.destination.blurb,
    window: o.window,
    cost: o.cost,
    costMin: o.destination.costMin,
    costMax: o.destination.costMax,
    groupScore: o.groupScore,
    avgFit: o.avgFit,
    fits: o.fits.map((f) => ({ name: f.name, fit: f.fit, parts: f.parts, dream: f.dream })),
    dreamOf: o.dreamOf,
    tradeOffs: o.tradeOffs,
    blocks: o.blocks,
  };
}

/** Full computed results (without explanations). Null while still locked. */
export function computeView(bundle: TripBundle, now = new Date()): ResultsView {
  const trip = toPublic(bundle, now);
  if (!trip.resultsAvailable) return { trip, locked: true };

  const prefs = prefsFrom(bundle);
  const res = computeResults(bundle.destinations, prefs, {
    windowStart: bundle.trip.window_start,
    windowEnd: bundle.trip.window_end,
    tripLength: bundle.trip.trip_length,
  });
  const options = res.options.map(toOptionView);

  const tally = tallyVotes(
    options.map((o) => ({ destinationId: o.destinationId, groupScore: o.groupScore })),
    bundle.votes.map((v) => ({ destinationId: v.destination_id })),
  );
  const optionIds = new Set(options.map((o) => o.destinationId));
  const votedIds = new Set(
    bundle.votes.filter((v) => optionIds.has(v.destination_id)).map((v) => v.participant_id),
  );
  // Only people whose answers count can vote.
  const eligible = bundle.participants.filter((p) => prefs.some((x) => x.participantId === p.id));

  return {
    trip,
    locked: false,
    status: res.status,
    basedOn: prefs.length,
    people: prefs.map((p) => p.name),
    options,
    closest: res.closest.map(toOptionView),
    filteredOut: res.filteredOut.map((o) => ({
      name: o.destination.name,
      reasons: [...new Set(o.blocks.map((b) => b.detail))].slice(0, 3),
    })),
    dateNotes: res.dateNotes,
    dateSuggestion: res.dateSuggestion,
    commonWindowCount: res.commonWindows.length,
    votes: {
      counts: tally.counts,
      winnerId: tally.winnerId,
      totalVotes: tally.totalVotes,
      voted: eligible.filter((p) => votedIds.has(p.id)).map((p) => p.name),
      notVoted: eligible.filter((p) => !votedIds.has(p.id)).map((p) => p.name),
    },
  };
}
