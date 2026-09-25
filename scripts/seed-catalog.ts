// Upserts the destination catalog into Supabase using the service role key.
// Equivalent to running supabase/seed.sql.   Run: npm run seed:catalog
import { createClient } from "@supabase/supabase-js";
import { CATALOG } from "../lib/catalog-data";
import { loadLocalEnv } from "../lib/server/env";

loadLocalEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const rows = CATALOG.map((d) => ({
  id: d.id,
  name: d.name,
  state: d.state,
  types: d.types,
  cost_min: d.costMin,
  cost_max: d.costMax,
  best_months: d.bestMonths,
  travel: d.travel,
  has_treks: d.hasTreks,
  blurb: d.blurb,
}));

async function main() {
  const { error } = await supabase.from("destinations").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("Seeding failed:", error.message);
    process.exit(1);
  }
  console.log(`Upserted ${rows.length} destinations.`);
}

main();
