// Shapes returned by the API routes and consumed by the pages.
import type { Block, DateNote, DateSuggestion, DateWindow, FitParts } from "./scoring";
import type { Dealbreaker, DestType } from "./types";

export interface ParticipantSummary {
  id: string;
  name: string;
  submitted: boolean;
}

export interface TripPublic {
  id: string;
  name: string;
  windowStart: string;
  windowEnd: string;
  tripLength: number;
  deadline: string;
  deadlinePassed: boolean;
  participants: ParticipantSummary[];
  submittedCount: number;
  total: number;
  /** Everyone submitted, or the deadline passed. */
  resultsAvailable: boolean;
  /** Deadline passed with people missing. */
  partial: boolean;
  isDemo: boolean;
  decided: DecisionView | null;
}

export interface DecisionView {
  destinationId: string;
  name: string;
  start: string | null;
  end: string | null;
  cost: number | null;
  decidedAt: string;
}

export interface OptionView {
  destinationId: string;
  name: string;
  state: string;
  types: DestType[];
  blurb: string;
  window: DateWindow | null;
  cost: number;
  costMin: number;
  costMax: number;
  groupScore: number;
  avgFit: number;
  fits: { name: string; fit: number; parts: FitParts; dream: boolean }[];
  /** People who picked this as their dream destination. */
  dreamOf: string[];
  tradeOffs: string[];
  blocks: Block[];
}

export interface Explanation {
  why: string;
  compromise: string;
}

export interface ResultsView {
  trip: TripPublic;
  locked: boolean;
  status?: "ok" | "none_pass" | "no_participants";
  basedOn?: number;
  people?: string[];
  options?: OptionView[];
  closest?: OptionView[];
  filteredOut?: { name: string; reasons: string[] }[];
  dateNotes?: DateNote[];
  dateSuggestion?: DateSuggestion | null;
  commonWindowCount?: number;
  explanations?: Record<string, Explanation>;
  explanationSource?: "ai" | "template";
  explanationsStale?: boolean;
  votes?: {
    counts: Record<string, number>;
    winnerId: string | null;
    totalVotes: number;
    voted: string[];
    notVoted: string[];
  };
}

export interface ResponseInput {
  participantId: string;
  token?: string;
  homeCity: string;
  availableDates: string[];
  maxBudget: number;
  typeRanking: DestType[];
  dealbreakers: Dealbreaker[];
  wontGo: string[];
  dreamDestination?: string | null;
  note?: string;
}

export interface MeView {
  trip: TripPublic;
  participant: { id: string; name: string };
  response: Omit<ResponseInput, "participantId" | "token"> | null;
  voteDestinationId: string | null;
}

export interface DestinationLite {
  id: string;
  name: string;
  country: string;
  state: string;
  types: DestType[];
}
