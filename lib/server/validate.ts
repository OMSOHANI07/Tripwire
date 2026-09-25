import "server-only";
import { enumerateDates } from "../scoring";
import { DEALBREAKERS, DEST_TYPES, HOME_CITIES, type Dealbreaker, type DestType } from "../types";
import type { ResponseInput } from "../api-types";
import { HttpError } from "./http";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const bad = (msg: string) => new HttpError(400, msg);

function str(v: unknown, field: string, max: number, min = 1): string {
  if (typeof v !== "string") throw bad(`${field} is required`);
  const s = v.trim();
  if (s.length < min) throw bad(`${field} is required`);
  if (s.length > max) throw bad(`${field} must be at most ${max} characters`);
  return s;
}

function date(v: unknown, field: string): string {
  if (typeof v !== "string" || !DATE_RE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
    throw bad(`${field} must be a date (YYYY-MM-DD)`);
  }
  return v;
}

function int(v: unknown, field: string, min: number, max: number): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw bad(`${field} must be a whole number between ${min} and ${max}`);
  }
  return n;
}

export interface NewTripInput {
  name: string;
  windowStart: string;
  windowEnd: string;
  tripLength: number;
  deadline: string; // ISO instant
  participants: string[];
}

export function validateNewTrip(body: Record<string, unknown>, now = new Date()): NewTripInput {
  const name = str(body.name, "Trip name", 80);
  const windowStart = date(body.windowStart, "Window start");
  const windowEnd = date(body.windowEnd, "Window end");
  if (windowEnd < windowStart) throw bad("The date window ends before it starts");
  const windowDays = enumerateDates(windowStart, windowEnd).length;
  if (windowDays > 90) throw bad("Keep the date window to 90 days or less");
  const tripLength = int(body.tripLength, "Trip length", 1, 14);
  if (tripLength > windowDays) throw bad("The trip is longer than the date window");

  const dDate = date(body.deadlineDate, "Deadline date");
  const dTime = typeof body.deadlineTime === "string" && /^\d{2}:\d{2}$/.test(body.deadlineTime) ? body.deadlineTime : null;
  if (!dTime) throw bad("Deadline time must be HH:MM");
  const deadline = new Date(`${dDate}T${dTime}:00+05:30`); // entered in IST
  if (Number.isNaN(deadline.getTime())) throw bad("Deadline is not a valid date/time");
  if (deadline.getTime() <= now.getTime()) throw bad("The deadline must be in the future");

  if (!Array.isArray(body.participants)) throw bad("Add the participants' names");
  const names = body.participants
    .map((n) => (typeof n === "string" ? n.trim() : ""))
    .filter(Boolean);
  if (names.length < 2 || names.length > 10) throw bad("Add between 2 and 10 participants");
  for (const n of names) if (n.length > 40) throw bad("Names must be at most 40 characters");
  const lower = names.map((n) => n.toLowerCase());
  if (new Set(lower).size !== lower.length) throw bad("Each participant needs a different name");

  return { name, windowStart, windowEnd, tripLength, deadline: deadline.toISOString(), participants: names };
}

export function validateResponse(
  body: Record<string, unknown>,
  ctx: { windowStart: string; windowEnd: string; destinationIds: Set<string> },
): Omit<ResponseInput, "participantId" | "token"> {
  const homeCity = str(body.homeCity, "Home city", 40);
  if (!(HOME_CITIES as readonly string[]).includes(homeCity)) throw bad("Pick a home city from the list");

  if (!Array.isArray(body.availableDates)) throw bad("Pick the dates you can travel");
  const dates = [...new Set(body.availableDates.map((d) => date(d, "Available date")))].sort();
  if (dates.length === 0) throw bad("Pick at least one date you can travel");
  if (dates.some((d) => d < ctx.windowStart || d > ctx.windowEnd)) {
    throw bad("Available dates must be inside the trip window");
  }

  const maxBudget = int(body.maxBudget, "Max budget", 1000, 500000);

  const ranking = body.typeRanking;
  if (
    !Array.isArray(ranking) ||
    ranking.length !== DEST_TYPES.length ||
    new Set(ranking).size !== DEST_TYPES.length ||
    !ranking.every((t) => (DEST_TYPES as readonly string[]).includes(t as string))
  ) {
    throw bad("Rank all four destination types");
  }

  const dealbreakers = Array.isArray(body.dealbreakers) ? body.dealbreakers : [];
  if (!dealbreakers.every((d) => (DEALBREAKERS as readonly string[]).includes(d as string))) {
    throw bad("Unknown dealbreaker");
  }
  const wontGo = Array.isArray(body.wontGo) ? [...new Set(body.wontGo)] : [];
  if (!wontGo.every((id) => typeof id === "string" && ctx.destinationIds.has(id))) {
    throw bad("Unknown destination in 'places I won't go'");
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

  return {
    homeCity,
    availableDates: dates,
    maxBudget,
    typeRanking: ranking as DestType[],
    dealbreakers: [...new Set(dealbreakers)] as Dealbreaker[],
    wontGo: wontGo as string[],
    note: note || undefined,
  };
}
