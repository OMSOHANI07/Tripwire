import { db } from "@/lib/server/supabase";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { computeView, getBundle, participantByToken } from "@/lib/server/trips";

type Ctx = { params: Promise<{ tripId: string }> };

/** Cast or change a vote for one of the top 3, using a personal token. */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { tripId } = await params;
  const body = await readJson(req);
  const bundle = await getBundle(tripId);
  const p = participantByToken(bundle, typeof body.token === "string" ? body.token : null);

  if (bundle.trip.decided_at) throw new HttpError(423, "The decision is locked. Votes can't change now.", "locked");
  const view = computeView(bundle);
  if (view.locked) throw new HttpError(423, "Voting opens once results are ready.", "locked");
  if (!view.people?.includes(p.name)) {
    throw new HttpError(403, "Only people whose answers were counted can vote.");
  }
  const destinationId = typeof body.destinationId === "string" ? body.destinationId : "";
  if (!view.options?.some((o) => o.destinationId === destinationId)) {
    throw new HttpError(400, "Vote for one of the top 3 options");
  }

  const { error } = await db()
    .from("votes")
    .upsert({ trip_id: tripId, participant_id: p.id, destination_id: destinationId }, { onConflict: "participant_id" });
  if (error) throw new Error(error.message);
  return ok({ destinationId });
});
