import { createDemoTrip } from "@/lib/demo";
import { db } from "@/lib/server/supabase";
import { handle, ok } from "@/lib/server/http";

/** "Load demo trip": the five friends, already submitted. */
export const POST = handle(async () => ok(await createDemoTrip(db()), 201));
