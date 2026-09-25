import { db } from "@/lib/server/supabase";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { assertOrganizer, computeView, getBundle } from "@/lib/server/trips";

type Ctx = { params: Promise<{ tripId: string }> };

/**
 * Organizer locks the final decision. Winner = most votes; a tie goes to the
 * higher group score. If some people haven't voted, `confirm: true` is needed.
 */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { tripId } = await params;
  const body = await readJson(req);
  const bundle = await getBundle(tripId);
  assertOrganizer(bundle.trip, typeof body.key === "string" ? body.key : null);
  if (bundle.trip.decided_at) throw new HttpError(409, "The decision is already locked.");

  const view = computeView(bundle);
  if (view.locked) throw new HttpError(423, "Results aren't ready yet, so there's nothing to lock.");
  if (!view.options?.length || !view.votes?.winnerId) {
    throw new HttpError(409, "No option passes everyone's filters yet, so there's nothing to lock.");
  }
  if (view.votes.notVoted.length > 0 && body.confirm !== true) {
    throw new HttpError(409, `${view.votes.notVoted.length} still to vote. Confirm to lock anyway.`, "confirm_required");
  }

  const winner = view.options.find((o) => o.destinationId === view.votes!.winnerId)!;
  const { data, error } = await db()
    .from("trips")
    .update({
      decided_destination_id: winner.destinationId,
      decided_start: winner.window?.start ?? null,
      decided_end: winner.window?.end ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", tripId)
    .is("decided_at", null)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new HttpError(409, "The decision is already locked.");
  return ok({ destinationId: winner.destinationId });
});
