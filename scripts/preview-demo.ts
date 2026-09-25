// Prints what the scoring engine makes of the demo preferences (no DB).
import { CATALOG } from "../lib/catalog-data";
import { DEMO_PEOPLE, demoWindow } from "../lib/demo";
import { addDays, computeResults, enumerateDates } from "../lib/scoring";

const { start, end } = demoWindow();
const prefs = DEMO_PEOPLE.map((p) => ({
  participantId: p.name, name: p.name, homeCity: p.homeCity, maxBudget: p.maxBudget,
  typeRanking: p.typeRanking, dealbreakers: p.dealbreakers, wontGo: p.wontGo,
  availableDates: p.free.flatMap(([a, b]) => enumerateDates(addDays(start, a), addDays(start, b))),
}));
const r = computeResults(CATALOG, prefs, { windowStart: start, windowEnd: end, tripLength: 3 });
console.log(r.status, "passed", r.passedCount, "windows", r.commonWindows.length);
for (const o of r.options) console.log(o.destination.name, o.groupScore, o.window, o.fits.map((f) => `${f.name}:${f.fit}`).join(" "), o.tradeOffs);
console.log("filtered:", r.filteredOut.map((o) => `${o.destination.name}: ${o.blocks.map((b) => b.detail).join("; ")}`));
console.log(r.dateNotes);
