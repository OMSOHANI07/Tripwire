// Creates a demo trip with the five friends.   Run: npm run seed:demo
import { createClient } from "@supabase/supabase-js";
import { createDemoTrip } from "../lib/demo";
import { loadLocalEnv } from "../lib/server/env";

loadLocalEnv();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const demo = await createDemoTrip(createClient(url, key, { auth: { persistSession: false } }));

  console.log("Demo trip created.\n");
  console.log(`Share link:      ${base}/t/${demo.tripId}`);
  console.log(`Results:         ${base}/t/${demo.tripId}/results`);
  console.log(`Organizer link:  ${base}/t/${demo.tripId}/admin?key=${demo.organizerKey}\n`);
  console.log("Personal edit/vote links:");
  for (const p of demo.people) {
    console.log(`  ${p.name.padEnd(10)} ${base}/t/${demo.tripId}/me?token=${p.token}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
