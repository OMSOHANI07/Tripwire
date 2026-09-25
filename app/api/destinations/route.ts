import type { DestinationLite } from "@/lib/api-types";
import { handle, ok } from "@/lib/server/http";
import { getDestinations } from "@/lib/server/trips";

/** Catalog names for the "places I won't go" picker. */
export const GET = handle(async () => {
  const list: DestinationLite[] = (await getDestinations()).map((d) => ({
    id: d.id,
    name: d.name,
    country: d.country,
    state: d.state,
    types: d.types,
  }));
  return ok(list);
});
