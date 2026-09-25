// Demo mode: creates a trip with the five friends and realistic, different
// preferences, so the results page shows a meaningful grid. Used by both
// `npm run seed:demo` and the "Load demo trip" button.
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, enumerateDates } from "./scoring";
import type { Dealbreaker, DestType } from "./types";
import { hashSecret, newSecret, newTripId } from "./server/tokens";

interface DemoPerson {
  name: string;
  homeCity: string;
  maxBudget: number;
  typeRanking: DestType[];
  dealbreakers: Dealbreaker[];
  wontGo: string[];
  dream?: string;
  note: string;
  /** Available day ranges as [fromOffset, toOffset] inside the 18-day window. */
  free: [number, number][];
}

export const DEMO_PEOPLE: DemoPerson[] = [
  { name: "Riya", homeCity: "Bengaluru", maxBudget: 15000, typeRanking: ["beach", "hills", "city", "adventure"],
    dealbreakers: [], wontGo: [], dream: "pondicherry", note: "Organizing! Anywhere with good food works for me.", free: [[0, 3], [6, 17]] },
  { name: "Siddharth", homeCity: "Mumbai", maxBudget: 14000, typeRanking: ["hills", "beach", "adventure", "city"],
    dealbreakers: ["long_travel"], wontGo: [], dream: "coorg", note: "No more 14-hour bus rides please.", free: [[2, 12], [15, 17]] },
  { name: "Karan", homeCity: "Delhi", maxBudget: 18000, typeRanking: ["adventure", "hills", "city", "beach"],
    dealbreakers: [], wontGo: ["goa"], dream: "manali", note: "Been to Goa three times. Something new?", free: [[6, 17]] },
  { name: "Aisha", homeCity: "Hyderabad", maxBudget: 12000, typeRanking: ["beach", "city", "hills", "adventure"],
    dealbreakers: ["treks"], wontGo: [], note: "", free: [[0, 11], [15, 16]] },
  { name: "Preethi", homeCity: "Chennai", maxBudget: 13000, typeRanking: ["city", "beach", "hills", "adventure"],
    dealbreakers: [], wontGo: ["manali"], note: "Would love somewhere with some history.", free: [[3, 13], [15, 17]] },
];

export interface DemoTrip {
  tripId: string;
  organizerKey: string;
  people: { name: string; token: string }[];
}

/** Window starts on the 12th of the month after next; 18 days; 3-day trip. */
export function demoWindow(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 2; // month after next (0-based + 2)
  const start = new Date(Date.UTC(y, m, 12)).toISOString().slice(0, 10);
  return { start, end: addDays(start, 17) };
}

export async function createDemoTrip(client: SupabaseClient, now = new Date()): Promise<DemoTrip> {
  const tripId = newTripId();
  const organizerKey = newSecret();
  const { start, end } = demoWindow(now);
  // Deadline: 5 days from now at 11:59 PM IST. Everyone has already
  // submitted, so results are unlocked straight away.
  const d = new Date(now.getTime() + 5 * 86_400_000).toISOString().slice(0, 10);
  const deadline = new Date(`${d}T23:59:00+05:30`).toISOString();

  const t = await client.from("trips").insert({
    id: tripId,
    name: "College gang reunion (demo)",
    window_start: start,
    window_end: end,
    trip_length: 3,
    deadline,
    organizer_key_hash: hashSecret(organizerKey),
    is_demo: true,
  });
  if (t.error) throw new Error(t.error.message);

  const people = DEMO_PEOPLE.map((p) => ({ ...p, token: newSecret() }));
  const ins = await client
    .from("participants")
    .insert(people.map((p, i) => ({ trip_id: tripId, name: p.name, position: i, token_hash: hashSecret(p.token) })))
    .select("id, name");
  if (ins.error) throw new Error(ins.error.message);
  const idByName = new Map((ins.data as { id: string; name: string }[]).map((r) => [r.name, r.id]));

  const r = await client.from("responses").insert(
    people.map((p) => ({
      participant_id: idByName.get(p.name),
      trip_id: tripId,
      home_city: p.homeCity,
      available_dates: p.free.flatMap(([a, b]) => enumerateDates(addDays(start, a), addDays(start, b))),
      max_budget: p.maxBudget,
      type_ranking: p.typeRanking,
      dealbreakers: p.dealbreakers,
      wont_go: p.wontGo,
      dream_destination: p.dream ?? null,
      note: p.note || null,
    })),
  );
  if (r.error) throw new Error(r.error.message);

  return { tripId, organizerKey, people: people.map((p) => ({ name: p.name, token: p.token })) };
}
