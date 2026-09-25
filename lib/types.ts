// Shared domain types used by the scoring engine, server routes and UI.

export const DEST_TYPES = ["beach", "hills", "city", "adventure"] as const;
export type DestType = (typeof DEST_TYPES)[number];

export const HOME_CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Kolkata",
  "Other",
] as const;
export type HomeCity = (typeof HOME_CITIES)[number];

/** Cities the catalog has explicit travel data for ("Other" is derived). */
export const CATALOG_CITIES = HOME_CITIES.filter((c) => c !== "Other");

export const DEALBREAKERS = ["flights", "long_travel", "treks"] as const;
export type Dealbreaker = (typeof DEALBREAKERS)[number];

export const DEALBREAKER_LABELS: Record<Dealbreaker, string> = {
  flights: "No flights",
  long_travel: "No travel over 8 hours",
  treks: "No treks / strenuous activity",
};

export interface TravelInfo {
  /** Approximate one-way door-to-door hours using the practical mode. */
  hours: number;
  /** True when a flight is the realistic way to get there. */
  flight: boolean;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  state: string;
  types: DestType[];
  /** Estimated cost per person for a 3–4 day trip, excluding travel (₹). */
  costMin: number;
  costMax: number;
  /** Months (1–12) when the destination is good to visit. */
  bestMonths: number[];
  travel: Partial<Record<string, TravelInfo>>;
  hasTreks: boolean;
  blurb: string;
}

export interface ParticipantPrefs {
  participantId: string;
  name: string;
  homeCity: string;
  /** ISO dates (YYYY-MM-DD) this person can travel. */
  availableDates: string[];
  maxBudget: number;
  /** Destination types, most preferred first. */
  typeRanking: DestType[];
  dealbreakers: Dealbreaker[];
  /** Destination ids this person refuses to visit. */
  wontGo: string[];
  /** Optional dream destination id: gets a DREAM_BONUS in this person's fit. */
  dreamDestination?: string | null;
}

export interface TripParams {
  windowStart: string;
  windowEnd: string;
  tripLength: number;
}
