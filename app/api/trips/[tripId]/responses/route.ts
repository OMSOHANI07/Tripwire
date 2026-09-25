import { formatDeadline } from "@/lib/format";
import { db } from "@/lib/server/supabase";
import { HttpError, handle, ok, readJson } from "@/lib/server/http";
import { hashSecret, newSecret } from "@/lib/server/tokens";
import { deadlinePassed, getBundle } from "@/lib/server/trips";
import { validateResponse } from "@/lib/server/validate";

type Ctx = { params: Promise<{ tripId: string }> };

/**
 * Submit or edit a preference form.
 * - First submission for a name: anyone with the share link can claim it; we
 *   issue a personal edit token (returned once, only its hash is stored).
 * - Later edits need that token.
 * - Lock rule: after the deadline (or once decided) the server rejects edits.
 */
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const { tripId } = await params;
  const body = await readJson(req);
  const bundle = await getBundle(tripId);
  const { trip } = bundle;

  if (trip.decided_at) throw new HttpError(423, "The trip is already decided, so answers are locked.", "locked");
  if (deadlinePassed(trip)) {
    throw new HttpError(423, `Submissions closed on ${formatDeadline(trip.deadline)}. Answers are now frozen.`, "locked");
  }

  const participant = bundle.participants.find((p) => p.id === body.participantId);
  if (!participant) throw new HttpError(400, "Pick your name from the list");

  const token = typeof body.token === "string" ? body.token : null;
  const isEdit = participant.token_hash !== null;
  if (isEdit && (!token || hashSecret(token) !== participant.token_hash)) {
    throw new HttpError(
      409,
      `${participant.name} has already submitted. Use your personal edit link to change your answers.`,
      "already_submitted",
    );
  }

  const input = validateResponse(body, {
    windowStart: trip.window_start,
    windowEnd: trip.window_end,
    destinationIds: new Set(bundle.destinations.map((d) => d.id)),
  });

  // Claim the name atomically so two people can't both take it.
  let issuedToken: string | null = null;
  if (!isEdit) {
    issuedToken = newSecret();
    const claim = await db()
      .from("participants")
      .update({ token_hash: hashSecret(issuedToken) })
      .eq("id", participant.id)
      .is("token_hash", null)
      .select("id");
    if (claim.error) throw new Error(claim.error.message);
    if (!claim.data?.length) {
      throw new HttpError(409, `${participant.name} has just submitted from another device.`, "already_submitted");
    }
  }

  const res = await db()
    .from("responses")
    .upsert(
      {
        participant_id: participant.id,
        trip_id: trip.id,
        home_city: input.homeCity,
        available_dates: input.availableDates,
        max_budget: input.maxBudget,
        type_ranking: input.typeRanking,
        dealbreakers: input.dealbreakers,
        wont_go: input.wontGo,
        dream_destination: input.dreamDestination ?? null,
        note: input.note ?? null,
      },
      { onConflict: "participant_id" },
    );
  if (res.error) {
    if (issuedToken) await db().from("participants").update({ token_hash: null }).eq("id", participant.id);
    throw new Error(res.error.message);
  }

  return ok({ participantId: participant.id, name: participant.name, token: issuedToken ?? token, created: !isEdit });
});
