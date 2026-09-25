import { handle, ok } from "@/lib/server/http";
import { getBundle, toPublic } from "@/lib/server/trips";

type Ctx = { params: Promise<{ tripId: string }> };

/** Public trip info for the share link: names, window, deadline, who's in. */
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { tripId } = await params;
  return ok(toPublic(await getBundle(tripId)));
});
