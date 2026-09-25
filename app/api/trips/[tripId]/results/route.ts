import { withExplanations } from "@/lib/server/explain";
import { handle, ok } from "@/lib/server/http";
import { computeView, getBundle } from "@/lib/server/trips";

type Ctx = { params: Promise<{ tripId: string }> };

/**
 * Computed results. Locked until everyone submits or the deadline passes.
 * Explanations come from the cache (or templates); the page then calls
 * /explain if `explanationsStale` is true.
 */
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { tripId } = await params;
  const bundle = await getBundle(tripId);
  const view = computeView(bundle);
  return ok(view.locked ? view : withExplanations(view, bundle.trip));
});
