/**
 * Source data for the destination catalog. `npm run gen:seed` turns this into
 * supabase/seed.sql, which is what the app actually reads (from Postgres).
 *
 * Travel tuples are [hours, flight] from each home city, in this order:
 *   Bengaluru, Mumbai, Delhi, Chennai, Hyderabad, Pune, Kolkata
 * `hours` is an approximate one-way door-to-door time using the practical
 * mode: overland (train/bus/car) when that's under ~14h, otherwise a flight
 * including airport time and the last-mile transfer. A few remote places
 * (Spiti) are long no matter what.
 *
 * Costs are rough per-person bands for a 3–4 day trip (stay, food, local
 * transport, activities), excluding travel to get there. Estimates only.
 */

import type { Destination, DestType, TravelInfo } from "./types";

type T = [number, boolean];
type Row = {
  id: string;
  name: string;
  state: string;
  types: DestType[];
  cost: [number, number];
  months: number[];
  treks: boolean;
  blurb: string;
  t: [T, T, T, T, T, T, T];
};

const CITY_ORDER = ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune", "Kolkata"];

const ROWS: Row[] = [
  { id: "goa", name: "Goa", state: "Goa", types: ["beach", "city"], cost: [8000, 15000], months: [11, 12, 1, 2, 3], treks: false,
    blurb: "Beaches, shacks, nightlife and old Portuguese quarters.",
    t: [[10, false], [9, false], [5, true], [4.5, true], [12, false], [9, false], [6, true]] },
  { id: "gokarna", name: "Gokarna", state: "Karnataka", types: ["beach", "adventure"], cost: [5000, 10000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Quieter beaches linked by cliff paths; laid-back cafes.",
    t: [[9, false], [11, false], [7, true], [7, true], [13, false], [10, false], [8, true]] },
  { id: "pondicherry", name: "Pondicherry", state: "Puducherry", types: ["beach", "city"], cost: [6000, 12000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "French Quarter streets, cafes, Auroville and the promenade.",
    t: [[6, false], [5, true], [5.5, true], [3, false], [12, false], [5.5, true], [5.5, true]] },
  { id: "varkala", name: "Varkala", state: "Kerala", types: ["beach"], cost: [7000, 13000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Cliff-top cafes over a long red-cliff beach.",
    t: [[13, false], [5, true], [6, true], [12, false], [5, true], [5.5, true], [6.5, true]] },
  { id: "alleppey", name: "Alleppey", state: "Kerala", types: ["beach"], cost: [8000, 15000], months: [9, 10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Houseboats on the backwaters plus Marari beach nearby.",
    t: [[11, false], [5.5, true], [6.5, true], [12, false], [5.5, true], [6, true], [7, true]] },
  { id: "kochi", name: "Kochi", state: "Kerala", types: ["city", "beach"], cost: [7000, 13000], months: [9, 10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Fort Kochi's art, food and Chinese fishing nets.",
    t: [[10, false], [4.5, true], [6, true], [11, false], [4.5, true], [5, true], [6, true]] },
  { id: "andaman", name: "Andaman (Havelock)", state: "Andaman & Nicobar", types: ["beach", "adventure"], cost: [18000, 30000], months: [10, 11, 12, 1, 2, 3, 4, 5], treks: false,
    blurb: "Clear water, scuba and snorkelling, white-sand beaches.",
    t: [[4, true], [5.5, true], [6, true], [3, true], [4.5, true], [6, true], [3, true]] },
  { id: "alibaug", name: "Alibaug", state: "Maharashtra", types: ["beach"], cost: [5000, 10000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Easy weekend beaches and forts near Mumbai.",
    t: [[5, true], [2.5, false], [5, true], [5, true], [11, false], [3.5, false], [5.5, true]] },
  { id: "tarkarli", name: "Tarkarli", state: "Maharashtra", types: ["beach", "adventure"], cost: [6000, 11000], months: [10, 11, 12, 1, 2, 3, 4, 5], treks: false,
    blurb: "Konkan beaches with snorkelling and scuba at Sindhudurg.",
    t: [[12, false], [9, false], [6.5, true], [7, true], [13, false], [8, false], [7, true]] },
  { id: "coorg", name: "Coorg", state: "Karnataka", types: ["hills"], cost: [7000, 14000], months: [10, 11, 12, 1, 2, 3, 4, 5], treks: false,
    blurb: "Coffee estates, misty hills and homestays.",
    t: [[5.5, false], [6, true], [6.5, true], [9, false], [6, true], [6, true], [6.5, true]] },
  { id: "chikmagalur", name: "Chikmagalur", state: "Karnataka", types: ["hills", "adventure"], cost: [6000, 12000], months: [9, 10, 11, 12, 1, 2, 3], treks: true,
    blurb: "Coffee country with the Mullayanagiri and Kudremukh treks.",
    t: [[5, false], [14, false], [6.5, true], [9, false], [12, false], [12, false], [7, true]] },
  { id: "ooty", name: "Ooty", state: "Tamil Nadu", types: ["hills"], cost: [6000, 12000], months: [10, 11, 12, 1, 2, 3, 4, 5, 6], treks: false,
    blurb: "Nilgiri toy train, tea gardens and cool weather.",
    t: [[6.5, false], [6, true], [7, true], [9, false], [6, true], [6, true], [7, true]] },
  { id: "kodaikanal", name: "Kodaikanal", state: "Tamil Nadu", types: ["hills"], cost: [6000, 11000], months: [9, 10, 11, 12, 1, 2, 3, 4, 5], treks: false,
    blurb: "Lake town with pine forests and viewpoints.",
    t: [[9, false], [6, true], [7, true], [9, false], [6, true], [6, true], [7, true]] },
  { id: "munnar", name: "Munnar", state: "Kerala", types: ["hills"], cost: [7000, 13000], months: [9, 10, 11, 12, 1, 2, 3, 4, 5], treks: false,
    blurb: "Rolling tea plantations and waterfalls.",
    t: [[11, false], [6, true], [7, true], [11, false], [6.5, true], [6.5, true], [7.5, true]] },
  { id: "wayanad", name: "Wayanad", state: "Kerala", types: ["hills", "adventure"], cost: [6000, 12000], months: [10, 11, 12, 1, 2, 3, 4, 5], treks: true,
    blurb: "Forests, caves and the Chembra Peak trek.",
    t: [[6.5, false], [6, true], [7, true], [10, false], [6.5, true], [6, true], [7, true]] },
  { id: "lonavala", name: "Lonavala", state: "Maharashtra", types: ["hills"], cost: [5000, 10000], months: [6, 7, 8, 9, 10, 11, 12, 1, 2], treks: false,
    blurb: "Monsoon-green ghats and viewpoints between Mumbai and Pune.",
    t: [[5, true], [2.5, false], [5, true], [5, true], [9, false], [1.5, false], [5.5, true]] },
  { id: "mahabaleshwar", name: "Mahabaleshwar", state: "Maharashtra", types: ["hills"], cost: [6000, 11000], months: [10, 11, 12, 1, 2, 3, 4, 5], treks: false,
    blurb: "Strawberry farms, valley viewpoints and Venna Lake.",
    t: [[12, false], [5.5, false], [5.5, true], [5.5, true], [10, false], [3, false], [6, true]] },
  { id: "mysore", name: "Mysore", state: "Karnataka", types: ["city"], cost: [5000, 9000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Palaces, markets and a short hop to the Nagarhole forests.",
    t: [[3, false], [5, true], [5.5, true], [7, false], [12, false], [5, true], [5.5, true]] },
  { id: "hampi", name: "Hampi", state: "Karnataka", types: ["city", "adventure"], cost: [5000, 9000], months: [10, 11, 12, 1, 2], treks: false,
    blurb: "Boulder landscapes, ruins of the Vijayanagara empire, bouldering.",
    t: [[7.5, false], [14, false], [7, true], [11, false], [8, false], [11, false], [8, true]] },
  { id: "udaipur", name: "Udaipur", state: "Rajasthan", types: ["city"], cost: [9000, 16000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Lakes, palaces and rooftop dinners.",
    t: [[5, true], [13, false], [11, false], [5.5, true], [5, true], [5, true], [6, true]] },
  { id: "jaipur", name: "Jaipur", state: "Rajasthan", types: ["city"], cost: [8000, 14000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Forts, bazaars and Rajasthani food.",
    t: [[5, true], [5, true], [5, false], [5.5, true], [5, true], [5, true], [5.5, true]] },
  { id: "varanasi", name: "Varanasi", state: "Uttar Pradesh", types: ["city"], cost: [6000, 11000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Ghats, Ganga aarti and old-city lanes.",
    t: [[5, true], [5, true], [9, false], [5, true], [5, true], [5, true], [10, false]] },
  { id: "amritsar", name: "Amritsar", state: "Punjab", types: ["city"], cost: [6000, 10000], months: [10, 11, 12, 1, 2, 3], treks: false,
    blurb: "Golden Temple, Wagah border and legendary food.",
    t: [[5.5, true], [5.5, true], [6, false], [6, true], [5.5, true], [5.5, true], [6, true]] },
  { id: "rishikesh", name: "Rishikesh", state: "Uttarakhand", types: ["adventure", "hills"], cost: [6000, 12000], months: [9, 10, 11, 12, 1, 2, 3, 4, 5], treks: false,
    blurb: "River rafting, bungee, cafes and the Ganga.",
    t: [[6, true], [5.5, true], [6, false], [6.5, true], [6, true], [6, true], [6.5, true]] },
  { id: "mussoorie", name: "Mussoorie", state: "Uttarakhand", types: ["hills"], cost: [7000, 13000], months: [3, 4, 5, 6, 9, 10, 11, 12], treks: false,
    blurb: "Mall Road, colonial hill-station charm and Himalayan views.",
    t: [[6.5, true], [6, true], [7, false], [7, true], [6.5, true], [6.5, true], [7, true]] },
  { id: "manali", name: "Manali", state: "Himachal Pradesh", types: ["hills", "adventure"], cost: [9000, 16000], months: [3, 4, 5, 6, 10, 11, 12], treks: false,
    blurb: "Snow views, Solang valley adventure sports, Old Manali cafes.",
    t: [[7.5, true], [7, true], [12, false], [8, true], [7.5, true], [7.5, true], [8, true]] },
  { id: "kasol", name: "Kasol", state: "Himachal Pradesh", types: ["hills", "adventure"], cost: [6000, 11000], months: [3, 4, 5, 6, 9, 10, 11], treks: true,
    blurb: "Parvati valley riverside camps and the Kheerganga trek.",
    t: [[8.5, true], [8, true], [11, false], [9, true], [8.5, true], [8.5, true], [9, true]] },
  { id: "mcleodganj", name: "McLeod Ganj", state: "Himachal Pradesh", types: ["hills", "adventure"], cost: [6000, 11000], months: [3, 4, 5, 6, 9, 10, 11], treks: true,
    blurb: "Tibetan culture, monasteries and the Triund trek.",
    t: [[7.5, true], [7, true], [10, false], [8, true], [7.5, true], [7.5, true], [8, true]] },
  { id: "spiti", name: "Spiti Valley", state: "Himachal Pradesh", types: ["adventure", "hills"], cost: [15000, 25000], months: [5, 6, 7, 8, 9], treks: false,
    blurb: "High-altitude desert road trip; remote and rugged.",
    t: [[20, true], [20, true], [18, false], [21, true], [20, true], [20, true], [21, true]] },
  { id: "darjeeling", name: "Darjeeling", state: "West Bengal", types: ["hills"], cost: [8000, 14000], months: [3, 4, 5, 10, 11, 12], treks: false,
    blurb: "Tea estates, the toy train and Kanchenjunga sunrise.",
    t: [[6.5, true], [6.5, true], [6, true], [6.5, true], [6.5, true], [7, true], [12, false]] },
  { id: "gangtok", name: "Gangtok", state: "Sikkim", types: ["hills", "adventure"], cost: [10000, 18000], months: [3, 4, 5, 10, 11, 12], treks: false,
    blurb: "Monasteries, Tsomgo Lake and mountain drives.",
    t: [[7.5, true], [7.5, true], [7, true], [7.5, true], [7.5, true], [8, true], [5, true]] },
  { id: "meghalaya", name: "Meghalaya (Shillong & Cherrapunji)", state: "Meghalaya", types: ["hills", "adventure"], cost: [12000, 20000], months: [10, 11, 12, 1, 2, 3, 4, 5], treks: true,
    blurb: "Living root bridges, waterfalls and caves.",
    t: [[7, true], [7, true], [6.5, true], [7, true], [7, true], [7.5, true], [5, true]] },
];

export const CATALOG: Destination[] = ROWS.map((r) => ({
  id: r.id,
  name: r.name,
  state: r.state,
  types: r.types,
  costMin: r.cost[0],
  costMax: r.cost[1],
  bestMonths: r.months,
  hasTreks: r.treks,
  blurb: r.blurb,
  travel: Object.fromEntries(
    r.t.map(([hours, flight], i) => [CITY_ORDER[i], { hours, flight } satisfies TravelInfo]),
  ),
}));
