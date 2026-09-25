import { handle, ok } from "@/lib/server/http";
import { assertOrganizer, getTrip } from "@/lib/server/trips";

type Ctx = { params: Promise<{ tripId: string }> };

/** Checks an organizer key. The admin page uses this before showing controls. */
export const GET = handle(async (req: Request, { params }: Ctx) => {
  const { tripId } = await params;
  assertOrganizer(await getTrip(tripId), new URL(req.url).searchParams.get("key"));
  return ok({ ok: true });
});
