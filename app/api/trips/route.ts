import { db } from "@/lib/server/supabase";
import { handle, ok, readJson } from "@/lib/server/http";
import { hashSecret, newSecret, newTripId } from "@/lib/server/tokens";
import { validateNewTrip } from "@/lib/server/validate";

/** Organizer setup: create a trip and its participant list. */
export const POST = handle(async (req: Request) => {
  const input = validateNewTrip(await readJson(req));
  const tripId = newTripId();
  const organizerKey = newSecret();

  const t = await db().from("trips").insert({
    id: tripId,
    name: input.name,
    window_start: input.windowStart,
    window_end: input.windowEnd,
    trip_length: input.tripLength,
    deadline: input.deadline,
    organizer_key_hash: hashSecret(organizerKey),
  });
  if (t.error) throw new Error(t.error.message);

  const p = await db()
    .from("participants")
    .insert(input.participants.map((name, position) => ({ trip_id: tripId, name, position })));
  if (p.error) {
    await db().from("trips").delete().eq("id", tripId);
    throw new Error(p.error.message);
  }
  return ok({ tripId, organizerKey }, 201);
});
