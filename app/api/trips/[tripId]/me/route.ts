import type { MeView } from "@/lib/api-types";
import { handle, ok } from "@/lib/server/http";
import { getBundle, participantByToken, toPublic } from "@/lib/server/trips";

type Ctx = { params: Promise<{ tripId: string }> };

/** A participant's own answers and vote, via their personal token. */
export const GET = handle(async (req: Request, { params }: Ctx) => {
  const { tripId } = await params;
  const token = new URL(req.url).searchParams.get("token");
  const bundle = await getBundle(tripId);
  const p = participantByToken(bundle, token);
  const r = bundle.responses.find((x) => x.participant_id === p.id);
  const view: MeView = {
    trip: toPublic(bundle),
    participant: { id: p.id, name: p.name },
    response: r
      ? {
          homeCity: r.home_city,
          availableDates: r.available_dates,
          maxBudget: r.max_budget,
          typeRanking: r.type_ranking,
          dealbreakers: r.dealbreakers,
          wontGo: r.wont_go,
          note: r.note ?? undefined,
        }
      : null,
    voteDestinationId: bundle.votes.find((v) => v.participant_id === p.id)?.destination_id ?? null,
  };
  return ok(view);
});
