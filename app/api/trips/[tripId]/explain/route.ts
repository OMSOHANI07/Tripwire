import { ensureExplanations } from "@/lib/server/explain";
import { handle, ok } from "@/lib/server/http";
import { computeView, getBundle } from "@/lib/server/trips";

type Ctx = { params: Promise<{ tripId: string }> };
export const maxDuration = 30;

/**
 * AI explainer. Sends the computed results (never raw answers) to Gemini,
 * caches the text on the trip, and returns it. Scores are never changed.
 * Falls back to template text if Gemini is unavailable.
 */
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const { tripId } = await params;
  const bundle = await getBundle(tripId);
  const view = computeView(bundle);
  if (view.locked) return ok({ explanations: {}, explanationSource: "template" });
  const done = await ensureExplanations(view, bundle.trip);
  return ok({ explanations: done.explanations ?? {}, explanationSource: done.explanationSource ?? "template" });
});
